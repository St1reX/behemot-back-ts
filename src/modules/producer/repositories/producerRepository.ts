import { prisma } from '../../../config/database';
import { CreateProducerDTO, UpdateProducerDTO } from '../schemas/producer.schema';

const producerSelect = {
    id: true,
    name: true,
    createdAt: true,
    updatedAt: true,
};

export class ProducerRepository {
    static findAll() {
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

    static findById(producerId: string) {
        return prisma.producer.findFirst({
            where: {
                id: producerId,
                deletedAt: null,
            },
            select: producerSelect,
        });
    }

    static create(producerData: CreateProducerDTO) {
        return prisma.producer.create({
            data: producerData,
            select: producerSelect,
        });
    }

    static update(producerId: string, producerData: UpdateProducerDTO) {
        return prisma.producer.update({
            where: {
                id: producerId,
                deletedAt: null,
            },
            data: producerData,
            select: producerSelect,
        });
    }

    static countAssignedProducts(producerId: string) {
        return prisma.product.count({
            where: {
                producerId,
                deletedAt: null,
            },
        });
    }

    static softDelete(producerId: string) {
        return prisma.producer.update({
            where: {
                id: producerId,
                deletedAt: null,
            },
            data: {
                deletedAt: new Date(),
            },
        });
    }

    static findByName(producerName: string, excludedProducerId?: string) {
        return prisma.producer.findFirst({
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
    }
}
