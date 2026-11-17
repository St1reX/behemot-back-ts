import { z } from 'zod';

export const ProductFitmentIdSchema = z.object({
    id: z.string().uuid(),
});

export const CreateProductFitmentSchema = z.object({
    productId: z.string().uuid(),
    carGenerationId: z.string().uuid(),
    isPrimary: z.boolean(),
});

export type CreateProductFitmentDTO = z.infer<typeof CreateProductFitmentSchema>;

export const UpdateProductFitmentSchema = CreateProductFitmentSchema;

export type UpdateProductFitmentDTO = z.infer<typeof UpdateProductFitmentSchema>;
