import fs from 'node:fs';
import fsPromises from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import express from 'express';
import multer from 'multer';
import { AppError, ErrorNames } from '../errors/errorHandler';
import { env, apiUrl, apiPort } from './env';
import type { UploadedFile } from '../types/upload.types';

export const uploadsPublicPath = '/uploads';
export const uploadsRootPath = path.resolve(process.cwd(), env.UPLOADS_ROOT_PATH);
const configuredApiUrl = new URL(apiUrl);
if (!configuredApiUrl.port && !['80', '443'].includes(String(apiPort))) configuredApiUrl.port = String(apiPort);
const publicUploadsUrl = env.PUBLIC_UPLOADS_URL?.replace(/\/$/, '') ?? `${configuredApiUrl.origin}${uploadsPublicPath}`;

interface CreateMulterUploadOptions {
    directory: string;
    allowedTypes: Readonly<Record<string, string>>;
    limits: NonNullable<multer.Options['limits']>;
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
        limits: options.limits,
        fileFilter: (_req, file, callback) => {
            const expectedMime = options.allowedTypes[path.extname(file.originalname).toLowerCase()];
            if (expectedMime && file.mimetype === expectedMime) return callback(null, true);
            callback(new AppError(ErrorNames.VALIDATION_ERROR, 422, 'Nieprawidłowy typ pliku.'));
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

export function toUploadedFile(file: Express.Multer.File): UploadedFile {
    return { filePath: file.path, fieldName: file.fieldname, mimeType: file.mimetype };
}

export async function deleteUploadedFiles(files: UploadedFile[]) {
    await Promise.all(files.map(async (file) => {
        try {
            await fsPromises.unlink(file.filePath);
        } catch (error) {
            if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw error;
        }
    }));
}

export function uploadsStaticMiddleware(directory: string) {
    return express.static(getUploadDirectory(directory), {
        dotfiles: 'deny',
        index: false,
        setHeaders: (res) => { res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin'); },
    });
}
