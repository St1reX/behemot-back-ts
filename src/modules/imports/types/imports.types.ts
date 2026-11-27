import type { ImportProductDTO } from '../../product/schemas/product.schema';

export interface BolmaConfiguration {
    id: 'bolma';
    name: string;
    engine: string;
    isConfigured: boolean;
    sslEnabled: boolean;
}

export type BolmaImportStatus = 'created' | 'updated' | 'existing' | 'skipped' | 'conflict' | 'error';

export interface BolmaImportResult {
    status: BolmaImportStatus;
    message: string;
    productId?: string;
    warnings?: string[];
    mappedProduct?: ImportProductDTO;
    departmentLabel?: string | null;
    fitmentLabels?: string[];
    dataBefore?: { customName?: string | null; length?: number | null; weight?: number | null };
    dataAfter?: { customName?: string; length?: number; weight?: number };
    productSnapshot?: { customName: string | null; length: number | null; weight: number | null };
}

export interface BolmaImportRecord {
    recordNumber: number;
    sourceId: string | null;
    sku: string | null;
    result: BolmaImportResult;
}

export interface BolmaImportSummary {
    completed: boolean;
    startedAt: string;
    finishedAt: string;
    counts: Record<BolmaImportStatus, number>;
    fatalError?: string;
}
