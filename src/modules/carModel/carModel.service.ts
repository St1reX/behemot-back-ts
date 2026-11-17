import { OperationStatus } from '@prisma/client';
import { prisma } from '../../config/database';
import { AppError, ErrorNames } from '../../errors/errorHandler';
import { createAuditLog } from '../../infrastructure/audit/auditLogger';
import { ACTIONS } from '../../shared/constants/actions';
import { ENTITIES } from '../../shared/constants/entities';
import { CreateCarModelDTO, UpdateCarModelDTO } from './schemas/carModel.schema';
import { CarModelResponse, DeleteCarModelResponse } from './types/carModel.types';

const carModelSelect = {
    id: true,
    name: true,
    carBrand: {
        select: {
            id: true,
            name: true,
        },
    },
    createdAt: true,
    updatedAt: true,
};

export class CarModelService {
    static async getCarModels(): Promise<CarModelResponse[]> {
        return prisma.carModel.findMany({
            where: {
                deletedAt: null,
                carBrand: {
                    deletedAt: null,
                },
            },
            select: carModelSelect,
            orderBy: [
                {
                    carBrand: {
                        name: 'asc',
                    },
                },
                {
                    name: 'asc',
                },
            ],
        });
    }

    static async getCarModelsByCarBrand(carBrandId: string): Promise<CarModelResponse[]> {
        await this.ensureCarBrandExists(carBrandId);

        return prisma.carModel.findMany({
            where: {
                carBrandId,
                deletedAt: null,
                carBrand: {
                    deletedAt: null,
                },
            },
            select: carModelSelect,
            orderBy: {
                name: 'asc',
            },
        });
    }

    static async getCarModel(carModelId: string): Promise<CarModelResponse> {
        const carModel = await prisma.carModel.findFirst({
            where: {
                id: carModelId,
                deletedAt: null,
                carBrand: {
                    deletedAt: null,
                },
            },
            select: carModelSelect,
        });

        if (!carModel) {
            throw new AppError(ErrorNames.RESOURCE_NOT_FOUND, 404, 'Car model not found');
        }

        return carModel;
    }

    static async createCarModel(carModelData: CreateCarModelDTO): Promise<CarModelResponse> {
        await this.ensureCarBrandExists(carModelData.carBrandId);
        await this.ensureCarModelDataIsAvailable(carModelData);

        const createdCarModel = await prisma.carModel.create({
            data: carModelData,
            select: carModelSelect,
        });

        await createAuditLog({
            entityName: ENTITIES.CAR_MODEL,
            entityId: createdCarModel.id,
            action: ACTIONS.CREATE,
            operationStatus: OperationStatus.SUCCESS,
            dataBefore: null,
            dataAfter: createdCarModel,
        });

        return createdCarModel;
    }

    static async updateCarModel(
        carModelId: string,
        carModelData: UpdateCarModelDTO,
    ): Promise<CarModelResponse> {
        const existingCarModel = await this.getCarModel(carModelId);
        await this.ensureCarBrandExists(carModelData.carBrandId);
        await this.ensureCarModelDataIsAvailable(carModelData, carModelId);

        const updatedCarModel = await prisma.carModel.update({
            where: {
                id: carModelId,
                deletedAt: null,
            },
            data: carModelData,
            select: carModelSelect,
        });

        await createAuditLog({
            entityName: ENTITIES.CAR_MODEL,
            entityId: carModelId,
            action: ACTIONS.UPDATE,
            operationStatus: OperationStatus.SUCCESS,
            dataBefore: existingCarModel,
            dataAfter: updatedCarModel,
        });

        return updatedCarModel;
    }

    static async deleteCarModel(carModelId: string): Promise<DeleteCarModelResponse> {
        const existingCarModel = await this.getCarModel(carModelId);

        const assignedCarGenerationsCount = await prisma.carGeneration.count({
            where: {
                carModelId,
                deletedAt: null,
            },
        });

        if (assignedCarGenerationsCount > 0) {
            throw new AppError(
                ErrorNames.CONFLICT,
                409,
                'Car model cannot be deleted because it is assigned to a car generation',
            );
        }

        await prisma.carModel.update({
            where: {
                id: carModelId,
                deletedAt: null,
            },
            data: {
                deletedAt: new Date(),
            },
        });

        await createAuditLog({
            entityName: ENTITIES.CAR_MODEL,
            entityId: carModelId,
            action: ACTIONS.DELETE,
            operationStatus: OperationStatus.SUCCESS,
            dataBefore: existingCarModel,
            dataAfter: null,
        });

        return {
            message: 'Car model has been deleted successfully',
        };
    }

    private static async ensureCarBrandExists(carBrandId: string) {
        const carBrand = await prisma.carBrand.findFirst({
            where: {
                id: carBrandId,
                deletedAt: null,
            },
            select: {
                id: true,
            },
        });

        if (!carBrand) {
            throw new AppError(ErrorNames.RESOURCE_NOT_FOUND, 404, 'Car brand not found');
        }
    }

    private static async ensureCarModelDataIsAvailable(
        carModelData: CreateCarModelDTO,
        excludedCarModelId?: string,
    ) {
        const existingCarModel = await prisma.carModel.findFirst({
            where: {
                id: excludedCarModelId
                    ? {
                          not: excludedCarModelId,
                      }
                    : undefined,
                deletedAt: null,
                carBrandId: carModelData.carBrandId,
                name: carModelData.name,
            },
            select: {
                id: true,
            },
        });

        if (existingCarModel) {
            throw new AppError(
                ErrorNames.CONFLICT,
                409,
                'Car model name is already in use for this car brand',
            );
        }
    }
}
