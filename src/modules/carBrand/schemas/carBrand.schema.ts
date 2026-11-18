import { z } from 'zod';

export const CarBrandIdSchema = z.object({
    id: z.string().uuid(),
});

export const CreateCarBrandSchema = z.object({
    name: z.string().trim().min(1, 'Podaj nazwę marki.').max(100, 'Nazwa marki może mieć najwyżej 100 znaków.'),
});

export type CreateCarBrandDTO = z.infer<typeof CreateCarBrandSchema>;

export const UpdateCarBrandSchema = CreateCarBrandSchema;

export type UpdateCarBrandDTO = z.infer<typeof UpdateCarBrandSchema>;
