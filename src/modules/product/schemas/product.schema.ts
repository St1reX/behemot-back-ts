import { z } from 'zod';
import { PRODUCT_SIDES } from '../../../shared/constants/productSides';

const decimalSchema = z.number().nonnegative().max(9999.99).multipleOf(0.01);
const dimensionSchema = decimalSchema.positive();

export const ProductIdSchema = z.object({
    id: z.string().uuid(),
});

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
    warehouseId: z.string().uuid(),
    listingTemplateId: z.string().uuid(),
    departmentId: z.string().uuid(),
    producerId: z.string().uuid(),
});

export type CreateProductDTO = z.infer<typeof CreateProductSchema>;

export const UpdateProductSchema = CreateProductSchema;

export type UpdateProductDTO = z.infer<typeof UpdateProductSchema>;
