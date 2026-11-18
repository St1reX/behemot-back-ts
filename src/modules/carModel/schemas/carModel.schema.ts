import { z } from 'zod';

export const CarModelIdSchema = z.object({
    id: z.string().uuid(),
});

export const CarBrandIdParamSchema = z.object({
    carBrandId: z.string().uuid(),
});

export const CreateCarModelSchema = z.object({
    name: z.string().trim().min(1, 'Podaj nazwę modelu.').max(100, 'Nazwa modelu może mieć najwyżej 100 znaków.'),
    carBrandId: z.string().uuid(),
});

export type CreateCarModelDTO = z.infer<typeof CreateCarModelSchema>;

export const UpdateCarModelSchema = CreateCarModelSchema;

export type UpdateCarModelDTO = z.infer<typeof UpdateCarModelSchema>;
