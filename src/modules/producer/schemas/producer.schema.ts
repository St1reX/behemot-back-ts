import { z } from 'zod';
import { IdParamsSchema } from '../../../shared/schema/commonSchema';

export const ProducerIdSchema = IdParamsSchema;

export const CreateProducerSchema = z.object({
    name: z.string().min(1).max(100),
});

export type CreateProducerDTO = z.infer<typeof CreateProducerSchema>;

export const UpdateProducerSchema = CreateProducerSchema;

export type UpdateProducerDTO = z.infer<typeof UpdateProducerSchema>;
