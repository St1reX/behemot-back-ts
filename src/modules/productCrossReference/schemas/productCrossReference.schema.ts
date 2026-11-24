import { z } from 'zod';
import { IdParamsSchema, UuidSchema } from '../../../shared/schema/commonSchema';

export const ProductCrossReferenceIdSchema = IdParamsSchema;

export const CreateProductCrossReferenceSchema = z.object({
    productId: UuidSchema,
    contractorId: UuidSchema,
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
