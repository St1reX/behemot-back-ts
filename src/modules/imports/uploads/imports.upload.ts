import type { Dirent } from 'node:fs';
import { readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { getUploadDirectory } from '../../../config/multer';

const bolmaReportsDirectory = getUploadDirectory('imports', 'bolma');

export function getBolmaReportPath(importId: string): string {
    const timestamp = new Intl.DateTimeFormat('sv-SE', {
        timeZone: 'Europe/Warsaw', year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
    }).format(new Date()).replace(' ', '_').replace(/:/g, '-');
    return join(bolmaReportsDirectory, `raport_import_bolma_${timestamp}_${importId}.xlsx`);
}

export async function findLatestBolmaReportPath(): Promise<string | null> {
    let files: Dirent[];
    try {
        files = await readdir(bolmaReportsDirectory, { withFileTypes: true });
    } catch (error) {
        if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return null;
        throw error;
    }
    let latest: { path: string; modifiedAt: number } | undefined;
    for (const file of files) {
        if (!file.isFile() || !file.name.toLowerCase().endsWith('.xlsx')) continue;
        const path = join(bolmaReportsDirectory, file.name);
        const { mtimeMs } = await stat(path);
        if (!latest || mtimeMs > latest.modifiedAt || (mtimeMs === latest.modifiedAt && path > latest.path)) {
            latest = { path, modifiedAt: mtimeMs };
        }
    }
    return latest?.path ?? null;
}
