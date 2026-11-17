import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { errorWinston } from '../config/logger/errorWinston';
import { ZodError } from 'zod';
import { isDevelopment } from '../config/env';

type PrismaError =
    | Prisma.PrismaClientKnownRequestError
    | Prisma.PrismaClientUnknownRequestError
    | Prisma.PrismaClientRustPanicError
    | Prisma.PrismaClientInitializationError
    | Prisma.PrismaClientValidationError;

export enum ErrorNames {
    VALIDATION_ERROR = 'ValidationError',
    AUTHORIZATION_ERROR = 'AuthorizationError',
    AUTHENTICATION_ERROR = 'AuthenticationError',
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

    constructor(
        name: ErrorNames,
        statusCode: number,
        description: string,
        isOperational: boolean = true,
    ) {
        super(description);
        Object.setPrototypeOf(this, new.target.prototype);

        this.name = name;
        this.statusCode = statusCode;
        this.isOperational = isOperational;

        Error.captureStackTrace(this);
    }
}

export function isPrismaError(e: any): e is PrismaError {
    return (
        e instanceof Prisma.PrismaClientKnownRequestError ||
        e instanceof Prisma.PrismaClientUnknownRequestError ||
        e instanceof Prisma.PrismaClientRustPanicError ||
        e instanceof Prisma.PrismaClientInitializationError ||
        e instanceof Prisma.PrismaClientValidationError
    );
}

export function isAppError(err: any): err is AppError {
    return (
        typeof err === 'object' &&
        err !== null &&
        err.constructor?.name === 'AppError' &&
        'statusCode' in err &&
        'isOperational' in err
    );
}

export class ErrorHandler {
    static notFound(req: Request, res: Response, next: NextFunction) {
        res.status(404).json({ message: 'Resource not found!' });
        return;
    }
}

function serializeErrorCause(cause: unknown) {
    if (cause instanceof Error) {
        return {
            name: cause.name,
            message: cause.message,
            stack: cause.stack,
        };
    }

    return cause;
}

export function errorHandler(
    err: AppError | Error | ZodError | Prisma.PrismaClientUnknownRequestError,
    req: Request,
    res: Response,
    next: NextFunction,
) {
    errorWinston.error({
        requestId: req.id || null,
        constructorName: err?.constructor?.name,
        errorName: err?.name,
        message: err.message,
        stack: err.stack,
        statusCode: 'statusCode' in err ? (err as any).statusCode : undefined,
        cause: 'cause' in err ? serializeErrorCause(err.cause) : undefined,
    });

    if (isPrismaError(err)) {
        let code = '';
        if (err! instanceof Prisma.PrismaClientUnknownRequestError) {
            // @ts-expect-error
            code = err.code;
        } else {
            code = 'unknown';
        }

        if (!isDevelopment) {
            res.status(500).json({ message: 'Internal Server Error' });
            return;
        } else {
            res.status(500).json({
                name: err.name,
                code,
                message: err.message,
                stack: err.stack,
            });
            return;
        }
    }

    if (err instanceof ZodError) {
        res.status(422).json({
            error: err.issues.map((issue) => ({
                path: issue.path.join('.'),
                message: issue.message,
                code: issue.code,
            })),
        });
        return;
    }

    if (isAppError(err)) {
        if (err.statusCode !== 500) {
            res.status(err.statusCode).json({
                error: {
                    message: err.message,
                    name: err.name,
                },
            });
            return;
        } else {
            if (!isDevelopment) {
                res.status(500).json({
                    error: {
                        message: 'Internal Server Error',
                    },
                });
            } else {
                res.status(500).json({
                    error: {
                        message: err.message,
                        name: err.name,
                    },
                });
            }
            return;
        }
    } else {
        if (!isDevelopment) {
            res.status(500).json({
                error: {
                    message: 'Internal Server Error',
                },
            });
        } else {
            res.status(500).json({
                error: {
                    message: err.message,
                    name: err.name,
                },
            });
        }
        return;
    }
}
