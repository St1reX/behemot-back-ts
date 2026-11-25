import fs from 'node:fs';
import fsPromises from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import express from 'express';
import multer from 'multer';
import { AppError, ErrorNames } from '../errors/errorHandler';
import { env, apiUrl, apiPort } from './env';
import { BYTES_PER_MB, DEFAULT_UPLOAD_FILE_SIZE_MB, UPLOADS_PUBLIC_PATH } from '../shared/constants/uploads';

export const uploadsRootPath = path.resolve(process.cwd(), env.UPLOADS_ROOT_PATH);
const configuredApiUrl = new URL(apiUrl);
if (!configuredApiUrl.port && !['80', '443'].includes(String(apiPort))) configuredApiUrl.port = String(apiPort);
const publicUploadsUrl = env.PUBLIC_UPLOADS_URL?.replace(/\/$/, '') ?? `${configuredApiUrl.origin}${UPLOADS_PUBLIC_PATH}`;

interface CreateMulterUploadOptions {
    directory: string;
    allowedTypes: Readonly<Record<string, string>>;
    maxFileSizeMb?: number;
    maxFiles: number;
}

export function createMulterUpload(options: CreateMulterUploadOptions) {
    return multer({
        storage: multer.diskStorage({
            destination: (_req, _file, callback) => {
                fs.mkdir(options.directory, { recursive: true }, (error) => callback(error, options.directory));
            },
            filename: (_req, file, callback) => {
                callback(null, `${randomUUID()}${path.extname(file.originalname).toLowerCase()}`);
            },
        }),
        limits: {
            fileSize: (options.maxFileSizeMb ?? DEFAULT_UPLOAD_FILE_SIZE_MB) * BYTES_PER_MB,
            files: options.maxFiles,
            fields: 1,
            fieldSize: BYTES_PER_MB,
        },
        fileFilter: (_req, file, callback) => {
            const expectedMime = options.allowedTypes[path.extname(file.originalname).toLowerCase()];
            if (expectedMime && file.mimetype === expectedMime) return callback(null, true);
            callback(new AppError(ErrorNames.VALIDATION_ERROR, 422, 'Nieprawidłowy typ zdjęcia. Użyj JPEG, PNG lub WebP.'));
        },
    });
}

export function getUploadDirectory(...segments: string[]) {
    return path.join(uploadsRootPath, ...segments);
}

export function toUploadPublicUrl(filePath: string) {
    const relativePath = path.relative(uploadsRootPath, filePath);
    if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) throw new Error('Invalid upload path');
    return `${publicUploadsUrl}/${relativePath.split(path.sep).map(encodeURIComponent).join('/')}`;
}

export async function deleteUploadedFiles(files: { path: string }[]) {
    await Promise.all(files.map(async (file) => {
        try {
            await fsPromises.unlink(file.path);
        } catch (error) {
            if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw error;
        }
    }));
}

export function productUploadsStaticMiddleware() {
    return express.static(getUploadDirectory('products'), {
        dotfiles: 'deny',
        index: false,
        setHeaders: (res) => { res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin'); },
    });
}
