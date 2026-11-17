import { z } from 'zod';

export const CarGenerationIdSchema = z.object({
    id: z.string().uuid(),
});

export const CarModelIdParamSchema = z.object({
    carModelId: z.string().uuid(),
});

export const CreateCarGenerationSchema = z
    .object({
        startProduction: z.number().int().min(1886),
        endProduction: z.number().int().min(1886).nullable(),
        carModelId: z.string().uuid(),
    })
    .refine(
        (carGenerationData) =>
            carGenerationData.endProduction === null ||
            carGenerationData.endProduction >= carGenerationData.startProduction,
        {
            message: 'End production year cannot be earlier than start production year',
            path: ['endProduction'],
        },
    );

export type CreateCarGenerationDTO = z.infer<typeof CreateCarGenerationSchema>;

export const UpdateCarGenerationSchema = CreateCarGenerationSchema;

export type UpdateCarGenerationDTO = z.infer<typeof UpdateCarGenerationSchema>;
