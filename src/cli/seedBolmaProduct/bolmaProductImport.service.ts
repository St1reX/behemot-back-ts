import { Prisma } from '@prisma/client';
import { BolmaProductImportRepository } from './bolmaProductImportRepository';
import { parseBolmaProductRow } from './bolmaProductImport.parser';
import { BOLMA_IMPORT_STATUSES } from './bolmaProductImport.constants';
import { BolmaProductImportReport, BolmaImportResult } from './bolmaProductImport.report';

export class BolmaProductImportService {
    static async run(apply: boolean, report: BolmaProductImportReport, isInterrupted: () => boolean) {
        const rows = await BolmaProductImportRepository.readSourceRows();
        const dictionaries = await BolmaProductImportRepository.readDictionaries();
        const latestRecordIndexBySku = new Map<string, number>();
        // Source rows are ordered by numeric products.id ASC, so the last row wins.
        for (const [index, row] of rows.entries()) {
            const sku = typeof row.nr_kat === 'string' ? row.nr_kat.trim() : '';
            if (sku) latestRecordIndexBySku.set(sku, index);
        }

        for (const [index, raw] of rows.entries()) {
            if (isInterrupted()) return false;
            const sku = typeof raw.nr_kat === 'string' ? raw.nr_kat.trim() || null : null;
            let result: BolmaImportResult;
            try {
                const latestIndex = sku ? latestRecordIndexBySku.get(sku) : undefined;
                if (latestIndex !== undefined && latestIndex !== index) {
                    result = { status: BOLMA_IMPORT_STATUSES.SKIPPED,
                        message: `Starszy rekord tego SKU. Wybrano rekord Bolmy o najwyższym ID: ${rows[latestIndex].id}.` };
                } else {
                    const row = parseBolmaProductRow(raw);
                    result = await BolmaProductImportRepository.importRecord(row, dictionaries, apply);
                }
            } catch (error) {
                const concurrentConflict = error instanceof Prisma.PrismaClientKnownRequestError
                    && (error.code === 'P2002' || error.code === 'P2034');
                result = {
                    status: concurrentConflict ? BOLMA_IMPORT_STATUSES.CONFLICT : BOLMA_IMPORT_STATUSES.ERROR,
                    message: concurrentConflict ? 'Konflikt równoległego zapisu. Transakcja wycofana; ponów import.'
                        : error instanceof Error ? error.message : String(error),
                };
            }
            // Report failure must stop the run, not be mistaken for a rolled-back record.
            await report.record(index + 1, raw.id == null ? null : String(raw.id), sku, result);
        }
        return !isInterrupted();
    }
}
