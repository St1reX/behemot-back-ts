import { z } from 'zod';
import { IdParamsSchema, UuidSchema } from '../../../shared/schema/commonSchema';

export const ProductFitmentIdSchema = IdParamsSchema;

export const CreateProductFitmentSchema = z.object({
    productId: UuidSchema,
    carGenerationId: UuidSchema,
    isPrimary: z.boolean(),
});

export type CreateProductFitmentDTO = z.infer<typeof CreateProductFitmentSchema>;

export const UpdateProductFitmentSchema = CreateProductFitmentSchema;

export type UpdateProductFitmentDTO = z.infer<typeof UpdateProductFitmentSchema>;
