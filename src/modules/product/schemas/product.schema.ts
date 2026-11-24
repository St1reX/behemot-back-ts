import { z } from 'zod';
import { IdParamsSchema, UuidSchema } from '../../../shared/schema/commonSchema';
import { PRODUCT_SIDES } from '../../../shared/constants/productSides';
import { ProductFitmentFieldsSchema } from '../../productFitment/schemas/productFitment.schema';

const decimalSchema = z.number().nonnegative().max(9999.99).multipleOf(0.01);
const dimensionSchema = decimalSchema.positive();
const imageUrlSchema = z.string().url().refine((url) => /^https?:\/\//i.test(url), 'Użyj adresu HTTP lub HTTPS.');

export const ProductIdSchema = IdParamsSchema;

export const CreateProductSchema = z.object({
    imagesUrls: z.array(imageUrlSchema),
    descriptionImagesUrls: z.array(imageUrlSchema),
    price: decimalSchema,
    quantity: z.number().int().nonnegative(),
    customName: z.string().min(1).max(255).nullable(),
    customSummary: z.string().nullable().optional(),
    customDescription: z.string().nullable().optional(),
    internalNote: z.string().nullable(),
    side: z.nativeEnum(PRODUCT_SIDES),
    weight: dimensionSchema,
    length: dimensionSchema,
    width: dimensionSchema,
    height: dimensionSchema.nullable(),
    sku: z.string().trim().min(1),
    ean: z.string().min(1).nullable(),
    oem: z.array(z.string().min(1)),
    warehouseLocation: z.string().min(1),
    warehouseId: UuidSchema,
    listingTemplateId: UuidSchema,
    departmentId: UuidSchema,
    producerId: UuidSchema,
    productFitments: z.array(ProductFitmentFieldsSchema).optional().superRefine((fitments, ctx) => {
        if (!fitments) return;
        if (fitments.length && fitments.filter((fitment) => fitment.isPrimary).length !== 1) {
            ctx.addIssue({ code: 'custom', message: 'Wybierz dokładnie jedno główne dopasowanie.' });
        }
        const ids = fitments.flatMap((fitment) => fitment.id ? [fitment.id] : []);
        if (new Set(ids).size !== ids.length) ctx.addIssue({ code: 'custom', message: 'Powtórzone identyfikatory dopasowań.' });
    }),
});

export type CreateProductDTO = z.infer<typeof CreateProductSchema>;

export const UpdateProductSchema = CreateProductSchema;

export type UpdateProductDTO = z.infer<typeof UpdateProductSchema>;
