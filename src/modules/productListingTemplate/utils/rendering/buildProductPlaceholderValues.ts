import type { ProductSide } from '@prisma/client';
import { PRODUCT_SIDE_LABELS, PRODUCT_SIDE_TITLE_LABELS } from '../../../../shared/constants/productSides';
import { formatCarGeneration } from './formatCarGeneration';

interface ProductPlaceholderData {
    customName: string | null;
    side: ProductSide | null;
    sku: string;
    ean: string | null;
    oem: string[];
    price: { toString(): string } | null;
    quantity: number | null;
    weight: { toString(): string } | null;
    length: { toString(): string } | null;
    width: { toString(): string } | null;
    height: { toString(): string } | null;
    warehouseLocation: string | null;
    department: {
        name: string;
        shortcut: string;
    } | null;
    producer: {
        name: string;
    } | null;
    productFitments: ProductFitmentPlaceholderData[];
}

interface ProductFitmentPlaceholderData {
    isPrimary: boolean;
    carBrand?: { name: string } | null;
    carModel?: { name: string } | null;
    carGeneration: {
        startProduction: number;
        endProduction: number | null;
        carModel: {
            name: string;
            carBrand: {
                name: string;
            };
        };
    } | null;
}

export type ProductPlaceholderValues = ReturnType<typeof buildProductPlaceholderValues>;

export function buildProductPlaceholderValues(
    product: ProductPlaceholderData,
) {
    const primaryFitment = product.productFitments.find((fitment) => fitment.isPrimary);
    const primaryCarGeneration = primaryFitment?.carGeneration;
    const productionYears = primaryCarGeneration
        ? primaryCarGeneration.endProduction
            ? `${primaryCarGeneration.startProduction}-${primaryCarGeneration.endProduction}`
            : `${primaryCarGeneration.startProduction}-`
        : null;

    return {
        customName: product.customName,
        carGeneration: primaryCarGeneration ? formatCarGeneration(primaryCarGeneration) : null,
        carBrand: primaryFitment?.carBrand?.name ?? primaryCarGeneration?.carModel.carBrand.name ?? null,
        carModel: primaryFitment?.carModel?.name ?? primaryCarGeneration?.carModel.name ?? null,
        productionYears,
        sideLabel: product.side === null ? null : PRODUCT_SIDE_LABELS[product.side],
        sideTitleLabel: product.side === null ? null : PRODUCT_SIDE_TITLE_LABELS[product.side],
        sku: product.sku,
        ean: product.ean,
        OEM: product.oem.length > 0 ? product.oem.join(', ') : null,
        price: product.price?.toString() ?? null,
        quantity: product.quantity?.toString() ?? null,
        weight: product.weight?.toString() ?? null,
        length: product.length?.toString() ?? null,
        width: product.width?.toString() ?? null,
        height: product.height?.toString() ?? null,
        warehouseLocation: product.warehouseLocation,
        department: product.department?.name ?? null,
        departmentShortcut: product.department?.shortcut ?? null,
        producer: product.producer?.name ?? null,
    };
}
