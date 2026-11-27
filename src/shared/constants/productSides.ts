import { ProductSide } from '@prisma/client';

export const PRODUCT_SIDE_LABELS: Record<ProductSide, string> = {
    [ProductSide.LEFT]: 'Strona Lewa',
    [ProductSide.RIGHT]: 'Strona Prawa',
    [ProductSide.BOTH]: 'Strona Lewa/Prawa',
    [ProductSide.NONE]: 'Brak',
};

export const PRODUCT_SIDE_TITLE_LABELS: Record<ProductSide, string> = {
    [ProductSide.LEFT]: 'LEWA',
    [ProductSide.RIGHT]: 'PRAWA',
    [ProductSide.BOTH]: 'LEWA/PRAWA',
    [ProductSide.NONE]: '',
};
