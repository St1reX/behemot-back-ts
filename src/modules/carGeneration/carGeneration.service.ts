import { OperationStatus } from '@prisma/client';
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
    static async getCarGenerations(): Promise<CarGenerationResponse[]> {
        return CarGenerationRepository.findAll();
    }

    static async getCarGenerationsByCarModel(
        carModelId: string,
    ): Promise<CarGenerationResponse[]> {
        await this.ensureCarModelExists(carModelId);

        return CarGenerationRepository.findByCarModel(carModelId);
    }

    static async getCarGeneration(carGenerationId: string): Promise<CarGenerationResponse> {
        const carGeneration = await CarGenerationRepository.findById(carGenerationId);

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
                'Car generation cannot be deleted because it is assigned to a product fitment',
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
            throw new AppError(ErrorNames.RESOURCE_NOT_FOUND, 404, 'Car model not found');
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
                'Car generation years are already in use for this car model',
            );
        }
    }
}
