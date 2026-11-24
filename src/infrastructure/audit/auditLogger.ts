import { Entity } from '../../shared/constants/entities';
import { Action, ACTIONS } from '../../shared/constants/actions';
import { AuditRepository } from './repositories/auditRepository';
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

type AuditLogInput = Omit<LogEntry, 'userId' | 'isSuspicious' | 'suspiciousReason' | 'createdAt'> & {
    userId?: string;
};

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
    // Rejected operations are expected to leave the stored data unchanged.
    if (log.operationStatus !== OperationStatus.SUCCESS) {
        return { isSuspicious: false };
    }
    for (const rule of suspicionRules) {
        const reason = rule(log);
        if (reason) {
            return { isSuspicious: true, suspiciousReason: reason };
        }
    }
    return { isSuspicious: false };
}

function prepareAuditLog(log: AuditLogInput): LogEntry | null {
    const requestContext = getRequestContext();

    const userId = log.userId ?? requestContext?.userId;

    if (!userId) {
        appWinston.error('Error while saving AUDIT LOG: userId is missing');
        return null;
    }

    const logWithRequestContext = {
        sourceIp: requestContext?.sourceIp,
        requestId: requestContext?.requestId,
        ...log,
        userId,
    };

    return {
        ...logWithRequestContext,
        ...analyzeSuspicion(logWithRequestContext),
        createdAt: new Date(),
    };
}

export async function createAuditLog(log: AuditLogInput) {
    try {
        const fullLog = prepareAuditLog(log);
        if (fullLog) await AuditRepository.create(fullLog);
    } catch (error) {
        appWinston.error('Error while saving AUDIT LOG: ', error);
    }
}

export async function createAuditLogs(logs: AuditLogInput[]) {
    if (logs.length === 0) return;

    try {
        const fullLogs = logs.map(prepareAuditLog).filter((log): log is LogEntry => log !== null);
        if (fullLogs.length > 0) await AuditRepository.createMany(fullLogs);
    } catch (error) {
        appWinston.error('Error while saving AUDIT LOG: ', error);
    }
}
