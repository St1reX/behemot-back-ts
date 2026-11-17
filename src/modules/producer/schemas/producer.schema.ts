import { z } from 'zod';

export const ProducerIdSchema = z.object({
    id: z.string().uuid(),
});

export const CreateProducerSchema = z.object({
    name: z.string().min(1).max(100),
});

export type CreateProducerDTO = z.infer<typeof CreateProducerSchema>;

export const UpdateProducerSchema = CreateProducerSchema;

export type UpdateProducerDTO = z.infer<typeof UpdateProducerSchema>;
