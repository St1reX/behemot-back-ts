import { readFile } from 'node:fs/promises';
import { TextDecoder } from 'node:util';
import { z } from 'zod';
import { BASELINKER_EXPORT_HEADERS, BASELINKER_FULL_EXPORT_HEADERS, BASELINKER_FULL_EXPORT_COLUMNS } from './baselinkerProductImport.constants';

const sourceRowSchema = z.object({
    sourceId: z.string().regex(/^[1-9]\d*$/u),
    sku: z.string().trim(),
    ean: z.string().trim(),
    weight: z.string().trim(),
    height: z.string().trim(),
    length: z.string().trim(),
    width: z.string().trim(),
    price: z.string().trim(),
    customName: z.string().trim(),
    customDescription: z.string().trim(),
});

export type BaselinkerSourceRow = z.infer<typeof sourceRowSchema>;
export interface BaselinkerCsvRecord {
    recordNumber: number;
    lineNumber: number;
    row: BaselinkerSourceRow;
}

// Semicolon CSV with escaped quotes and multiline descriptions; no split-by-line parsing.
function parseCsv(text: string) {
    const records: { values: string[]; lineNumber: number }[] = [];
    let values: string[] = [];
    let field = '';
    let quoted = false;
    let closedQuote = false;
    let lineNumber = 1;
    let recordLine = 1;
    let headerText = '';
    let headerWidth = 0;
    for (let index = 0; index < text.length; index++) {
        const char = text[index];
        if (quoted) {
            if (char === '"') {
                if (text[index + 1] === '"') { field += '"'; index++; }
                else { quoted = false; closedQuote = true; }
            } else {
                field += char;
                if (char === '\n') lineNumber++;
            }
            continue;
        }
        if (closedQuote && char !== ';' && char !== '\n') {
            // The full supplied export appends the unquoted header directly to
            // the closing quote of the last field, without a separator.
            if (headerText && values.length === headerWidth - 1 && text.startsWith(headerText, index)
                && (text[index + headerText.length] === '\n' || index + headerText.length === text.length)) {
                index += headerText.length - 1;
                continue;
            }
            throw new Error(`CSV, linia ${lineNumber}: niedozwolony znak po zamknięciu cudzysłowu.`);
        }
        if (char === '"') {
            if (field) throw new Error(`CSV, linia ${lineNumber}: cudzysłów wewnątrz niecytowanego pola.`);
            quoted = true;
        } else if (char === ';') {
            values.push(field); field = ''; closedQuote = false;
        } else if (char === '\n') {
            values.push(field);
            if (values.length > 1 || values[0] !== '') {
                records.push({ values, lineNumber: recordLine });
                if (records.length === 1) { headerText = values.join(';'); headerWidth = values.length; }
            }
            values = []; field = ''; closedQuote = false;
            lineNumber++; recordLine = lineNumber;
        } else {
            field += char;
        }
    }
    if (quoted) throw new Error(`CSV, linia ${recordLine}: niedomknięte pole cytowane.`);
    if (field || values.length || closedQuote) records.push({ values: [...values, field], lineNumber: recordLine });
    return records;
}

export async function readBaselinkerExport(path: string): Promise<BaselinkerCsvRecord[]> {
    const bytes = await readFile(path);
    let text: string;
    try {
        text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    } catch {
        throw new Error('Eksport nie jest poprawnym UTF-8. Użyj surowego CSV z BaseLinkera, bez zapisywania w Excelu.');
    }
    const records = parseCsv(text.replace(/\r\n?/gu, '\n'));
    const header = records.shift()?.values;
    const shortExport = header?.length === BASELINKER_EXPORT_HEADERS.length && header.every((value, index) =>
        value === BASELINKER_EXPORT_HEADERS[index] || (index === 9 && value === 'Opis PL'));
    const fullExport = header?.length === BASELINKER_FULL_EXPORT_HEADERS.length && header.every((value, index) =>
        value === BASELINKER_FULL_EXPORT_HEADERS[index]);
    if (!header || (!shortExport && !fullExport)) throw new Error('Nieobsługiwany nagłówek CSV. Obsługiwany jest przekazany eksport 10-kolumnowy oraz pełny eksport 59-kolumnowy.');

    return records.map(({ values, lineNumber }, index) => {
        const tail = values.slice(header.length);
        // The supplied export appends a literal copy of its header to every row,
        // except the last row, which only has a trailing semicolon.
        const repeatedHeader = tail.length === header.length && tail.every((value, position) => value === header[position]);
        if (tail.length && !(tail.length === 1 && tail[0] === '') && !repeatedHeader) {
            throw new Error(`CSV, rekord ${index + 1}, linia ${lineNumber}: nieoczekiwane końcowe kolumny.`);
        }
        if (values.length < header.length) throw new Error(`CSV, rekord ${index + 1}: brak wymaganych kolumn.`);
        const [sourceId, ean, sku, weight, height, length, width, price, customName, customDescription] = values;
        const source = fullExport ? Object.fromEntries(Object.entries(BASELINKER_FULL_EXPORT_COLUMNS)
            .map(([field, column]) => [field, values[header.indexOf(column)]]))
            : { sourceId, ean, sku, weight, height, length, width, price, customName, customDescription };
        const parsed = sourceRowSchema.safeParse(source);
        if (!parsed.success) throw new Error(`CSV, rekord ${index + 1}, linia ${lineNumber}: ${parsed.error.message}`);
        return { recordNumber: index + 1, lineNumber, row: parsed.data };
    });
}
