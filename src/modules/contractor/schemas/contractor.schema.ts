import { z } from 'zod';

export const ContractorIdSchema = z.object({
    id: z.string().uuid(),
});

export const CreateContractorSchema = z.object({
    name: z.string().min(1).max(100),
});

export type CreateContractorDTO = z.infer<typeof CreateContractorSchema>;

export const UpdateContractorSchema = CreateContractorSchema;

export type UpdateContractorDTO = z.infer<typeof UpdateContractorSchema>;
