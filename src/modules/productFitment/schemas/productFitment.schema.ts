import { z } from 'zod';
import { IdParamsSchema, UuidSchema } from '../../../shared/schema/commonSchema';

export const ProductFitmentIdSchema = IdParamsSchema;

export const ProductFitmentFieldsSchema = z.object({
    id: UuidSchema.optional(),
    carBrandId: UuidSchema.nullable().default(null),
    carModelId: UuidSchema.nullable().default(null),
    carGenerationId: UuidSchema.nullable().default(null),
    isPrimary: z.boolean(),
});

export const CreateProductFitmentSchema = ProductFitmentFieldsSchema.omit({ id: true }).extend({
    productId: UuidSchema,
}).refine((value) => value.carBrandId || value.carModelId || value.carGenerationId, {
    message: 'Wybierz przynajmniej markę pojazdu.', path: ['carBrandId'],
});

export type CreateProductFitmentDTO = z.infer<typeof CreateProductFitmentSchema>;

export const UpdateProductFitmentSchema = CreateProductFitmentSchema;

export type UpdateProductFitmentDTO = z.infer<typeof UpdateProductFitmentSchema>;
