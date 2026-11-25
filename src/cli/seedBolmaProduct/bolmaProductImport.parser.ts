import { z } from 'zod';

const nullableText = z.string().nullable().transform((value) => value?.trim() || null);

// Actual products columns, also used by Monday's externalProductsSync cron.
export const BolmaProductRowSchema = z.object({
    id: z.union([
        z.number().int().positive().safe().transform(String),
        z.string().regex(/^[1-9]\d*$/u),
    ]),
    nr_kat: nullableText,
    id_kat: nullableText,
    pozycja_magazynowa: nullableText,
    department_sign: nullableText.transform((value) => value?.toUpperCase() ?? null),
});

export type BolmaProductRow = z.infer<typeof BolmaProductRowSchema>;

export function parseBolmaProductRow(row: unknown): BolmaProductRow {
    return BolmaProductRowSchema.parse(row);
}
