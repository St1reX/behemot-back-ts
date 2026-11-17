import { z } from 'zod';

export const ProductListingTemplateIdSchema = z.object({
    id: z.string().uuid(),
});

export const CreateProductListingTemplateSchema = z.object({
    name: z.string().min(1).max(100),
    titleTemplate: z.string().min(1),
    summaryTemplate: z.string().min(1),
    descriptionTemplate: z.string().min(1),
    departmentId: z.string().uuid(),
});

export type CreateProductListingTemplateDTO = z.infer<
    typeof CreateProductListingTemplateSchema
>;

export const UpdateProductListingTemplateSchema = CreateProductListingTemplateSchema;

export type UpdateProductListingTemplateDTO = z.infer<
    typeof UpdateProductListingTemplateSchema
>;
