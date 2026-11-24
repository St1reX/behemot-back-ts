import { Prisma, OperationStatus } from '@prisma/client';
import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../../errors/errorHandler';
import { ACTIONS, Action } from '../../shared/constants/actions';
import { ENTITIES } from '../../shared/constants/entities';
import { UuidSchema } from '../../shared/schema/commonSchema';
import { createAuditLog } from '../../infrastructure/audit/auditLogger';

const actions: Partial<Record<string, Action>> = {
    POST: ACTIONS.CREATE, PUT: ACTIONS.UPDATE, DELETE: ACTIONS.DELETE,
};

export function auditRejectedAdminOperation(
    entityName: typeof ENTITIES.USER | typeof ENTITIES.ROLE,
): ErrorRequestHandler {
    return async (error: unknown, req, _res, next) => {
        const action = req.route?.path === '/:id/privileges' ? ACTIONS.UPDATE : actions[req.method];
        if (!req.user || !req.route || !action) {
            next(error);
            return;
        }

        let reason: string;
        if (error instanceof AppError && error.isOperational && error.statusCode >= 400 && error.statusCode < 500 && error.statusCode !== 401) {
            reason = `HTTP ${error.statusCode}: ${error.message}`;
        } else if (error instanceof ZodError) {
            reason = 'HTTP 422: Nieprawidłowe dane operacji.';
        } else if (error instanceof Prisma.PrismaClientKnownRequestError && ['P2002', 'P2003', 'P2025'].includes(error.code)) {
            reason = `Ograniczenie bazy danych (${error.code}).`;
        } else {
            next(error);
            return;
        }

        let entityId = action === ACTIONS.CREATE ? 'new' : 'unknown';
        try {
            const id = UuidSchema.safeParse(decodeURIComponent(req.path.split('/')[1] ?? ''));
            if (id.success) entityId = id.data;
        } catch {
            // Malformed URL encoding cannot identify an existing record.
            entityId = 'unknown';
        }
        await createAuditLog({
            userId: req.user.id,
            entityName,
            entityId,
            action,
            operationStatus: OperationStatus.FAILED,
            comment: `Odrzucono ${req.method} ${req.route.path}. ${reason}`,
            dataBefore: null,
            dataAfter: null,
        });
        next(error);
    };
}
