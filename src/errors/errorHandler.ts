import type { ErrorRequestHandler, NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { errorWinston } from '../config/logger/errorWinston';

export enum ErrorNames {
    VALIDATION_ERROR = 'ValidationError',
    AUTHORIZATION_ERROR = 'AuthorizationError',
    AUTHENTICATION_ERROR = 'AuthenticationError',
    ALREADY_AUTHENTICATED = 'AlreadyAuthenticated',
    RESOURCE_NOT_FOUND = 'ResourceNotFound',
    DATABASE_ERROR = 'DatabaseError',
    INTERNAL_SERVER_ERROR = 'InternalServerError',
    BAD_REQUEST = 'BadRequest',
    FORBIDDEN = 'Forbidden',
    CONFLICT = 'Conflict',
    UNAUTHORIZED = 'Unauthorized',
    TOO_MANY_REQUESTS = 'TooManyRequests',
}

export class AppError extends Error {
    public readonly name: ErrorNames;
    public readonly statusCode: number;
    public readonly isOperational: boolean;

    constructor(name: ErrorNames, statusCode: number, message: string, isOperational = true) {
        super(message);
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = name;
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        Error.captureStackTrace(this);
    }
}

export function notFound(_req: Request, _res: Response, next: NextFunction) {
    next(new AppError(ErrorNames.RESOURCE_NOT_FOUND, 404, 'Nie znaleziono żądanego zasobu.'));
}

function serializeErrorCause(cause: unknown) {
    return cause instanceof Error
        ? { name: cause.name, message: cause.message, stack: cause.stack }
        : cause;
}

export const errorHandler: ErrorRequestHandler = (error: unknown, req, res, next) => {
    if (res.headersSent) {
        next(error);
        return;
    }

    errorWinston.error({
        requestId: req.id || null,
        errorName: error instanceof Error ? error.name : undefined,
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        statusCode: error instanceof AppError ? error.statusCode : undefined,
        cause: error instanceof Error && 'cause' in error ? serializeErrorCause(error.cause) : undefined,
    });

    if (error instanceof ZodError) {
        const issues = error.issues.map((issue) => ({
            path: issue.path.join('.'),
            message: issue.message,
            code: issue.code,
        }));

        res.status(422).json({ error: {
            name: ErrorNames.VALIDATION_ERROR,
            message: [...new Set(issues.map((issue) => issue.message))].join('\n'),
            issues,
        } });
        return;
    }

    if (error instanceof AppError && error.isOperational && error.statusCode < 500) {
        res.status(error.statusCode).json({ error: { name: error.name, message: error.message } });
        return;
    }

    // Constraints also protect against concurrent writes after service-level checks.
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
        switch (error.code) {
            case 'P2002':
                res.status(409).json({ error: {
                    name: ErrorNames.CONFLICT,
                    message: 'Dane są już używane przez inny rekord.',
                } });
                return;
            case 'P2003':
                res.status(409).json({ error: {
                    name: ErrorNames.CONFLICT,
                    message: 'Nie można wykonać operacji z powodu powiązań z innymi danymi.',
                } });
                return;
            case 'P2025':
                res.status(404).json({ error: {
                    name: ErrorNames.RESOURCE_NOT_FOUND,
                    message: 'Nie znaleziono rekordu wymaganego do wykonania operacji.',
                } });
                return;
        }
    }

    // Express body-parser errors use the same contract as application errors.
    if (error instanceof Error && 'type' in error) {
        if (error.type === 'entity.parse.failed') {
            res.status(400).json({ error: {
                name: ErrorNames.BAD_REQUEST,
                message: 'Przesłano nieprawidłowe dane JSON.',
            } });
            return;
        }
        if (error.type === 'entity.too.large') {
            res.status(413).json({ error: {
                name: ErrorNames.BAD_REQUEST,
                message: 'Przesłane dane przekraczają dopuszczalny rozmiar.',
            } });
            return;
        }
    }

    res.status(500).json({ error: {
        name: ErrorNames.INTERNAL_SERVER_ERROR,
        message: 'Wystąpił błąd serwera. Spróbuj ponownie później.',
    } });
};
