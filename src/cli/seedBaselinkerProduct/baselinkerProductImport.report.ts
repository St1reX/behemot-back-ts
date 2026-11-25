import { FileHandle, mkdir, open } from 'node:fs/promises';
import { dirname } from 'node:path';
import {
    BASELINKER_IMPORT_FIELDS, BASELINKER_IMPORT_STATUSES, BASELINKER_MISSING_FIELD_COUNTS,
    BASELINKER_PRODUCT_IMPORT, BASELINKER_ZERO_FIELD_COUNTS,
} from './baselinkerProductImport.constants';
import type { BaselinkerDataQuality, BaselinkerProductField } from './baselinkerProductImport.mapper';
import type { BaselinkerCsvRecord } from './baselinkerProductImport.parser';

type ImportStatus = typeof BASELINKER_IMPORT_STATUSES[keyof typeof BASELINKER_IMPORT_STATUSES];
export interface BaselinkerImportResult {
    status: ImportStatus;
    message: string;
    productId?: string;
    plannedProduct?: boolean;
    changes?: Partial<Record<BaselinkerProductField, { before: string | null; after: string; sourceId: string }>>;
    quality?: BaselinkerDataQuality;
    remainingMissingFields?: BaselinkerProductField[];
}

export class BaselinkerProductImportReport {
    private productsMissingFromExport = 0;
    private readonly counts: Record<ImportStatus, number> = {
        updated: 0, would_update: 0, unchanged: 0, skipped: 0, conflict: 0, error: 0,
    };
    private readonly completeness = {
        matchedProducts: 0,
        latestIncompleteProducts: 0,
        productsWithFallback: 0,
        sourceIncompleteProducts: 0,
        productsWithZeroValues: 0,
        remainingIncompleteProducts: 0,
        sourceMissingByField: { ...BASELINKER_MISSING_FIELD_COUNTS },
        latestMissingByField: { ...BASELINKER_MISSING_FIELD_COUNTS },
        fallbackByField: { ...BASELINKER_MISSING_FIELD_COUNTS },
        zeroValuesByField: { ...BASELINKER_ZERO_FIELD_COUNTS },
        remainingMissingByField: { ...BASELINKER_MISSING_FIELD_COUNTS },
    };

    private constructor(private readonly file: FileHandle) {}

    static async create(path: string, input: string, apply: boolean) {
        await mkdir(dirname(path), { recursive: true });
        const report = new BaselinkerProductImportReport(await open(path, 'wx'));
        try {
            await report.append({ type: 'header', source: BASELINKER_PRODUCT_IMPORT.SOURCE_NAME, input,
                mode: apply ? 'apply' : 'dry-run', startedAt: new Date().toISOString(), fields: BASELINKER_IMPORT_FIELDS,
                completenessScope: 'Pasujące aktywne produkty legacy. Każde pole pochodzi z najnowszego niepustego, niezerowego rekordu SKU. Braki po zmianach w dry-run są prognozą.',
                units: { price: 'brutto', weight: 'kg', dimensions: 'cm' },
                listings: 'Bez tworzenia ofert i bez synchronizacji.',
            });
            return report;
        } catch (error) {
            await report.file.close();
            throw error;
        }
    }

    private async append(value: unknown) {
        await this.file.writeFile(`${JSON.stringify(value)}\n`, 'utf8');
        await this.file.sync();
    }

    async missingSourceProduct(product: { id?: string; sku: string; customName?: string | null; plannedProduct?: boolean }) {
        await this.append({ type: 'missing_source_product', productId: product.id, sku: product.sku,
            customName: product.customName, ...(product.plannedProduct ? { plannedProduct: true } : {}),
            message: 'SKU produktu legacy nie występuje w eksporcie BaseLinkera. Zachowano dane po etapie Bolmy.' });
        this.productsMissingFromExport++;
    }

    async record(record: BaselinkerCsvRecord, result: BaselinkerImportResult) {
        await this.append({ type: 'record', recordNumber: record.recordNumber, lineNumber: record.lineNumber,
            sourceId: record.row.sourceId, sku: record.row.sku || null, ...result });
        this.counts[result.status]++;
        if (result.quality) {
            this.completeness.matchedProducts++;
            if (result.quality.latestMissingFields.length) this.completeness.latestIncompleteProducts++;
            if (result.quality.fallbackFields.length) this.completeness.productsWithFallback++;
            if (result.quality.sourceMissingFields.length) this.completeness.sourceIncompleteProducts++;
            if (result.quality.zeroFields.length) this.completeness.productsWithZeroValues++;
            for (const field of result.quality.sourceMissingFields) this.completeness.sourceMissingByField[field]++;
            for (const field of result.quality.latestMissingFields) this.completeness.latestMissingByField[field]++;
            for (const field of result.quality.fallbackFields) this.completeness.fallbackByField[field]++;
            for (const field of result.quality.zeroFields) this.completeness.zeroValuesByField[field]++;
        }
        if (result.remainingMissingFields?.length) this.completeness.remainingIncompleteProducts++;
        for (const field of result.remainingMissingFields ?? []) this.completeness.remainingMissingByField[field]++;
    }

    async finish(completed: boolean, fatalError?: string) {
        try {
            const summary = { completed, counts: this.counts, completeness: this.completeness,
                productsMissingFromExport: this.productsMissingFromExport,
                ...(fatalError ? { fatalError } : {}) };
            await this.append({ type: 'summary', finishedAt: new Date().toISOString(), ...summary });
            return summary;
        } finally {
            await this.file.close();
        }
    }
}
