import { z } from 'zod';

export const CarModelIdSchema = z.object({
    id: z.string().uuid(),
});

export const CarBrandIdParamSchema = z.object({
    carBrandId: z.string().uuid(),
});

export const CreateCarModelSchema = z.object({
    name: z.string().min(1).max(100),
    carBrandId: z.string().uuid(),
});

export type CreateCarModelDTO = z.infer<typeof CreateCarModelSchema>;

export const UpdateCarModelSchema = CreateCarModelSchema;

export type UpdateCarModelDTO = z.infer<typeof UpdateCarModelSchema>;
