import { OperationStatus } from '@prisma/client';
import { prisma } from '../../config/database';
import { AppError, ErrorNames } from '../../errors/errorHandler';
import { createAuditLog } from '../../infrastructure/audit/auditLogger';
import { ACTIONS } from '../../shared/constants/actions';
import { ENTITIES } from '../../shared/constants/entities';
import {
    CreateCarGenerationDTO,
    UpdateCarGenerationDTO,
} from './schemas/carGeneration.schema';
import {
    CarGenerationResponse,
    DeleteCarGenerationResponse,
} from './types/carGeneration.types';

const carGenerationSelect = {
    id: true,
    startProduction: true,
    endProduction: true,
    carModel: {
        select: {
            id: true,
            name: true,
            carBrand: {
                select: {
                    id: true,
                    name: true,
                },
            },
        },
    },
    createdAt: true,
    updatedAt: true,
};

export class CarGenerationService {
    static async getCarGenerations(): Promise<CarGenerationResponse[]> {
        return prisma.carGeneration.findMany({
            where: {
                deletedAt: null,
                carModel: {
                    deletedAt: null,
                    carBrand: {
                        deletedAt: null,
                    },
                },
            },
            select: carGenerationSelect,
            orderBy: [
                {
                    carModel: {
                        carBrand: {
                            name: 'asc',
                        },
                    },
                },
                {
                    carModel: {
                        name: 'asc',
                    },
                },
                {
                    startProduction: 'desc',
                },
            ],
        });
    }

    static async getCarGenerationsByCarModel(
        carModelId: string,
    ): Promise<CarGenerationResponse[]> {
        await this.ensureCarModelExists(carModelId);

        return prisma.carGeneration.findMany({
            where: {
                carModelId,
                deletedAt: null,
                carModel: {
                    deletedAt: null,
                    carBrand: {
                        deletedAt: null,
                    },
                },
            },
            select: carGenerationSelect,
            orderBy: {
                startProduction: 'desc',
            },
        });
    }

    static async getCarGeneration(carGenerationId: string): Promise<CarGenerationResponse> {
        const carGeneration = await prisma.carGeneration.findFirst({
            where: {
                id: carGenerationId,
                deletedAt: null,
                carModel: {
                    deletedAt: null,
                    carBrand: {
                        deletedAt: null,
                    },
                },
            },
            select: carGenerationSelect,
        });

        if (!carGeneration) {
            throw new AppError(ErrorNames.RESOURCE_NOT_FOUND, 404, 'Car generation not found');
        }

        return carGeneration;
    }

    static async createCarGeneration(
        carGenerationData: CreateCarGenerationDTO,
    ): Promise<CarGenerationResponse> {
        await this.ensureCarModelExists(carGenerationData.carModelId);
        await this.ensureCarGenerationDataIsAvailable(carGenerationData);

        const createdCarGeneration = await prisma.carGeneration.create({
            data: carGenerationData,
            select: carGenerationSelect,
        });

        await createAuditLog({
            entityName: ENTITIES.CAR_GENERATION,
            entityId: createdCarGeneration.id,
            action: ACTIONS.CREATE,
            operationStatus: OperationStatus.SUCCESS,
            dataBefore: null,
            dataAfter: createdCarGeneration,
        });

        return createdCarGeneration;
    }

    static async updateCarGeneration(
        carGenerationId: string,
        carGenerationData: UpdateCarGenerationDTO,
    ): Promise<CarGenerationResponse> {
        const existingCarGeneration = await this.getCarGeneration(carGenerationId);

        await this.ensureCarModelExists(carGenerationData.carModelId);
        await this.ensureCarGenerationDataIsAvailable(carGenerationData, carGenerationId);

        const updatedCarGeneration = await prisma.carGeneration.update({
            where: {
                id: carGenerationId,
                deletedAt: null,
            },
            data: carGenerationData,
            select: carGenerationSelect,
        });

        await createAuditLog({
            entityName: ENTITIES.CAR_GENERATION,
            entityId: carGenerationId,
            action: ACTIONS.UPDATE,
            operationStatus: OperationStatus.SUCCESS,
            dataBefore: existingCarGeneration,
            dataAfter: updatedCarGeneration,
        });

        return updatedCarGeneration;
    }

    static async deleteCarGeneration(
        carGenerationId: string,
    ): Promise<DeleteCarGenerationResponse> {
        const existingCarGeneration = await this.getCarGeneration(carGenerationId);

        const assignedProductFitmentsCount = await prisma.productFitment.count({
            where: {
                carGenerationId,
                deletedAt: null,
            },
        });

        if (assignedProductFitmentsCount > 0) {
            throw new AppError(
                ErrorNames.CONFLICT,
                409,
                'Car generation cannot be deleted because it is assigned to a product fitment',
            );
        }

        await prisma.carGeneration.update({
            where: {
                id: carGenerationId,
                deletedAt: null,
            },
            data: {
                deletedAt: new Date(),
            },
        });

        await createAuditLog({
            entityName: ENTITIES.CAR_GENERATION,
            entityId: carGenerationId,
            action: ACTIONS.DELETE,
            operationStatus: OperationStatus.SUCCESS,
            dataBefore: existingCarGeneration,
            dataAfter: null,
        });

        return {
            message: 'Car generation has been deleted successfully',
        };
    }

    private static async ensureCarModelExists(carModelId: string) {
        const carModel = await prisma.carModel.findFirst({
            where: {
                id: carModelId,
                deletedAt: null,
                carBrand: {
                    deletedAt: null,
                },
            },
            select: {
                id: true,
            },
        });

        if (!carModel) {
            throw new AppError(ErrorNames.RESOURCE_NOT_FOUND, 404, 'Car model not found');
        }
    }

    private static async ensureCarGenerationDataIsAvailable(
        carGenerationData: CreateCarGenerationDTO,
        excludedCarGenerationId?: string,
    ) {
        const existingCarGeneration = await prisma.carGeneration.findFirst({
            where: {
                id: excludedCarGenerationId
                    ? {
                          not: excludedCarGenerationId,
                      }
                    : undefined,
                deletedAt: null,
                carModelId: carGenerationData.carModelId,
                startProduction: carGenerationData.startProduction,
                endProduction: carGenerationData.endProduction,
            },
            select: {
                id: true,
            },
        });

        if (existingCarGeneration) {
            throw new AppError(
                ErrorNames.CONFLICT,
                409,
                'Car generation years are already in use for this car model',
            );
        }
    }
}
