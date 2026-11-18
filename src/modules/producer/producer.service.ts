import { OperationStatus } from '@prisma/client';
import { AppError, ErrorNames } from '../../errors/errorHandler';
import { createAuditLog } from '../../infrastructure/audit/auditLogger';
import { ACTIONS } from '../../shared/constants/actions';
import { ENTITIES } from '../../shared/constants/entities';
import { ProducerRepository } from './repositories/producerRepository';
import { CreateProducerDTO, UpdateProducerDTO } from './schemas/producer.schema';
import { DeleteProducerResponse, ProducerResponse } from './types/producer.types';

export class ProducerService {
    static async getProducers(): Promise<ProducerResponse[]> {
        return ProducerRepository.findAll();
    }

    static async getProducer(producerId: string): Promise<ProducerResponse> {
        const producer = await ProducerRepository.findById(producerId);

        if (!producer) {
            throw new AppError(ErrorNames.RESOURCE_NOT_FOUND, 404, 'Nie znaleziono producenta.');
        }

        return producer;
    }

    static async createProducer(producerData: CreateProducerDTO): Promise<ProducerResponse> {
        await this.ensureProducerNameIsAvailable(producerData.name);

        const createdProducer = await ProducerRepository.create(producerData);

        await createAuditLog({
            entityName: ENTITIES.PRODUCER,
            entityId: createdProducer.id,
            action: ACTIONS.CREATE,
            operationStatus: OperationStatus.SUCCESS,
            dataBefore: null,
            dataAfter: createdProducer,
        });

        return createdProducer;
    }

    static async updateProducer(
        producerId: string,
        producerData: UpdateProducerDTO,
    ): Promise<ProducerResponse> {
        const existingProducer = await this.getProducer(producerId);

        await this.ensureProducerNameIsAvailable(producerData.name, producerId);

        const updatedProducer = await ProducerRepository.update(producerId, producerData);

        await createAuditLog({
            entityName: ENTITIES.PRODUCER,
            entityId: producerId,
            action: ACTIONS.UPDATE,
            operationStatus: OperationStatus.SUCCESS,
            dataBefore: existingProducer,
            dataAfter: updatedProducer,
        });

        return updatedProducer;
    }

    static async deleteProducer(producerId: string): Promise<DeleteProducerResponse> {
        const existingProducer = await this.getProducer(producerId);

        const assignedProductsCount = await ProducerRepository.countAssignedProducts(producerId);

        if (assignedProductsCount > 0) {
            throw new AppError(
                ErrorNames.CONFLICT,
                409,
                'Nie można usunąć producenta przypisanego do produktów.',
            );
        }

        await ProducerRepository.softDelete(producerId);

        await createAuditLog({
            entityName: ENTITIES.PRODUCER,
            entityId: producerId,
            action: ACTIONS.DELETE,
            operationStatus: OperationStatus.SUCCESS,
            dataBefore: existingProducer,
            dataAfter: null,
        });

        return {
            message: 'Producer has been deleted successfully',
        };
    }

    private static async ensureProducerNameIsAvailable(
        producerName: string,
        excludedProducerId?: string,
    ) {
        const existingProducer = await ProducerRepository.findByName(producerName, excludedProducerId);

        if (existingProducer) {
            throw new AppError(ErrorNames.CONFLICT, 409, 'Producent o tej nazwie już istnieje.');
        }
    }
}
