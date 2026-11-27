import { Prisma, OperationStatus } from '@prisma/client';
import { RowDataPacket } from 'mysql2/promise';
import { prisma } from '../../../config/database';
import { env } from '../../../config/env';
import { ACTIONS } from '../../../shared/constants/actions';
import { ENTITIES } from '../../../shared/constants/entities';
import { PRODUCT_CONTENT_VERSIONS } from '../../product/constants/productVersions';
import { ImportProductSchema } from '../../product/schemas/product.schema';
import { validateProductFitments } from '../../productFitment/validateProductFitments';
import { bolmaDatabasePool } from '../config/database';
import { BolmaProductRow, BolmaImportDictionaries, mapBolmaProduct, mapBolmaMeasurements } from '../bolmaProduct.mapper';
import type { BolmaImportResult } from '../types/imports.types';
import { readCatalog } from '../../../shared/utils/vehicleCatalog';

export class BolmaImportRepository {
    static async checkConnection(): Promise<void> {
        const connection = await bolmaDatabasePool.getConnection();
        try {
            await connection.query({ sql: 'SELECT 1', timeout: env.BOLMA_PRODUCTS_CATALOG_MYSQL_CONNECT_TIMEOUT_MS });
            connection.release();
        } catch (error) {
            connection.destroy();
            throw error;
        }
    }

    static async readSourceRows(): Promise<RowDataPacket[]> {
        const [rows] = await bolmaDatabasePool.query<RowDataPacket[]>({
            sql: `SELECT CAST(p.id AS CHAR) AS id, p.nr_kat, p.tytul, p.id_kat, p.pozycja_magazynowa, p.department_sign
                FROM products p WHERE p.status = ? ORDER BY p.id ASC`,
            values: [1],
            timeout: env.BOLMA_PRODUCTS_CATALOG_MYSQL_CONNECT_TIMEOUT_MS,
        });
        const [params] = await bolmaDatabasePool.query<RowDataPacket[]>({
            sql: `SELECT CAST(pp.product_id AS CHAR) AS product_id, pp.param_id, pp.value
                FROM products_2_params pp JOIN products p ON p.id = pp.product_id
                WHERE p.status = ? AND pp.param_id IN (1, 2, 4) ORDER BY pp.id ASC`,
            values: [1],
            timeout: env.BOLMA_PRODUCTS_CATALOG_MYSQL_CONNECT_TIMEOUT_MS,
        });
        const paramsByProduct = new Map<string, BolmaProductRow['params']>();
        for (const param of params) {
            const productParams = paramsByProduct.get(param.product_id) ?? [];
            productParams.push({ param_id: param.param_id, value: param.value });
            paramsByProduct.set(param.product_id, productParams);
        }
        return rows.map((row) => Object.assign(row, { params: paramsByProduct.get(row.id) ?? [] }));
    }

    static async readDictionaries(): Promise<BolmaImportDictionaries> {
        const [brands, departments] = await Promise.all([
            prisma.carBrand.findMany({ where: { deletedAt: null }, include: {
                models: { where: { deletedAt: null }, include: { carGenerations: { where: { deletedAt: null } } } },
            } }),
            prisma.department.findMany({ where: { deletedAt: null }, select: { id: true, shortcut: true, name: true } }),
        ]);
        return { brands, departments, vehicles: readCatalog() };
    }

