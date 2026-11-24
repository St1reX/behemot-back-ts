import { z } from 'zod';
import { IdParamsSchema } from '../../../shared/schema/commonSchema';

export const ContractorIdSchema = IdParamsSchema;

export const CreateContractorSchema = z.object({
    name: z.string().min(1).max(100),
});

export type CreateContractorDTO = z.infer<typeof CreateContractorSchema>;

export const UpdateContractorSchema = CreateContractorSchema;

export type UpdateContractorDTO = z.infer<typeof UpdateContractorSchema>;
