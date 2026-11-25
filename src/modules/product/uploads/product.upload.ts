import type { Request } from 'express';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createMulterUpload, deleteUploadedFiles, getUploadDirectory, toUploadedFile, toUploadPublicUrl } from '../../../config/multer';
import { AppError, ErrorNames } from '../../../errors/errorHandler';
import type { UploadedFile } from '../../../types/upload.types';
import { errorWinston } from '../../../config/logger/errorWinston';
import { ProductRepository } from '../repositories/productRepository';

export const productUpload = createMulterUpload({
    directory: getUploadDirectory('.staging', 'products'),
    allowedTypes: {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.webp': 'image/webp',
    },
    limits: {
        fileSize: 10 * 1024 * 1024,
        files: 40,
        fields: 1,
        fieldSize: 1024 * 1024,
    },
}).fields([
    { name: 'productPhotoes', maxCount: 20 },
    { name: 'descProductPhotoes', maxCount: 20 },
]);

export function parseProductUploads(req: Request): UploadedFile[] {
    const files = !req.files ? [] : Array.isArray(req.files) ? req.files : Object.values(req.files).flat();
    return files.map(toUploadedFile);
}

// Reversible encoding avoids the collisions introduced by replacing characters with underscores.
function skuDirectoryName(sku: string) {
    const encoded = encodeURIComponent(sku).replace(/[!'()*\.]/g, (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`);
    const segment = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i.test(encoded) ? `%${encoded.charCodeAt(0).toString(16)}${encoded.slice(1)}` : encoded;
    if (segment.length > 240) throw new AppError(ErrorNames.VALIDATION_ERROR, 422, 'SKU jest zbyt długie dla katalogu zdjęć.');
    return segment;
}

async function validateImageSignature(file: UploadedFile) {
    const handle = await fs.open(file.filePath, 'r');
    const header = Buffer.alloc(12);
    try {
        await handle.read(header, 0, header.length, 0);
    } finally {
        await handle.close();
    }
    const valid = file.mimeType === 'image/jpeg'
        ? header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff
        : file.mimeType === 'image/png'
            ? header.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
            : header.toString('ascii', 0, 4) === 'RIFF' && header.toString('ascii', 8, 12) === 'WEBP';
    if (!valid) throw new AppError(ErrorNames.VALIDATION_ERROR, 422, 'Zawartość pliku nie odpowiada formatowi zdjęcia.');
}

export async function storeProductImages(files: UploadedFile[], sku: string) {
    const imagesUrls: string[] = [];
    const descriptionImagesUrls: string[] = [];
    if (!files.length) return { imagesUrls, descriptionImagesUrls };
    const skuDirectory = skuDirectoryName(sku);
    for (const file of files) {
        await validateImageSignature(file);
        const directory = getUploadDirectory('products', skuDirectory, file.fieldName);
        await fs.mkdir(directory, { recursive: true });
        const targetPath = path.join(directory, path.basename(file.filePath));
        await fs.rename(file.filePath, targetPath);
        // Keep cleanup pointed at the new location if a later file or database write fails.
        file.filePath = targetPath;
        const urls = file.fieldName === 'productPhotoes' ? imagesUrls : descriptionImagesUrls;
        urls.push(toUploadPublicUrl(targetPath));
    }
    return { imagesUrls, descriptionImagesUrls };
}

export async function cleanupFailedImageUpload(files: UploadedFile[]): Promise<void> {
    if (!files.length) return;
    try {
        // A connection/response failure does not prove the transaction was rolled back.
        // Never remove a file that is already referenced by a persisted product.
        const products = await ProductRepository.findReferencingImages(files.map((file) => toUploadPublicUrl(file.filePath)));
        const referencedUrls = new Set(products.flatMap((product) => [
            ...product.imagesUrls,
            ...product.descriptionImagesUrls,
        ]));
        await deleteUploadedFiles(files.filter((file) => !referencedUrls.has(toUploadPublicUrl(file.filePath))));
    } catch (error) {
        // If the database cannot confirm ownership, retain files for manual reconciliation.
        errorWinston.error('Nie udało się bezpiecznie usunąć plików po błędzie zapisu produktu.', error);
    }
}
