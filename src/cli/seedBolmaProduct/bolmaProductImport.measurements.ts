import { Prisma } from '@prisma/client';
import { ImportProductSchema } from '../../modules/product/schemas/product.schema';
import { BolmaProductRow } from './bolmaProductImport.parser';

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
