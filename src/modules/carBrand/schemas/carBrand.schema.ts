import { z } from 'zod';

export const CarBrandIdSchema = z.object({
    id: z.string().uuid(),
});

export const CreateCarBrandSchema = z.object({
    name: z.string().min(1).max(100),
});

export type CreateCarBrandDTO = z.infer<typeof CreateCarBrandSchema>;

export const UpdateCarBrandSchema = CreateCarBrandSchema;

export type UpdateCarBrandDTO = z.infer<typeof UpdateCarBrandSchema>;
