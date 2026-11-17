import { Entity } from '../../shared/constants/entities';
import { Action, ACTIONS } from '../../shared/constants/actions';
import { prisma } from '../../config/database';
import { OperationStatus } from '@prisma/client';
import { appWinston } from '../../config/logger/appWinston';
import { getRequestContext } from '../requestContext/requestContext';

// Interfejs loga
interface LogEntry {
    userId: string;
    entityName: Entity;
    entityId: string;
    action: Action;
    operationStatus: OperationStatus;
    comment?: string;
    dataBefore?: any | null;
    dataAfter?: any | null;
    sourceIp?: string;
    isSuspicious?: boolean;
    suspiciousReason?: string;
    requestId?: string;
    createdAt?: Date;
}

type SuspicionRule = (log: LogEntry) => string | null;
const suspicionRules: SuspicionRule[] = [
    (log) => {
        if (log.action === ACTIONS.DELETE && log.dataAfter !== null) {
            return 'The dataAfter field should be null on DELETE action';
        }
        return null;
    },
    (log) => {
        if (
            log.action === ACTIONS.UPDATE &&
            JSON.stringify(log.dataBefore) === JSON.stringify(log.dataAfter)
        ) {
            return 'UPDATE action did not change any data';
        }
        return null;
    },
    (log) => {
        if (log.action === ACTIONS.CREATE && log.dataBefore !== null) {
            return 'The dataBefore field should be null on CREATE action';
        }
        return null;
    },
];

function analyzeSuspicion(log: LogEntry): {
    isSuspicious: boolean;
    suspiciousReason?: string;
} {
    for (const rule of suspicionRules) {
        const reason = rule(log);
        if (reason) {
            return { isSuspicious: true, suspiciousReason: reason };
        }
    }
    return { isSuspicious: false };
}

export async function createAuditLog(
    log: Omit<LogEntry, 'userId' | 'isSuspicious' | 'suspiciousReason' | 'createdAt'> & {
        userId?: string;
    },
) {
    const requestContext = getRequestContext();

    const userId = log.userId ?? requestContext?.userId;

    if (!userId) {
        appWinston.error('Error while saving AUDIT LOG: userId is missing');
        return;
    }

    const logWithRequestContext = {
        sourceIp: requestContext?.sourceIp,
        requestId: requestContext?.requestId,
        ...log,
        userId,
    };

    const suspicionResult = analyzeSuspicion(logWithRequestContext);

    const fullLog: LogEntry = {
        ...logWithRequestContext,
        isSuspicious: suspicionResult.isSuspicious,
        suspiciousReason: suspicionResult.suspiciousReason,
        createdAt: new Date(),
    };

    try {
        await prisma.log.create({ data: fullLog });
    } catch (error) {
        appWinston.error('Error while saving AUDIT LOG: ', error);
    }
}
