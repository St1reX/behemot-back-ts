import type { Request } from 'express';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createMulterUpload, getUploadDirectory, toUploadPublicUrl } from '../../../config/multer';
import { AppError, ErrorNames } from '../../../errors/errorHandler';
import { PRODUCT_IMAGE_FIELDS, PRODUCT_IMAGE_TYPES, PRODUCT_MAX_IMAGES_PER_UPLOAD_FIELD, PRODUCT_IMAGE_MAX_FILE_SIZE_MB, PRODUCT_SKU_DIRECTORY_MAX_LENGTH } from '../constants/productUploads';

export const productUpload = createMulterUpload({
    directory: getUploadDirectory('.staging', 'products'),
    allowedTypes: PRODUCT_IMAGE_TYPES,
    maxFiles: PRODUCT_MAX_IMAGES_PER_UPLOAD_FIELD * Object.keys(PRODUCT_IMAGE_FIELDS).length,
    maxFileSizeMb: PRODUCT_IMAGE_MAX_FILE_SIZE_MB,
}).fields([
    { name: PRODUCT_IMAGE_FIELDS.PRODUCT, maxCount: PRODUCT_MAX_IMAGES_PER_UPLOAD_FIELD },
    { name: PRODUCT_IMAGE_FIELDS.DESCRIPTION, maxCount: PRODUCT_MAX_IMAGES_PER_UPLOAD_FIELD },
]);

export function getProductUploadedFiles(req: Request): Express.Multer.File[] {
    if (!req.files) return [];
    return Array.isArray(req.files) ? req.files : Object.values(req.files).flat();
}

// Reversible encoding avoids the collisions introduced by replacing characters with underscores.
function skuDirectoryName(sku: string) {
    const encoded = encodeURIComponent(sku).replace(/[!'()*\.]/g, (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`);
    const segment = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i.test(encoded) ? `%${encoded.charCodeAt(0).toString(16)}${encoded.slice(1)}` : encoded;
    if (segment.length > PRODUCT_SKU_DIRECTORY_MAX_LENGTH) throw new AppError(ErrorNames.VALIDATION_ERROR, 422, 'SKU jest zbyt długie dla katalogu zdjęć.');
    return segment;
}

async function validateImageSignature(file: Express.Multer.File) {
    const handle = await fs.open(file.path, 'r');
    const header = Buffer.alloc(12);
    try {
        await handle.read(header, 0, header.length, 0);
    } finally {
        await handle.close();
    }
    const valid = file.mimetype === 'image/jpeg'
        ? header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff
        : file.mimetype === 'image/png'
            ? header.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
            : header.toString('ascii', 0, 4) === 'RIFF' && header.toString('ascii', 8, 12) === 'WEBP';
    if (!valid) throw new AppError(ErrorNames.VALIDATION_ERROR, 422, 'Zawartość pliku nie odpowiada formatowi zdjęcia.');
}

export async function storeProductImages(files: Express.Multer.File[], sku: string) {
    const imagesUrls: string[] = [];
    const descriptionImagesUrls: string[] = [];
    if (!files.length) return { imagesUrls, descriptionImagesUrls };
    const skuDirectory = skuDirectoryName(sku);
    for (const file of files) {
        await validateImageSignature(file);
        const directory = getUploadDirectory('products', skuDirectory, file.fieldname);
        await fs.mkdir(directory, { recursive: true });
        const targetPath = path.join(directory, file.filename);
        await fs.rename(file.path, targetPath);
        // Keep cleanup pointed at the new location if a later file or database write fails.
        file.path = targetPath;
        const urls = file.fieldname === PRODUCT_IMAGE_FIELDS.PRODUCT ? imagesUrls : descriptionImagesUrls;
        urls.push(toUploadPublicUrl(targetPath));
    }
    return { imagesUrls, descriptionImagesUrls };
}
