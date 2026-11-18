import { z } from 'zod';

export const CarGenerationIdSchema = z.object({
    id: z.string().uuid(),
});

export const CarModelIdParamSchema = z.object({
    carModelId: z.string().uuid(),
});

export const CreateCarGenerationSchema = z
    .object({
        startProduction: z.number().int('Podaj pełny rok początku produkcji.')
            .min(1886, 'Początek produkcji nie może być wcześniejszy niż 1886.'),
        endProduction: z.number().int('Podaj pełny rok końca produkcji.')
            .min(1886, 'Koniec produkcji nie może być wcześniejszy niż 1886.').nullable(),
        carModelId: z.string().uuid(),
    })
    .refine(
        (carGenerationData) =>
            carGenerationData.endProduction === null ||
            carGenerationData.endProduction >= carGenerationData.startProduction,
        {
            message: 'Koniec produkcji nie może być wcześniejszy niż początek produkcji.',
            path: ['endProduction'],
        },
    );

export type CreateCarGenerationDTO = z.infer<typeof CreateCarGenerationSchema>;

export const UpdateCarGenerationSchema = CreateCarGenerationSchema;

export type UpdateCarGenerationDTO = z.infer<typeof UpdateCarGenerationSchema>;
