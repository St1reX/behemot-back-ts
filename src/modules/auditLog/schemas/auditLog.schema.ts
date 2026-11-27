import { OperationStatus } from '@prisma/client';
import { z } from 'zod';
import { IdParamsSchema } from '../../../shared/schema/commonSchema';
import { ENTITIES, Entity } from '../../../shared/constants/entities';
import { ACTIONS } from '../../../shared/constants/actions';
import { PaginatedListQuerySchema } from '../../../shared/schema/pagination.schema';

export const AuditLogQuerySchema = PaginatedListQuerySchema.extend({
    entityName: z.enum(Object.values(ENTITIES) as [Entity, ...Entity[]]).optional(),
    action: z.nativeEnum(ACTIONS).optional(),
    operationStatus: z.nativeEnum(OperationStatus).optional(),
    from: z.string().datetime({ offset: true }).optional(),
    to: z.string().datetime({ offset: true }).optional(),
}).refine((query) => !query.from || !query.to || new Date(query.from) <= new Date(query.to), {
    message: 'Początek zakresu nie może być późniejszy niż koniec.', path: ['to'],
});

export const AuditLogIdSchema = IdParamsSchema;
export type AuditLogQuery = z.infer<typeof AuditLogQuerySchema>;
