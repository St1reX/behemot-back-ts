import { OperationStatus } from '@prisma/client';
import { prisma } from '../../config/database';
import { AppError, ErrorNames } from '../../errors/errorHandler';
import { createAuditLog } from '../../infrastructure/audit/auditLogger';
import { ACTIONS } from '../../shared/constants/actions';
import { ENTITIES } from '../../shared/constants/entities';
import { CreateCarBrandDTO, UpdateCarBrandDTO } from './schemas/carBrand.schema';
import { CarBrandResponse, DeleteCarBrandResponse } from './types/carBrand.types';

const carBrandSelect = {
    id: true,
    name: true,
    createdAt: true,
    updatedAt: true,
};

export class CarBrandService {
    static async getCarBrands(): Promise<CarBrandResponse[]> {
        return prisma.carBrand.findMany({
            where: {
                deletedAt: null,
            },
            select: carBrandSelect,
            orderBy: {
                name: 'asc',
            },
        });
    }

    static async getCarBrand(carBrandId: string): Promise<CarBrandResponse> {
        const carBrand = await prisma.carBrand.findFirst({
            where: {
                id: carBrandId,
                deletedAt: null,
            },
            select: carBrandSelect,
        });

        if (!carBrand) {
            throw new AppError(ErrorNames.RESOURCE_NOT_FOUND, 404, 'Car brand not found');
        }

        return carBrand;
    }

    static async createCarBrand(carBrandData: CreateCarBrandDTO): Promise<CarBrandResponse> {
        await this.ensureCarBrandNameIsAvailable(carBrandData.name);

        const createdCarBrand = await prisma.carBrand.create({
            data: carBrandData,
            select: carBrandSelect,
        });

        await createAuditLog({
            entityName: ENTITIES.CAR_BRAND,
            entityId: createdCarBrand.id,
            action: ACTIONS.CREATE,
            operationStatus: OperationStatus.SUCCESS,
            dataBefore: null,
            dataAfter: createdCarBrand,
        });

        return createdCarBrand;
    }

    static async updateCarBrand(
        carBrandId: string,
        carBrandData: UpdateCarBrandDTO,
    ): Promise<CarBrandResponse> {
        const existingCarBrand = await this.getCarBrand(carBrandId);

        await this.ensureCarBrandNameIsAvailable(carBrandData.name, carBrandId);

        const updatedCarBrand = await prisma.carBrand.update({
            where: {
                id: carBrandId,
                deletedAt: null,
            },
            data: carBrandData,
            select: carBrandSelect,
        });

        await createAuditLog({
            entityName: ENTITIES.CAR_BRAND,
            entityId: carBrandId,
            action: ACTIONS.UPDATE,
            operationStatus: OperationStatus.SUCCESS,
            dataBefore: existingCarBrand,
            dataAfter: updatedCarBrand,
        });

        return updatedCarBrand;
    }

    static async deleteCarBrand(carBrandId: string): Promise<DeleteCarBrandResponse> {
        const existingCarBrand = await this.getCarBrand(carBrandId);

        const assignedCarModelsCount = await prisma.carModel.count({
            where: {
                carBrandId,
                deletedAt: null,
            },
        });

        if (assignedCarModelsCount > 0) {
            throw new AppError(
                ErrorNames.CONFLICT,
                409,
                'Car brand cannot be deleted because it is assigned to a car model',
            );
        }

        await prisma.carBrand.update({
            where: {
                id: carBrandId,
                deletedAt: null,
            },
            data: {
                deletedAt: new Date(),
            },
        });

        await createAuditLog({
            entityName: ENTITIES.CAR_BRAND,
            entityId: carBrandId,
            action: ACTIONS.DELETE,
            operationStatus: OperationStatus.SUCCESS,
            dataBefore: existingCarBrand,
            dataAfter: null,
        });

        return {
            message: 'Car brand has been deleted successfully',
        };
    }

    private static async ensureCarBrandNameIsAvailable(
        carBrandName: string,
        excludedCarBrandId?: string,
    ) {
        const existingCarBrand = await prisma.carBrand.findFirst({
            where: {
                id: excludedCarBrandId
                    ? {
                          not: excludedCarBrandId,
                      }
                    : undefined,
                deletedAt: null,
                name: carBrandName,
            },
            select: {
                id: true,
            },
        });

        if (existingCarBrand) {
            throw new AppError(ErrorNames.CONFLICT, 409, 'Car brand name is already in use');
        }
    }
}
