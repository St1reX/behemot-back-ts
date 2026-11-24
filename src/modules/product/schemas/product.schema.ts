import { z } from 'zod';
import { IdParamsSchema, UuidSchema } from '../../../shared/schema/commonSchema';
import { PRODUCT_SIDES } from '../../../shared/constants/productSides';

const decimalSchema = z.number().nonnegative().max(9999.99).multipleOf(0.01);
const dimensionSchema = decimalSchema.positive();

export const ProductIdSchema = IdParamsSchema;

export const CreateProductSchema = z.object({
    imagesUrls: z.array(z.string().url()),
    descriptionImagesUrls: z.array(z.string().url()),
    price: decimalSchema,
    quantity: z.number().int().nonnegative(),
    customName: z.string().min(1).max(255).nullable(),
    internalNote: z.string().nullable(),
    side: z.nativeEnum(PRODUCT_SIDES),
    weight: dimensionSchema,
    length: dimensionSchema,
    width: dimensionSchema,
    height: dimensionSchema.nullable(),
    sku: z.string().min(1),
    ean: z.string().min(1).nullable(),
    oem: z.array(z.string().min(1)),
    warehouseLocation: z.string().min(1),
    warehouseId: UuidSchema,
    listingTemplateId: UuidSchema,
    departmentId: UuidSchema,
    producerId: UuidSchema,
});

export type CreateProductDTO = z.infer<typeof CreateProductSchema>;

export const UpdateProductSchema = CreateProductSchema;

export type UpdateProductDTO = z.infer<typeof UpdateProductSchema>;
