import { z } from 'zod';

export const ProductCrossReferenceIdSchema = z.object({
    id: z.string().uuid(),
});

export const CreateProductCrossReferenceSchema = z.object({
    productId: z.string().uuid(),
    contractorId: z.string().uuid(),
    contractorSku: z.string().min(1),
    contractorEan: z.string().min(1).nullable(),
});

export type CreateProductCrossReferenceDTO = z.infer<
    typeof CreateProductCrossReferenceSchema
>;

export const UpdateProductCrossReferenceSchema = CreateProductCrossReferenceSchema;

export type UpdateProductCrossReferenceDTO = z.infer<
    typeof UpdateProductCrossReferenceSchema
>;
