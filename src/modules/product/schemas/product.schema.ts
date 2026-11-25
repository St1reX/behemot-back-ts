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
}).strict();

export type CreateProductDTO = z.infer<typeof CreateProductSchema>;

export const UpdateProductSchema = CreateProductSchema;

export type UpdateProductDTO = z.infer<typeof UpdateProductSchema>;

// JSON requests already contain the product; multipart carries it in the data field.
export const CreateProductRequestSchema = z.preprocess((body, context) => {
    if (!body || typeof body !== 'object' || !('data' in body)) return body;

    const multipartBody = z.object({ data: z.string() }).strict().safeParse(body);
    if (!multipartBody.success) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: 'Prześlij dane produktu w polu data.' });
        return z.NEVER;
    }

    try {
        return JSON.parse(multipartBody.data.data);
    } catch {
        context.addIssue({ code: z.ZodIssueCode.custom, message: 'Pole data musi zawierać poprawny JSON produktu.' });
        return z.NEVER;
    }
}, CreateProductSchema);

export const UpdateProductRequestSchema = CreateProductRequestSchema;

// Internal import contract; it is deliberately not exposed by product routes.
export const ImportProductSchema = CreateProductSchema.extend({
    price: decimalSchema.nullable().default(null),
    quantity: z.number().int().nonnegative().nullable().default(null),
    side: z.nativeEnum(PRODUCT_SIDES).nullable().default(null),
    weight: dimensionSchema.nullable().default(null),
    length: dimensionSchema.nullable().default(null),
    width: dimensionSchema.nullable().default(null),
    height: dimensionSchema.nullable().default(null),
    warehouseLocation: z.string().min(1).nullable().default(null),
    warehouseId: UuidSchema.nullable().default(null),
    listingTemplateId: UuidSchema.nullable().default(null),
    departmentId: UuidSchema.nullable().default(null),
    producerId: UuidSchema.nullable().default(null),
    imagesUrls: z.array(imageUrlSchema).default([]),
    descriptionImagesUrls: z.array(imageUrlSchema).default([]),
    oem: z.array(z.string().min(1)).default([]),
    customName: z.string().min(1).max(255).nullable().default(null),
    internalNote: z.string().nullable().default(null),
    ean: z.string().min(1).nullable().default(null),
});

export type ImportProductDTO = z.infer<typeof ImportProductSchema>;
