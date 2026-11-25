export const PRODUCT_IMAGE_FIELDS = {
    PRODUCT: 'productPhotoes',
    DESCRIPTION: 'descProductPhotoes',
} as const;

export const PRODUCT_IMAGE_TYPES: Readonly<Record<string, string>> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
};
export const PRODUCT_MAX_IMAGES_PER_UPLOAD_FIELD = 20;
export const PRODUCT_IMAGE_MAX_FILE_SIZE_MB = 10;
export const PRODUCT_UPLOAD_DATA_FIELD = 'data';
export const PRODUCT_SKU_DIRECTORY_MAX_LENGTH = 240;
