import { OperationStatus } from '@prisma/client';
import { z } from 'zod';
import { ENTITIES, Entity } from '../../../shared/constants/entities';

export const AuditLogQuerySchema = z.object({
    page: z.coerce.number().int().min(1).max(100000).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(25),
    search: z.string().trim().max(100).optional(),
    entityName: z.enum(Object.values(ENTITIES) as [Entity, ...Entity[]]).optional(),
    action: z.enum(['CREATE', 'UPDATE', 'DELETE', 'READ']).optional(),
    operationStatus: z.nativeEnum(OperationStatus).optional(),
    from: z.string().datetime({ offset: true }).optional(),
    to: z.string().datetime({ offset: true }).optional(),
}).refine((query) => !query.from || !query.to || new Date(query.from) <= new Date(query.to), {
    message: 'Początek zakresu nie może być późniejszy niż koniec.', path: ['to'],
});

export const AuditLogIdSchema = z.object({ id: z.string().uuid() });
export type AuditLogQuery = z.infer<typeof AuditLogQuerySchema>;
