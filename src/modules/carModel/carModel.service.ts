import { OperationStatus } from '@prisma/client';
import { PaginatedListQuery } from '../../shared/schema/pagination.schema';
import { PaginatedResponse } from '../../shared/types/pagination.types';
import { AppError, ErrorNames } from '../../errors/errorHandler';
import { createAuditLog } from '../../infrastructure/audit/auditLogger';
import { ACTIONS } from '../../shared/constants/actions';
import { ENTITIES } from '../../shared/constants/entities';
import { CarModelRepository } from './repositories/carModelRepository';
import { CreateCarModelDTO, UpdateCarModelDTO } from './schemas/carModel.schema';
import { CarModelResponse, DeleteCarModelResponse } from './types/carModel.types';

export class CarModelService {
    static async getCarModels(query?: PaginatedListQuery): Promise<CarModelResponse[] | PaginatedResponse<CarModelResponse>> {
        if (!query) return CarModelRepository.findAll();

        const { items, total } = await CarModelRepository.findPage(query);
        return { items, total, page: query.page, pageSize: query.pageSize };
    }

    static async getCarModelsByCarBrand(
        carBrandId: string,
        query?: PaginatedListQuery,
    ): Promise<CarModelResponse[] | PaginatedResponse<CarModelResponse>> {
        await this.ensureCarBrandExists(carBrandId);
        if (!query) return CarModelRepository.findByCarBrand(carBrandId);

        const { items, total } = await CarModelRepository.findPage(query, carBrandId);
        return { items, total, page: query.page, pageSize: query.pageSize };
    }

    static async getCarModel(carModelId: string): Promise<CarModelResponse> {
        const carModel = await CarModelRepository.findById(carModelId);

        if (!carModel) {
            throw new AppError(ErrorNames.RESOURCE_NOT_FOUND, 404, 'Nie znaleziono modelu pojazdu.');
        }

        return carModel;
    }

    static async createCarModel(carModelData: CreateCarModelDTO): Promise<CarModelResponse> {
        await this.ensureCarBrandExists(carModelData.carBrandId);
        await this.ensureCarModelDataIsAvailable(carModelData);

        const createdCarModel = await CarModelRepository.create(carModelData);

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
        if (existingCarModel.carBrand.id !== carModelData.carBrandId && await CarModelRepository.countAssignedFitments(carModelId)) {
            throw new AppError(ErrorNames.CONFLICT, 409, 'Nie można zmienić marki modelu przypisanego do produktów.');
        }
        await this.ensureCarBrandExists(carModelData.carBrandId);
        await this.ensureCarModelDataIsAvailable(carModelData, carModelId);

        const updatedCarModel = await CarModelRepository.update(carModelId, carModelData);

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

        if (await CarModelRepository.countAssignedFitments(carModelId)) {
            throw new AppError(ErrorNames.CONFLICT, 409, 'Nie można usunąć pojazdu przypisanego do produktów.');
        }

        const assignedCarGenerationsCount = await CarModelRepository.countAssignedGenerations(carModelId);

        if (assignedCarGenerationsCount > 0) {
            throw new AppError(
                ErrorNames.CONFLICT,
                409,
                'Nie można usunąć modelu, który ma generacje. Najpierw usuń jego generacje.',
            );
        }

        await CarModelRepository.softDelete(carModelId);

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
        const carBrand = await CarModelRepository.findActiveCarBrand(carBrandId);

        if (!carBrand) {
            throw new AppError(ErrorNames.RESOURCE_NOT_FOUND, 404, 'Nie znaleziono marki pojazdu.');
        }
    }

    private static async ensureCarModelDataIsAvailable(
        carModelData: CreateCarModelDTO,
        excludedCarModelId?: string,
    ) {
        const existingCarModel = await CarModelRepository.findConflictingModel(
            carModelData,
            excludedCarModelId,
        );

        if (existingCarModel) {
            throw new AppError(
                ErrorNames.CONFLICT,
                409,
                'Model o tej nazwie już istnieje w tej marce.',
            );
        }
    }
}
