export const BOLMA_PRODUCT_IMPORT = {
    AUDIT_USER_ID: 'cli:bolma-product-import',
    ACTIVE_STATUS: 1,
    LISTINGS_NOTE: 'Etap Bolma nie zawiera kont ani ID ofert. Nie utworzono powiązań ofert.',
} as const;

export const BOLMA_IMPORT_STATUSES = {
    CREATED: 'created',
    PLANNED: 'would_create',
    EXISTING: 'existing',
    SKIPPED: 'skipped',
    CONFLICT: 'conflict',
    ERROR: 'error',
} as const;
