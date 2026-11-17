export const PRODUCT_SIDES = {
    LEFT: 'LEFT',
    RIGHT: 'RIGHT',
    BOTH: 'BOTH',
    NONE: 'NONE',
} as const;

export type ProductSide = (typeof PRODUCT_SIDES)[keyof typeof PRODUCT_SIDES];

export const PRODUCT_SIDE_LABELS: Record<ProductSide, string> = {
    [PRODUCT_SIDES.LEFT]: 'Strona Lewa',
    [PRODUCT_SIDES.RIGHT]: 'Strona Prawa',
    [PRODUCT_SIDES.BOTH]: 'Strona Lewa/Prawa',
    [PRODUCT_SIDES.NONE]: 'Brak',
};

export const PRODUCT_SIDE_TITLE_LABELS: Record<ProductSide, string> = {
    [PRODUCT_SIDES.LEFT]: 'LEWA',
    [PRODUCT_SIDES.RIGHT]: 'PRAWA',
    [PRODUCT_SIDES.BOTH]: 'LEWA/PRAWA',
    [PRODUCT_SIDES.NONE]: '',
};
