import { randomUUID } from 'node:crypto';
import type { Dirent } from 'node:fs';
import { readdir, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Prisma } from '@prisma/client';
import { env } from '../../config/env';
import { redisClient } from '../../config/redis';
import { appWinston } from '../../config/logger/appWinston';
import { AppError, ErrorNames } from '../../errors/errorHandler';
import { BolmaImportRepository } from './repositories/bolmaImportRepository';
import { parseBolmaProductRow } from './bolmaProduct.mapper';
import { BolmaImportReport } from './bolmaImport.report';
import type { BolmaConfiguration, BolmaImportResult } from './types/imports.types';

const IMPORT_LOCK_KEY = 'behemot:imports:bolma:products';
const IMPORT_LOCK_TTL_MS = 120_000;
const BOLMA_REPORT_DIRECTORY = resolve(env.UPLOADS_ROOT_PATH, 'imports', 'bolma');

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
        let files: Dirent[];
        try {
            files = await readdir(BOLMA_REPORT_DIRECTORY, { withFileTypes: true });
        } catch (error) {
            if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw error;
            throw new AppError(ErrorNames.RESOURCE_NOT_FOUND, 404, 'Nie ma jeszcze raportu importu Bolmy.');
        }
        let latest: { path: string; modifiedAt: number } | undefined;
        for (const file of files) {
            if (!file.isFile() || !file.name.toLowerCase().endsWith('.xlsx')) continue;
            const path = resolve(BOLMA_REPORT_DIRECTORY, file.name);
            const { mtimeMs } = await stat(path);
            if (!latest || mtimeMs > latest.modifiedAt || (mtimeMs === latest.modifiedAt && path > latest.path)) {
                latest = { path, modifiedAt: mtimeMs };
            }
        }
        if (!latest) throw new AppError(ErrorNames.RESOURCE_NOT_FOUND, 404, 'Nie ma jeszcze raportu importu Bolmy.');
        return latest.path;
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
            const timestamp = new Intl.DateTimeFormat('sv-SE', {
                timeZone: 'Europe/Warsaw', year: 'numeric', month: '2-digit', day: '2-digit',
                hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
            }).format(new Date()).replace(' ', '_').replace(/:/g, '-');
            const path = resolve(BOLMA_REPORT_DIRECTORY, `raport_import_bolma_${timestamp}_${token}.xlsx`);
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
