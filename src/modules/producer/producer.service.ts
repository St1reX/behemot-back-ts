import { OperationStatus } from '@prisma/client';
import { prisma } from '../../config/database';
import { AppError, ErrorNames } from '../../errors/errorHandler';
import { createAuditLog } from '../../infrastructure/audit/auditLogger';
import { ACTIONS } from '../../shared/constants/actions';
import { ENTITIES } from '../../shared/constants/entities';
import { CreateProducerDTO, UpdateProducerDTO } from './schemas/producer.schema';
import { DeleteProducerResponse, ProducerResponse } from './types/producer.types';

const producerSelect = {
    id: true,
    name: true,
    createdAt: true,
    updatedAt: true,
};

export class ProducerService {
    static async getProducers(): Promise<ProducerResponse[]> {
        return prisma.producer.findMany({
            where: {
                deletedAt: null,
            },
            select: producerSelect,
            orderBy: {
                name: 'asc',
            },
        });
    }

    static async getProducer(producerId: string): Promise<ProducerResponse> {
        const producer = await prisma.producer.findFirst({
            where: {
                id: producerId,
                deletedAt: null,
            },
            select: producerSelect,
        });

        if (!producer) {
            throw new AppError(ErrorNames.RESOURCE_NOT_FOUND, 404, 'Producer not found');
        }

        return producer;
    }

    static async createProducer(producerData: CreateProducerDTO): Promise<ProducerResponse> {
        await this.ensureProducerNameIsAvailable(producerData.name);

        const createdProducer = await prisma.producer.create({
            data: producerData,
            select: producerSelect,
        });

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

        const updatedProducer = await prisma.producer.update({
            where: {
                id: producerId,
                deletedAt: null,
            },
            data: producerData,
            select: producerSelect,
        });

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

        const assignedProductsCount = await prisma.product.count({
            where: {
                producerId,
                deletedAt: null,
            },
        });

        if (assignedProductsCount > 0) {
            throw new AppError(
                ErrorNames.CONFLICT,
                409,
                'Producer cannot be deleted because it is assigned to a product',
            );
        }

        await prisma.producer.update({
            where: {
                id: producerId,
                deletedAt: null,
            },
            data: {
                deletedAt: new Date(),
            },
        });

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
        const existingProducer = await prisma.producer.findFirst({
            where: {
                id: excludedProducerId
                    ? {
                          not: excludedProducerId,
                      }
                    : undefined,
                deletedAt: null,
                name: producerName,
            },
            select: {
                id: true,
            },
        });

        if (existingProducer) {
            throw new AppError(ErrorNames.CONFLICT, 409, 'Producer name is already in use');
        }
    }
}
