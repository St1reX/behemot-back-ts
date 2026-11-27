import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { readCatalog, canonicalBrand, normalizeName } from '../../shared/utils/vehicleCatalog';
import { ImportProductSchema } from '../product/schemas/product.schema';

const nullableText = z.string().nullable().transform((value) => value?.trim() || null);

// Actual products columns, also used by Monday's externalProductsSync cron.
export const BolmaProductRowSchema = z.object({
    id: z.union([
        z.number().int().positive().safe().transform(String),
        z.string().regex(/^[1-9]\d*$/u),
    ]),
    nr_kat: nullableText,
    tytul: nullableText,
    id_kat: nullableText,
    pozycja_magazynowa: nullableText,
    department_sign: nullableText.transform((value) => value?.toUpperCase() ?? null),
    params: z.array(z.object({
        param_id: z.number().int(),
        value: z.string().nullable(),
    })).default([]),
});

export type BolmaProductRow = z.infer<typeof BolmaProductRowSchema>;

export function parseBolmaProductRow(row: unknown): BolmaProductRow {
    return BolmaProductRowSchema.parse(row);
}

// Bolma: 1 = length, 2 = weight, 4 = total length. Behemoth: cm and kg.
export function mapBolmaMeasurements(params: BolmaProductRow['params']) {
    const warnings: string[] = [];

    function readParam(paramId: number, field: 'length' | 'weight'): number | null {
        const entries = params.filter((param) => param.param_id === paramId);
        const values = new Set<number>();
        let invalid = false;
        for (const entry of entries) {
            const text = entry.value?.trim() ?? '';
            const candidates: number[] = [];
            // A trailing unit also applies to a list: "1065/960 mm".
            // Require a unit next to measurements so labels like "Obejma 1:" are ignored.
            const pattern = /(\d+(?:[.,]\d+)?(?:\s*[/;,]\s*\d+(?:[.,]\d+)?)*)\s*(mm|cm|m|kg|g)\b/giu;
            for (const match of text.matchAll(pattern)) {
                const unit = match[2].toLowerCase();
                const factor = field === 'length'
                    ? ({ mm: 0.1, cm: 1, m: 100 } as Record<string, number>)[unit]
                    : ({ kg: 1, g: 0.001 } as Record<string, number>)[unit];
                if (!factor) continue;
                for (const number of match[1].matchAll(/\d+(?:[.,]\d+)?/gu)) {
                    candidates.push(new Prisma.Decimal(number[0].replace(',', '.')).mul(factor).toNumber());
                }
            }
            if (field === 'weight' && /^\d+(?:[.,]\d+)?$/u.test(text)) {
                candidates.push(new Prisma.Decimal(text.replace(',', '.')).toNumber());
            }
            const value = candidates.length ? Math.max(...candidates) : null;
            const parsed = ImportProductSchema.shape[field].safeParse(value);
            if (value === null || !parsed.success || parsed.data === null) {
                invalid = true;
                warnings.push(`Pominięto parametr Bolmy ${paramId}: ${JSON.stringify(entry.value)}; brak wartości z właściwą jednostką lub liczba poza zakresem/precyzją pola ${field}.`);
            } else {
                values.add(parsed.data);
                if (!/^\d+(?:[.,]\d+)?\s*(mm|cm|m|kg|g)?$/iu.test(text)) {
                    warnings.push(`Parametr Bolmy ${paramId}: z ${JSON.stringify(entry.value)} wybrano największą wartość ${parsed.data} ${field === 'length' ? 'cm' : 'kg'}.`);
                }
            }
        }
        if (values.size > 1) warnings.push(`Pominięto parametr Bolmy ${paramId}: sprzeczne wartości w products_2_params.`);
        return !invalid && values.size === 1 ? [...values][0] : null;
    }

    const totalLength = readParam(4, 'length');
    const length = readParam(1, 'length');
    const weight = readParam(2, 'weight');
    return { data: { length: totalLength ?? length, weight }, warnings };
}

export type BolmaImportBrand = Prisma.CarBrandGetPayload<{ include: {
    models: { include: { carGenerations: true } };
} }>;

export interface BolmaImportDictionaries {
    brands: BolmaImportBrand[];
    departments: { id: string; shortcut: string; name: string }[];
    vehicles: ReturnType<typeof readCatalog>;
}

function uniqueMatch<T>(items: T[], label: string): T {
    if (items.length !== 1) throw new Error(`Słownik: ${label}; znaleziono ${items.length} rekordów. Uzupełnij lub uporządkuj słownik i ponów import.`);
    return items[0];
}

export function mapBolmaProduct(row: BolmaProductRow, dictionaries: BolmaImportDictionaries) {
    const measurements = mapBolmaMeasurements(row.params);
    const warnings = [...measurements.warnings];
    let departmentId: string | null = null;
    let departmentLabel: string | null = null;
    if (row.department_sign) {
        const departments = dictionaries.departments.filter((item) => item.shortcut.trim().toUpperCase() === row.department_sign);
        if (departments.length > 1) throw new Error(`Niejednoznaczny dział: ${row.department_sign}.`);
        departmentId = departments[0]?.id ?? null;
        departmentLabel = departments[0] ? `${departments[0].shortcut} — ${departments[0].name}` : null;
        if (!departmentId) warnings.push(`Nieznany dział ${row.department_sign}; pozostawiono brak działu.`);
    } else {
        warnings.push('Brak działu w źródle.');
    }

    const vehicles = dictionaries.vehicles.filter((vehicle) => row.id_kat && vehicle.sourceIds.includes(row.id_kat));
    if (!vehicles.length) warnings.push(`Brak mapowania kategorii ${row.id_kat ?? '(brak)'}; produkt bez fitmentu.`);
    const productFitments = vehicles.map((vehicle, index) => {
        const brand = uniqueMatch(dictionaries.brands.filter((item) => canonicalBrand(item.name) === vehicle.brand), vehicle.brand);
        const model = vehicle.model === null ? null : uniqueMatch(brand.models.filter((item) =>
            normalizeName(item.name) === vehicle.model), `${vehicle.brand} / ${vehicle.model}`);
        const generation = vehicle.startProduction === null || !model ? null : uniqueMatch(model.carGenerations.filter((item) =>
            item.startProduction === vehicle.startProduction && item.endProduction === vehicle.endProduction),
        `${vehicle.brand} / ${vehicle.model} / ${vehicle.startProduction}–${vehicle.endProduction ?? ''}`);
        return {
            carBrandId: brand.id,
            carModelId: model?.id ?? null,
            carGenerationId: generation?.id ?? null,
            isPrimary: index === 0,
        };
    });

    return {
        data: ImportProductSchema.parse({
            sku: row.nr_kat,
            customName: row.tytul,
            ...measurements.data,
            warehouseLocation: row.pozycja_magazynowa,
            departmentId,
            productFitments,
        }),
        warnings,
        departmentLabel,
        fitmentLabels: vehicles.map((vehicle) => [vehicle.brand, vehicle.model,
            vehicle.startProduction === null ? null : `${vehicle.startProduction}–${vehicle.endProduction ?? ''}`]
            .filter(Boolean).join(' / ')),
    };
}
