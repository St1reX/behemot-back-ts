import { PRODUCT_SIDE_LABELS, PRODUCT_SIDE_TITLE_LABELS, ProductSide } from '../../../../shared/constants/productSides';
import { formatCarGeneration } from './formatCarGeneration';

interface ProductPlaceholderData {
    customName: string | null;
    side: ProductSide;
    sku: string;
    ean: string | null;
    oem: string[];
    price: { toString(): string };
    quantity: number;
    weight: { toString(): string };
    length: { toString(): string };
    width: { toString(): string };
    height: { toString(): string } | null;
    warehouseLocation: string;
    department: {
        name: string;
        shortcut: string;
    };
    producer: {
        name: string;
    };
    productFitments: ProductFitmentPlaceholderData[];
}

interface ProductFitmentPlaceholderData {
    isPrimary: boolean;
    carGeneration: {
        startProduction: number;
        endProduction: number | null;
        carModel: {
            name: string;
            carBrand: {
                name: string;
            };
        };
    };
}

export type ProductPlaceholderValues = Record<string, string | null>;

export function buildProductPlaceholderValues(
    product: ProductPlaceholderData,
): ProductPlaceholderValues {
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
        carBrand: primaryCarGeneration?.carModel.carBrand.name ?? null,
        carModel: primaryCarGeneration?.carModel.name ?? null,
        productionYears,
        sideLabel: PRODUCT_SIDE_LABELS[product.side],
        sideTitleLabel: PRODUCT_SIDE_TITLE_LABELS[product.side],
        sku: product.sku,
        ean: product.ean,
        OEM: product.oem.length > 0 ? product.oem.join(', ') : null,
        price: product.price.toString(),
        quantity: product.quantity.toString(),
        weight: product.weight.toString(),
        length: product.length.toString(),
        width: product.width.toString(),
        height: product.height?.toString() ?? null,
        warehouseLocation: product.warehouseLocation,
        department: product.department.name,
        departmentShortcut: product.department.shortcut,
        producer: product.producer.name,
    };
}