    static async importRecord(row: BolmaProductRow, dictionaries: BolmaImportDictionaries,
        userId: string): Promise<BolmaImportResult> {
        return prisma.$transaction(async (tx): Promise<BolmaImportResult> => {
            const conflict = (message: string, productId?: string): BolmaImportResult => ({
                status: 'conflict', message, ...(productId ? { productId } : {}),
            });
            if (!row.nr_kat) return { status: 'skipped', message: 'Brak SKU.' };
            await tx.$queryRaw`SELECT id FROM "Product" WHERE sku = ${row.nr_kat} FOR UPDATE`;

            // Include soft-deleted products: their SKU must not be silently reassigned.
            const existing = await tx.product.findMany({
                where: { sku: row.nr_kat }, select: {
                    id: true, isLegacy: true, contentVersion: true, deletedAt: true, customName: true, length: true, weight: true,
                },
            });
            if (existing.length > 1) return conflict('SKU wskazuje wiele produktów. Bez zmian.');
            if (existing.length === 1) {
                const product = existing[0];
                if (!product.isLegacy || product.contentVersion !== PRODUCT_CONTENT_VERSIONS.IMPORTED || product.deletedAt) {
                    return conflict('SKU zajęte przez produkt zarządzany przez Behemotha lub usunięty. Bez zmian.', product.id);
                }
                const measurements = mapBolmaMeasurements(row.params);
                const data: { customName?: string; length?: number; weight?: number } = {};
                const dataBefore: { customName?: string | null; length?: number | null; weight?: number | null } = {};
                if (!product.customName?.trim() && row.tytul) {
                    const customName = ImportProductSchema.shape.customName.parse(row.tytul);
                    if (!customName) throw new Error('Niepoprawna nazwa produktu Bolmy.');
                    data.customName = customName;
                    dataBefore.customName = product.customName;
                }
                for (const field of ['length', 'weight'] as const) {
                    const value = measurements.data[field];
                    if ((product[field] === null || product[field].lte(0)) && value !== null) {
                        data[field] = value;
                        dataBefore[field] = product[field]?.toNumber() ?? null;
                    }
                }
                if (Object.keys(data).length) {
                    const productSnapshot = {
                        customName: data.customName ?? product.customName,
                        length: data.length ?? product.length?.toNumber() ?? null,
                        weight: data.weight ?? product.weight?.toNumber() ?? null,
                    };
                    const details = { dataBefore, dataAfter: data, warnings: measurements.warnings, productSnapshot };
                    await tx.product.update({ where: { id: product.id, isLegacy: true, deletedAt: null,
                        contentVersion: PRODUCT_CONTENT_VERSIONS.IMPORTED }, data });
                    await tx.log.create({ data: {
                        userId, entityName: ENTITIES.PRODUCT, entityId: product.id,
                        action: ACTIONS.UPDATE, operationStatus: OperationStatus.SUCCESS,
                        comment: `Uzupełnienie danych z Bolmy: products / ${row.id}.`,
                        dataBefore, dataAfter: data,
                    } });
                    return { status: 'updated', productId: product.id,
                        message: 'Uzupełniono puste dane produktu legacy z Bolmy.', ...details };
                }
                return { status: 'existing', productId: product.id,
                    message: 'Istnieje produkt legacy z tym SKU. Pozostawiono bez zmian.', warnings: measurements.warnings,
                    productSnapshot: { customName: product.customName, length: product.length?.toNumber() ?? null,
                        weight: product.weight?.toNumber() ?? null } };
            }

            const mapped = mapBolmaProduct(row, dictionaries);
            const { productFitments, ...data } = mapped.data;
            const fitments = await validateProductFitments(tx, productFitments ?? []);
            // Protect against deleted/changed departments between dictionary read and save.
            if (data.departmentId) {
                const department = await tx.department.findFirst({
                    where: { id: data.departmentId, deletedAt: null }, select: { shortcut: true },
                });
                if (department?.shortcut.trim().toUpperCase() !== row.department_sign) {
                    throw new Error('Dział zmienił się podczas importu; ponów rekord.');
                }
            }
            const product = await tx.product.create({ data: {
                ...data,
                isLegacy: true,
                contentVersion: PRODUCT_CONTENT_VERSIONS.IMPORTED,
                productFitments: { create: fitments.map(({ id: _id, ...fitment }) => fitment) },
            } });
            // Audit belongs to the same transaction as product + fitments.
            await tx.log.create({ data: {
                userId,
                entityName: ENTITIES.PRODUCT,
                entityId: product.id,
                action: ACTIONS.CREATE,
                operationStatus: OperationStatus.SUCCESS,
                comment: `Import Bolma: products / ${row.id}`,
                dataBefore: Prisma.DbNull,
                dataAfter: { ...mapped.data, isLegacy: true, contentVersion: PRODUCT_CONTENT_VERSIONS.IMPORTED },
            } });
            return { status: 'created', productId: product.id, message: 'Utworzono produkt legacy.',
                warnings: mapped.warnings, mappedProduct: mapped.data,
                departmentLabel: mapped.departmentLabel, fitmentLabels: mapped.fitmentLabels };
        }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    }
}
