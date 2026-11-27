import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { env } from '../../config/env';
import { redisClient } from '../../config/redis';
import { appWinston } from '../../config/logger/appWinston';
import { AppError, ErrorNames } from '../../errors/errorHandler';
import { BolmaImportRepository } from './repositories/bolmaImportRepository';
import { parseBolmaProductRow } from './bolmaProduct.mapper';
import { BolmaImportReport } from './bolmaImport.report';
import { findLatestBolmaReportPath, getBolmaReportPath } from './uploads/imports.upload';
import type { BolmaConfiguration, BolmaImportResult } from './types/imports.types';

const IMPORT_LOCK_KEY = 'behemot:imports:bolma:products';
const IMPORT_LOCK_TTL_MS = 120_000;

export class ImportsService {
    static async getBolmaStatus() {
        try {
            await BolmaImportRepository.checkConnection();
            return { status: 'ok', components: { database: 'ok' } } as const;
        } catch {
            return { status: 'error', components: { database: 'error' } } as const;
        }
    }

    static getBolmaConfiguration(): BolmaConfiguration {
        return {
            id: 'bolma', name: 'Katalog Bolmy', engine: 'MySQL',
            isConfigured: Boolean(env.BOLMA_PRODUCTS_CATALOG_MYSQL_HOST && env.BOLMA_PRODUCTS_CATALOG_MYSQL_DATABASE
                && env.BOLMA_PRODUCTS_CATALOG_MYSQL_USERNAME && env.BOLMA_PRODUCTS_CATALOG_MYSQL_PASSWORD),
            sslEnabled: env.BOLMA_PRODUCTS_CATALOG_MYSQL_SSL,
        };
    }

    static async getLatestBolmaReport() {
        const path = await findLatestBolmaReportPath();
        if (!path) throw new AppError(ErrorNames.RESOURCE_NOT_FOUND, 404, 'Nie ma jeszcze raportu importu Bolmy.');
        return path;
    }

    static async importBolmaProducts(userId: string, isDisconnected: () => boolean) {
        const token = randomUUID();
        const acquired = await redisClient.set(IMPORT_LOCK_KEY, token, 'PX', IMPORT_LOCK_TTL_MS, 'NX');
        if (!acquired) throw new AppError(ErrorNames.CONFLICT, 409, 'Import produktów Bolmy już trwa. Poczekaj na jego zakończenie.');

        let lockLost = false;
        const renewLock = async () => {
            try {
                const renewed = await redisClient.eval(
                    'if redis.call("get", KEYS[1]) == ARGV[1] then return redis.call("pexpire", KEYS[1], ARGV[2]) else return 0 end',
                    1, IMPORT_LOCK_KEY, token, IMPORT_LOCK_TTL_MS,
                );
                if (renewed !== 1) lockLost = true;
            } catch {
                lockLost = true;
            }
        };
        const heartbeat = setInterval(() => { void renewLock(); }, 30_000);
        heartbeat.unref();
        try {
            const path = getBolmaReportPath(token);
            const report = await BolmaImportReport.create(path);
            let completed = false;
            let fatalError: string | undefined;
            try {
                const rows = await BolmaImportRepository.readSourceRows();
                const dictionaries = await BolmaImportRepository.readDictionaries();
                const latestRecordIndexBySku = new Map<string, number>();
                for (const [index, row] of rows.entries()) {
                    const sku = typeof row.nr_kat === 'string' ? row.nr_kat.trim() : '';
                    if (sku) latestRecordIndexBySku.set(sku, index);
                }
                for (const [index, raw] of rows.entries()) {
                    if (isDisconnected()) throw new Error('Utracono połączenie z przeglądarką. Zakończono bieżący rekord i przerwano import. Wcześniejsze zapisy pozostają w bazie.');
                    if (lockLost || await redisClient.get(IMPORT_LOCK_KEY) !== token) {
                        throw new Error('Utracono blokadę importu. Przerwano przed kolejnym rekordem; wcześniejsze zapisy pozostają w bazie.');
                    }
                    const sku = typeof raw.nr_kat === 'string' ? raw.nr_kat.trim() || null : null;
                    let result: BolmaImportResult;
                    try {
                        const latestIndex = sku ? latestRecordIndexBySku.get(sku) : undefined;
                        if (latestIndex !== undefined && latestIndex !== index) {
                            result = { status: 'skipped', message: `Powielone SKU. Pominięto starszy rekord; wybrano ID Bolmy ${rows[latestIndex].id}.` };
                        } else {
                            result = await BolmaImportRepository.importRecord(parseBolmaProductRow(raw), dictionaries, userId);
                        }
                    } catch (error) {
                        const conflict = error instanceof Prisma.PrismaClientKnownRequestError
                            && (error.code === 'P2002' || error.code === 'P2034');
                        result = { status: conflict ? 'conflict' : 'error', message: conflict
                            ? 'Konflikt równoległego zapisu. Transakcja rekordu wycofana; ponów import po sprawdzeniu danych.'
                            : error instanceof Error ? error.message : String(error) };
                    }
                    // A failed report write stops the run; it must never be reported as a rolled-back product.
                    await report.record({ recordNumber: index + 1, sourceId: raw.id == null ? null : String(raw.id), sku, result });
                }
                completed = true;
            } catch (error) {
                fatalError = error instanceof Error ? error.message : String(error);
                appWinston.error(`Bolma import ${token} interrupted: ${fatalError}`);
            }
            await report.finish(completed, fatalError);
            return path;
        } finally {
            clearInterval(heartbeat);
            try {
                await redisClient.eval('if redis.call("get", KEYS[1]) == ARGV[1] then return redis.call("del", KEYS[1]) else return 0 end',
                    1, IMPORT_LOCK_KEY, token);
            } catch (error) {
                appWinston.error(`Could not release Bolma import lock: ${error instanceof Error ? error.message : String(error)}`);
            }
        }
    }
}
