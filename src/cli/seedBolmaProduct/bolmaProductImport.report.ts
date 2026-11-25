import { open, mkdir, FileHandle } from 'node:fs/promises';
import { dirname } from 'node:path';
import { ImportProductDTO } from '../../modules/product/schemas/product.schema';
import { BOLMA_IMPORT_STATUSES, BOLMA_PRODUCT_IMPORT } from './bolmaProductImport.constants';

export type BolmaImportStatus = typeof BOLMA_IMPORT_STATUSES[keyof typeof BOLMA_IMPORT_STATUSES];

export interface BolmaImportResult {
    status: BolmaImportStatus;
    message: string;
    productId?: string;
    warnings?: string[];
    mappedProduct?: ImportProductDTO;
}

// JSONL remains readable after interruption; every finished record is flushed.
export class BolmaProductImportReport {
    private readonly counts: Record<BolmaImportStatus, number> = {
        created: 0, would_create: 0, existing: 0, skipped: 0, conflict: 0, error: 0,
    };

    private constructor(private readonly file: FileHandle) {}

    static async create(path: string, apply: boolean) {
        await mkdir(dirname(path), { recursive: true });
        const report = new BolmaProductImportReport(await open(path, 'wx'));
        try {
            await report.append({ type: 'header', source: 'Bolma products', mode: apply ? 'apply' : 'dry-run',
                startedAt: new Date().toISOString(), listings: BOLMA_PRODUCT_IMPORT.LISTINGS_NOTE });
            return report;
        } catch (error) {
            await report.file.close();
            throw error;
        }
    }

    private async append(value: unknown): Promise<void> {
        await this.file.writeFile(`${JSON.stringify(value)}\n`, 'utf8');
        await this.file.sync();
    }

    async record(recordNumber: number, sourceId: string | null, sku: string | null, result: BolmaImportResult) {
        await this.append({ type: 'record', recordNumber, sourceId, sku, ...result });
        this.counts[result.status]++;
    }

    async finish(completed: boolean, fatalError?: string) {
        try {
            await this.append({ type: 'summary', completed, finishedAt: new Date().toISOString(),
                counts: this.counts, ...(fatalError ? { fatalError } : {}) });
            return { ...this.counts };
        } finally {
            await this.file.close();
        }
    }
}
