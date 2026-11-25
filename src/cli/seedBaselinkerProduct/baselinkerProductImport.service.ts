import { Prisma } from '@prisma/client';
import { PRODUCT_CONTENT_VERSIONS } from '../../modules/product/constants/productVersions';
import { BASELINKER_IMPORT_STATUSES } from './baselinkerProductImport.constants';
import { selectBaselinkerSource } from './baselinkerProductImport.mapper';
import { BaselinkerCsvRecord } from './baselinkerProductImport.parser';
import { BaselinkerImportResult, BaselinkerProductImportReport } from './baselinkerProductImport.report';
import { BaselinkerProductImportRepository } from './baselinkerProductImportRepository';
import type { BolmaProductPreview } from '../seedBolmaProduct/bolmaProductImport.service';

export class BaselinkerProductImportService {
    static async run(records: BaselinkerCsvRecord[], apply: boolean, report: BaselinkerProductImportReport,
        isInterrupted: () => boolean, previewProducts?: Map<string, BolmaProductPreview>): Promise<boolean> {
        if (apply && previewProducts) throw new Error('Plan Bolmy może być używany tylko w dry run.');
        const recordsBySku = new Map<string, BaselinkerCsvRecord[]>();
        const ambiguousSkus = new Set<string>();
        for (const record of records) {
            const { sku } = record.row;
            if (!sku) continue;
            const group = recordsBySku.get(sku);
            if (group) group.push(record);
            else recordsBySku.set(sku, [record]);
        }
        for (const [sku, group] of recordsBySku) {
            group.sort((left, right) => {
                const leftId = BigInt(left.row.sourceId);
                const rightId = BigInt(right.row.sourceId);
                return leftId > rightId ? -1 : leftId < rightId ? 1 : 0;
            });
            if (new Set(group.map((record) => record.row.sourceId)).size !== group.length) ambiguousSkus.add(sku);
        }
        const existingProducts = await BaselinkerProductImportRepository.readExistingProducts();
        const existingSkus = new Set(existingProducts.map((product) => product.sku));
        for (const product of existingProducts) {
            if (isInterrupted()) return false;
            if (product.isLegacy && product.contentVersion === PRODUCT_CONTENT_VERSIONS.IMPORTED
                && !product.deletedAt && !recordsBySku.has(product.sku)) {
                await report.missingSourceProduct({ ...product, customName: previewProducts?.get(product.sku)?.customName ?? product.customName });
            }
        }
        for (const [sku, preview] of previewProducts ?? []) {
            if (isInterrupted()) return false;
            if (!preview.productId && !existingSkus.has(sku) && !recordsBySku.has(sku)) {
                await report.missingSourceProduct({ sku, customName: preview.customName, plannedProduct: true });
            }
            existingSkus.add(sku);
        }
        for (const record of records) {
            if (isInterrupted()) return false;
            const { sku } = record.row;
            const group = recordsBySku.get(sku);
            const selected = group?.[0];
            let result: BaselinkerImportResult;
            try {
                if (!sku) result = { status: BASELINKER_IMPORT_STATUSES.SKIPPED, message: 'Brak SKU.' };
                else if (selected !== record) result = { status: BASELINKER_IMPORT_STATUSES.SKIPPED,
                    message: `Rekord pomocniczy SKU; jego pola są rozpatrywane przy uzupełnianiu braków. Zbiorczy wynik przy ID ${selected!.row.sourceId}.` };
                else if (ambiguousSkus.has(sku)) result = { status: BASELINKER_IMPORT_STATUSES.CONFLICT,
                    message: 'Powtórzone ID w grupie SKU. Nie można jednoznacznie ustalić kolejności wersji.' };
                else if (!existingSkus.has(sku)) result = { status: BASELINKER_IMPORT_STATUSES.SKIPPED,
                    message: 'SKU nie istnieje w Behemocie. Nie utworzono produktu.' };
                else result = await BaselinkerProductImportRepository.updateRecord(selectBaselinkerSource(group!), apply, previewProducts?.get(sku));
            } catch (error) {
                const concurrent = error instanceof Prisma.PrismaClientKnownRequestError
                    && ['P2002', 'P2034', 'P2025'].includes(error.code);
                result = { status: concurrent ? BASELINKER_IMPORT_STATUSES.CONFLICT : BASELINKER_IMPORT_STATUSES.ERROR,
                    message: concurrent ? 'Konflikt równoległego zapisu. Transakcja wycofana; ponów import.'
                        : error instanceof Error ? error.message : String(error) };
            }
            await report.record(record, result);
        }
        return !isInterrupted();
    }
}
