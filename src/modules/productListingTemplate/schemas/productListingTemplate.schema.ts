import { z } from 'zod';
import { isProductListingPlaceholder } from '../constants/productListingPlaceholders';
import { hasListingText, prepareListingHtml } from '../utils/rendering/listingHtml';

function validatePlaceholders(value: string, context: z.RefinementCtx) {
    const remaining = value.replace(/{{\s*([^{}]+?)\s*}}/g, (token, name: string) => {
        if (!isProductListingPlaceholder(name.trim())) {
            context.addIssue({ code: z.ZodIssueCode.custom, message: `Nieznana zmienna: ${token}.` });
        }
        return '';
    });
    if (remaining.includes('{{') || remaining.includes('}}')) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: 'Niepoprawna zmienna. Użyj składni {{nazwa}}.' });
    }
}

const titleTemplateSchema = z.string().trim()
    .refine((value) => !/<\/?[a-z][^>]*>/i.test(value) && !/[\r\n]/.test(value), 'Tytuł musi być tekstem w jednej linii.')
    .superRefine(validatePlaceholders);
const richTemplateSchema = z.string().transform(prepareListingHtml).superRefine(validatePlaceholders);

export const PreviewProductListingTemplateSchema = z.object({
    titleTemplate: titleTemplateSchema,
    summaryTemplate: richTemplateSchema,
    descriptionTemplate: richTemplateSchema,
});

export type PreviewProductListingTemplateDTO = z.infer<typeof PreviewProductListingTemplateSchema>;

export const ProductListingTemplateIdSchema = z.object({
    id: z.string().uuid(),
});

export const CreateProductListingTemplateSchema = z.object({
    name: z.string().trim().min(1).max(100),
    titleTemplate: titleTemplateSchema.refine((value) => value.length > 0, 'Podaj tytuł.'),
    summaryTemplate: richTemplateSchema.refine(hasListingText, 'Podaj skrót opisu.'),
    descriptionTemplate: richTemplateSchema.refine(hasListingText, 'Podaj opis.'),
    departmentId: z.string().uuid(),
});

export type CreateProductListingTemplateDTO = z.infer<
    typeof CreateProductListingTemplateSchema
>;

export const UpdateProductListingTemplateSchema = CreateProductListingTemplateSchema;

export type UpdateProductListingTemplateDTO = z.infer<
    typeof UpdateProductListingTemplateSchema
>;
