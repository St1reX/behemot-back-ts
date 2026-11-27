import ExcelJS from 'exceljs';
import { createReadStream } from 'node:fs';
import { FileHandle, mkdir, open, rename } from 'node:fs/promises';
import { dirname } from 'node:path';
import { createInterface } from 'node:readline';
import type { BolmaImportRecord, BolmaImportSummary } from './types/imports.types';

// The durable journal survives a lost HTTP connection or a failure to generate the spreadsheet.
export class BolmaImportReport {
    private readonly startedAt = new Date().toISOString();
    private readonly counts: BolmaImportSummary['counts'] = {
        created: 0, updated: 0, existing: 0, skipped: 0, conflict: 0, error: 0,
    };

    private constructor(private readonly file: FileHandle, private readonly path: string) {}

    static async create(path: string) {
        await mkdir(dirname(path), { recursive: true });
        const file = await open(`${path}.jsonl`, 'wx');
        const report = new BolmaImportReport(file, path);
        try {
            await report.append({ type: 'header', startedAt: report.startedAt });
            return report;
        } catch (error) {
            await file.close();
            throw error;
        }
    }

    private async append(value: unknown) {
        await this.file.writeFile(`${JSON.stringify(value)}\n`, 'utf8');
        await this.file.sync();
    }

    async record(record: BolmaImportRecord) {
        await this.append({ type: 'record', ...record });
        this.counts[record.result.status]++;
    }

    async finish(completed: boolean, fatalError?: string) {
        const summary: BolmaImportSummary = {
            completed, startedAt: this.startedAt, finishedAt: new Date().toISOString(),
            counts: { ...this.counts }, ...(fatalError ? { fatalError } : {}),
        };
        try {
            await this.append({ type: 'summary', ...summary });
        } finally {
            await this.file.close();
        }
        await BolmaImportReport.generate(this.path, summary);
        return summary;
    }

    private static async generate(path: string, summary: BolmaImportSummary) {
        const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({ filename: `${path}.part`, useStyles: true });
        workbook.creator = 'Behemot';
        workbook.created = new Date(summary.startedAt);
        const headers = ['Rekord', 'ID w Bolmie', 'SKU', 'Wynik', 'Komunikat', 'ID produktu', 'Nazwa',
            'Długość [cm]', 'Waga [kg]', 'Lokalizacja', 'Dział', 'Dopasowania pojazdów', 'Dane przed zmianą', 'Dane po zmianie'];
        const levels = ['INFO', 'WARNING', 'ERROR'] as const;
        const colors = { INFO: '2563EB', WARNING: 'B45309', ERROR: 'B91C1C' };
        const statusLabels = {
            created: 'Utworzono', updated: 'Uzupełniono', existing: 'Istnieje — bez zmian',
            skipped: 'Pominięto', conflict: 'Konflikt — bez zmian', error: 'Błąd',
        };
        const lastRows = [4, 4, 4];
        const sheets = levels.map((level) => {
            const sheet = workbook.addWorksheet(level, {
                properties: { tabColor: { argb: `FF${colors[level]}` } },
                views: [{ state: 'frozen', ySplit: 4 }],
                pageSetup: { orientation: 'landscape', paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
            });
            sheet.columns = headers.map((_, index) => ({ width: [12, 20, 24, 20, 75, 38, 55, 18, 18, 26, 38, 65, 65, 65][index] }));
            sheet.mergeCells(1, 1, 1, headers.length);
            const title = sheet.getRow(1);
            title.getCell(1).value = `BEHEMOT  /  IMPORT BOLMA  /  ${level}`;
            title.getCell(1).font = { name: 'Calibri', size: 18, bold: true, color: { argb: 'FFFFFFFF' } };
            title.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${colors[level]}` } };
            title.height = 38;
            title.commit();
            sheet.mergeCells(2, 1, 2, headers.length);
            const dateOptions = { timeZone: 'Europe/Warsaw' };
            sheet.getCell(2, 1).value = `Start: ${new Date(summary.startedAt).toLocaleString('pl-PL', dateOptions)}  |  Koniec: ${new Date(summary.finishedAt).toLocaleString('pl-PL', dateOptions)} (Europe/Warsaw)  |  ${summary.completed ? 'Przebieg zakończony' : 'Przebieg przerwany — zapisane produkty pozostają w bazie'}`;
            sheet.getRow(2).height = 25;
            sheet.getRow(2).commit();
            sheet.mergeCells(3, 1, 3, headers.length);
            sheet.getCell(3, 1).value = `Utworzono: ${summary.counts.created}  |  Uzupełniono: ${summary.counts.updated}  |  Istniejące: ${summary.counts.existing}  |  Pominięte: ${summary.counts.skipped}  |  Konflikty: ${summary.counts.conflict}  |  Błędy rekordów: ${summary.counts.error}. Ostrzeżenia mogą dotyczyć również zapisanych produktów.`;
            sheet.getRow(3).height = 25;
            sheet.getRow(3).commit();
            const header = sheet.addRow(headers);
            header.height = 28;
            header.eachCell((cell) => {
                cell.font = { name: 'Calibri', bold: true, color: { argb: 'FFFFFFFF' } };
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
                cell.alignment = { vertical: 'middle', wrapText: true };
            });
            header.commit();
            return sheet;
        });

        function addRecord(level: typeof levels[number], record: BolmaImportRecord, message: string) {
            const result = record.result;
            const product = result.mappedProduct ?? result.productSnapshot;
            const mapped = result.mappedProduct;
            const values = [record.recordNumber, record.sourceId, record.sku, statusLabels[result.status], message, result.productId,
                product?.customName, product?.length, product?.weight, mapped?.warehouseLocation, result.departmentLabel,
                result.fitmentLabels?.join('\n'),
                result.dataBefore ? JSON.stringify(result.dataBefore) : null,
                result.dataAfter ? JSON.stringify(result.dataAfter) : mapped ? JSON.stringify(mapped) : null];
            const sheetIndex = levels.indexOf(level);
            const sheet = sheets[sheetIndex];
            const row = sheet.addRow(values.map((value) => typeof value === 'string' ? value.slice(0, 32767) : value ?? null));
            lastRows[sheetIndex] = row.number;
            row.height = 48;
            row.eachCell({ includeEmpty: true }, (cell) => {
                cell.font = { name: 'Calibri', size: 11 };
                cell.alignment = { vertical: 'top', wrapText: true };
                if (row.number % 2 === 1) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
            });
            row.commit();
        }

        const stream = createReadStream(`${path}.jsonl`);
        const lines = createInterface({ input: stream, crlfDelay: Infinity });
        try {
            for await (const line of lines) {
                const entry = JSON.parse(line) as BolmaImportRecord & { type: string };
                if (entry.type !== 'record') continue;
                const level = entry.result.status === 'error' ? 'ERROR'
                    : entry.result.status === 'skipped' || entry.result.status === 'conflict' ? 'WARNING' : 'INFO';
                addRecord(level, entry, entry.result.message);
                for (const warning of entry.result.warnings ?? []) addRecord('WARNING', entry, warning);
            }
        } finally {
            lines.close();
            stream.destroy();
        }
        if (summary.fatalError) addRecord('ERROR', { recordNumber: 0, sourceId: null, sku: null,
            result: { status: 'error', message: summary.fatalError } }, summary.fatalError);
        for (const [index, sheet] of sheets.entries()) {
            sheet.autoFilter = { from: { row: 4, column: 1 }, to: { row: lastRows[index], column: headers.length } };
            sheet.commit();
        }
        await workbook.commit();
        await rename(`${path}.part`, path);
    }
}
