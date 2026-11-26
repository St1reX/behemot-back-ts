import { OperationStatus, Prisma } from '@prisma/client';
import { prisma } from '../../config/database';
import { ACTIONS } from '../../shared/constants/actions';
import { ENTITIES } from '../../shared/constants/entities';
import { PRODUCT_CONTENT_VERSIONS } from '../../modules/product/constants/productVersions';
import { hasListingText } from '../../modules/productListingTemplate/utils/rendering/listingHtml';
import { BASELINKER_IMPORT_FIELDS, BASELINKER_IMPORT_STATUSES, BASELINKER_PRODUCT_IMPORT } from './baselinkerProductImport.constants';
import { BaselinkerProductField, BaselinkerSourceSelection, mapBaselinkerProduct } from './baselinkerProductImport.mapper';
import { BaselinkerImportResult } from './baselinkerProductImport.report';
import type { BolmaProductPreview } from '../seedBolmaProduct/bolmaProductImport.service';

function missingFields(product: Record<BaselinkerProductField, string | null>): BaselinkerProductField[] {
    return (Object.keys(BASELINKER_IMPORT_FIELDS) as BaselinkerProductField[]).filter((field) => {
        const value = product[field];
        return !value || (field === 'customDescription' ? !hasListingText(value)
            : field !== 'ean' && field !== 'customName' && Number(value) <= 0);
    });
}

export class BaselinkerProductImportRepository {
    static readExistingProducts() {
        return prisma.product.findMany({ select: {
            id: true, sku: true, isLegacy: true, contentVersion: true, deletedAt: true, customName: true,
        } });
    }

    static async updateRecord(selection: BaselinkerSourceSelection, apply: boolean,
        preview?: BolmaProductPreview): Promise<BaselinkerImportResult> {
        if (apply && preview) throw new Error('Plan Bolmy może być używany tylko w dry run.');
        const { row } = selection;
        return prisma.$transaction(async (tx): Promise<BaselinkerImportResult> => {
            if (apply) await tx.$queryRaw`SELECT id FROM "Product" WHERE sku = ${row.sku} FOR UPDATE`;
            const products = await tx.product.findMany({ where: { sku: row.sku } });
            if (!products.length && !preview) return { status: BASELINKER_IMPORT_STATUSES.SKIPPED, message: 'SKU nie istnieje w Behemocie. Nie utworzono produktu.' };
            if (products.length > 1) return { status: BASELINKER_IMPORT_STATUSES.CONFLICT, message: 'SKU wskazuje wiele produktów w Behemocie.' };
            if (preview && preview.productId !== products[0]?.id) {
                return { status: BASELINKER_IMPORT_STATUSES.CONFLICT, message: 'Produkt zmienił się od podglądu etapu Bolmy. Ponów podgląd.' };
            }
            const storedProduct = products[0];
            const product = storedProduct ? {
                ...storedProduct,
                ...(preview ? {
                    customName: preview.customName,
                    length: preview.length === null ? null : new Prisma.Decimal(preview.length),
                    weight: preview.weight === null ? null : new Prisma.Decimal(preview.weight),
                } : {}),
            } : {
                id: undefined, isLegacy: true, contentVersion: PRODUCT_CONTENT_VERSIONS.IMPORTED, deletedAt: null,
                customName: preview!.customName, customDescription: null, ean: null,
                price: null, weight: preview!.weight, height: null, length: preview!.length, width: null,
            };
            if (product.deletedAt) return { status: BASELINKER_IMPORT_STATUSES.SKIPPED, productId: product.id, message: 'Produkt usunięty. Bez zmian.' };
            if (!product.isLegacy || product.contentVersion !== PRODUCT_CONTENT_VERSIONS.IMPORTED) {
                return { status: BASELINKER_IMPORT_STATUSES.CONFLICT, productId: product.id, message: 'Produkt zarządzany przez Behemotha. Bez zmian.' };
            }

            const mapped = mapBaselinkerProduct(selection);
            const fields = Object.keys(BASELINKER_IMPORT_FIELDS) as BaselinkerProductField[];
            const before = Object.fromEntries(fields.map((field) => [field, product[field]?.toString() ?? null])) as Record<BaselinkerProductField, string | null>;
            const resultBase = { productId: product.id, ...(!product.id ? { plannedProduct: true } : {}), quality: mapped.quality };
            if (!mapped.data) return { ...resultBase, status: BASELINKER_IMPORT_STATUSES.ERROR,
                message: mapped.issues.join(' '), remainingMissingFields: missingFields(before) };

            const changes: NonNullable<BaselinkerImportResult['changes']> = {};
            const after = { ...before };
            for (const field of fields) {
                const value = mapped.data[field];
                if (value === undefined || value === null) continue;
                const text = String(value);
                if (before[field] !== text) {
                    changes[field] = { before: before[field], after: text, sourceId: mapped.quality.fieldSourceIds[field]! };
                    after[field] = text;
                }
            }
            const remainingMissingFields = missingFields(after);
            if (!Object.keys(changes).length) return { ...resultBase, remainingMissingFields,
                status: BASELINKER_IMPORT_STATUSES.UNCHANGED, message: 'Brak zmian. Puste pola i zera nie nadpisują danych.' };
            if (!apply) return { ...resultBase, remainingMissingFields, changes,
                status: BASELINKER_IMPORT_STATUSES.PLANNED, message: 'Uzupełnienie produktu (dry run).' };

            // Import updates only the permitted fields; it does not take over management,
            // change contentVersion/quantity/fitments/templates, or enqueue synchronization.
            if (!product.id) throw new Error('Nie można zapisać produktu istniejącego tylko w planie dry run.');
            await tx.product.update({ where: { id: product.id, isLegacy: true, deletedAt: null,
                contentVersion: PRODUCT_CONTENT_VERSIONS.IMPORTED }, data: mapped.data });
            await tx.log.create({ data: {
                userId: BASELINKER_PRODUCT_IMPORT.AUDIT_USER_ID,
                entityName: ENTITIES.PRODUCT,
                entityId: product.id,
                action: ACTIONS.UPDATE,
                operationStatus: OperationStatus.SUCCESS,
                comment: `Import danych BaseLinkera: najnowsze ID ${row.sourceId}, SKU ${row.sku}. Źródła pól: ${JSON.stringify(mapped.quality.fieldSourceIds)}.`,
                dataBefore: before,
                dataAfter: after,
            } });
            return { ...resultBase, remainingMissingFields, changes,
                status: BASELINKER_IMPORT_STATUSES.UPDATED, message: 'Uzupełniono produkt legacy.' };
        }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    }
}
