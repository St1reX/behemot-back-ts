import { z } from 'zod';

export const BolmaImportRequestSchema = z.object({
    confirmed: z.literal(true),
}).strict();
