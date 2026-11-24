import { OperationStatus } from '@prisma/client';
import { PaginatedListQuery } from '../../shared/schema/pagination.schema';
import { PaginatedResponse } from '../../shared/types/pagination.types';
import { AppError, ErrorNames } from '../../errors/errorHandler';
import { createAuditLog } from '../../infrastructure/audit/auditLogger';
import { ACTIONS } from '../../shared/constants/actions';
import { ENTITIES } from '../../shared/constants/entities';
import { CarGenerationRepository } from './repositories/carGenerationRepository';
import {
    CreateCarGenerationDTO,
    UpdateCarGenerationDTO,
} from './schemas/carGeneration.schema';
import {
    CarGenerationResponse,
    DeleteCarGenerationResponse,
} from './types/carGeneration.types';

export class CarGenerationService {
    static async getCarGenerations(query?: PaginatedListQuery): Promise<CarGenerationResponse[] | PaginatedResponse<CarGenerationResponse>> {
        if (!query) return CarGenerationRepository.findAll();

        const { items, total } = await CarGenerationRepository.findPage(query);
        return { items, total, page: query.page, pageSize: query.pageSize };
    }

    static async getCarGenerationsByCarModel(
        carModelId: string,
        query?: PaginatedListQuery,
    ): Promise<CarGenerationResponse[] | PaginatedResponse<CarGenerationResponse>> {
        await this.ensureCarModelExists(carModelId);
        if (!query) return CarGenerationRepository.findByCarModel(carModelId);

        const { items, total } = await CarGenerationRepository.findPage(query, carModelId);
        return { items, total, page: query.page, pageSize: query.pageSize };
    }

    static async getCarGeneration(carGenerationId: string): Promise<CarGenerationResponse> {
        const carGeneration = await CarGenerationRepository.findById(carGenerationId);

        if (!carGeneration) {
            throw new AppError(ErrorNames.RESOURCE_NOT_FOUND, 404, 'Nie znaleziono generacji pojazdu.');
        }

        return carGeneration;
    }

    static async createCarGeneration(
        carGenerationData: CreateCarGenerationDTO,
    ): Promise<CarGenerationResponse> {
        await this.ensureCarModelExists(carGenerationData.carModelId);
        await this.ensureCarGenerationDataIsAvailable(carGenerationData);

        const createdCarGeneration = await CarGenerationRepository.create(carGenerationData);

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

        const updatedCarGeneration = await CarGenerationRepository.update(carGenerationId, carGenerationData);

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

        const assignedProductFitmentsCount = await CarGenerationRepository.countAssignedFitments(
            carGenerationId,
        );

        if (assignedProductFitmentsCount > 0) {
            throw new AppError(
                ErrorNames.CONFLICT,
                409,
                'Nie można usunąć generacji przypisanej do produktów.',
            );
        }

        await CarGenerationRepository.softDelete(carGenerationId);

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
        const carModel = await CarGenerationRepository.findActiveCarModel(carModelId);

        if (!carModel) {
            throw new AppError(ErrorNames.RESOURCE_NOT_FOUND, 404, 'Nie znaleziono modelu pojazdu.');
        }
    }

    private static async ensureCarGenerationDataIsAvailable(
        carGenerationData: CreateCarGenerationDTO,
        excludedCarGenerationId?: string,
    ) {
        const existingCarGeneration = await CarGenerationRepository.findConflictingGeneration(
            carGenerationData,
            excludedCarGenerationId,
        );

        if (existingCarGeneration) {
            throw new AppError(
                ErrorNames.CONFLICT,
                409,
                'Generacja o tych latach produkcji już istnieje w tym modelu.',
            );
        }
    }
}
