import { z } from 'zod';
import { ImportProductSchema } from '../../modules/product/schemas/product.schema';
import { hasListingText, prepareListingHtml } from '../../modules/productListingTemplate/utils/rendering/listingHtml';
import { BASELINKER_IMPORT_FIELDS, BASELINKER_NUMERIC_FIELDS, BASELINKER_ZERO_VALUE_PATTERN } from './baselinkerProductImport.constants';
import { BaselinkerCsvRecord, BaselinkerSourceRow } from './baselinkerProductImport.parser';

const productPatchSchema = ImportProductSchema.pick({
    ean: true, customName: true, customDescription: true, price: true,
    weight: true, height: true, length: true, width: true,
}).partial().extend({ ean: z.string().regex(/^(?:\d{8}|\d{12,14})$/u).optional() });

export type BaselinkerProductField = keyof typeof BASELINKER_IMPORT_FIELDS;
export type BaselinkerNumericField = typeof BASELINKER_NUMERIC_FIELDS[number];

export interface BaselinkerDataQuality {
    latestMissingFields: BaselinkerProductField[];
    sourceMissingFields: BaselinkerProductField[];
    zeroFields: BaselinkerNumericField[];
    fallbackFields: BaselinkerProductField[];
    fieldSourceIds: Partial<Record<BaselinkerProductField, string>>;
}

export interface BaselinkerSourceSelection {
    row: BaselinkerSourceRow;
    quality: BaselinkerDataQuality;
}

function isMissingSourceValue(field: BaselinkerProductField, value: string): boolean {
    if (!value) return true;
    if (field === 'customDescription') return !hasListingText(value);
    return BASELINKER_NUMERIC_FIELDS.some((numericField) => numericField === field)
        && BASELINKER_ZERO_VALUE_PATTERN.test(value);
}

// Records of one SKU are ordered by numeric source ID DESC by the service.
// Select each field independently; invalid non-empty values still reach validation.
export function selectBaselinkerSource(records: BaselinkerCsvRecord[]): BaselinkerSourceSelection {
    const latest = records[0];
    if (!latest) throw new Error('Brak rekordów źródłowych SKU.');
    const row = { ...latest.row };
    const quality: BaselinkerDataQuality = {
        latestMissingFields: [], sourceMissingFields: [], fallbackFields: [], fieldSourceIds: {},
        zeroFields: BASELINKER_NUMERIC_FIELDS.filter((field) => BASELINKER_ZERO_VALUE_PATTERN.test(latest.row[field])),
    };
    for (const field of Object.keys(BASELINKER_IMPORT_FIELDS) as BaselinkerProductField[]) {
        if (isMissingSourceValue(field, latest.row[field])) quality.latestMissingFields.push(field);
        const source = records.find((record) => !isMissingSourceValue(field, record.row[field]));
        if (!source) {
            quality.sourceMissingFields.push(field);
            continue;
        }
        row[field] = source.row[field];
        quality.fieldSourceIds[field] = source.row.sourceId;
        if (source !== latest) quality.fallbackFields.push(field);
    }
    return { row, quality };
}

export function mapBaselinkerProduct(selection: BaselinkerSourceSelection) {
    const { row, quality } = selection;
    const candidate: Record<string, string | number> = {};
    const issues: string[] = [];
    for (const field of ['ean', 'customName', 'customDescription'] as const) {
        const value = row[field];
        if (!isMissingSourceValue(field, value)) {
            candidate[field] = field === 'customDescription' ? prepareListingHtml(value) : value;
        }
    }
    for (const field of BASELINKER_NUMERIC_FIELDS) {
        const value = row[field];
        if (isMissingSourceValue(field, value)) continue;
        if (!/^\d+(?:[.,]\d{1,2})?$/u.test(value)) {
            issues.push(`${BASELINKER_IMPORT_FIELDS[field]}: niepoprawna liczba lub więcej niż 2 miejsca po przecinku (${value}). Bez zaokrąglania.`);
        } else {
            candidate[field] = Number(value.replace(',', '.'));
        }
    }
    const parsed = productPatchSchema.safeParse(candidate);
    if (!parsed.success) issues.push(...parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`));
    return { data: parsed.success && !issues.length ? parsed.data : null, quality, issues };
}
