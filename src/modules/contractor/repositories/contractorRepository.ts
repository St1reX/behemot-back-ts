import { prisma } from '../../../config/database';
import { CreateContractorDTO, UpdateContractorDTO } from '../schemas/contractor.schema';

const contractorSelect = {
    id: true,
    name: true,
    createdAt: true,
    updatedAt: true,
};

export class ContractorRepository {
    static findAll() {
        return prisma.contractor.findMany({
            where: {
                deletedAt: null,
            },
            select: contractorSelect,
            orderBy: {
                name: 'asc',
            },
        });
    }

    static findById(contractorId: string) {
        return prisma.contractor.findFirst({
            where: {
                id: contractorId,
                deletedAt: null,
            },
            select: contractorSelect,
        });
    }

    static create(contractorData: CreateContractorDTO) {
        return prisma.contractor.create({
            data: contractorData,
            select: contractorSelect,
        });
    }

    static update(contractorId: string, contractorData: UpdateContractorDTO) {
        return prisma.contractor.update({
            where: {
                id: contractorId,
                deletedAt: null,
            },
            data: contractorData,
            select: contractorSelect,
        });
    }

    static countAssignedCrossReferences(contractorId: string) {
        return prisma.productCrossReference.count({
            where: {
                contractorId,
                deletedAt: null,
            },
        });
    }

    static softDelete(contractorId: string) {
        return prisma.contractor.update({
            where: {
                id: contractorId,
                deletedAt: null,
            },
            data: {
                deletedAt: new Date(),
            },
        });
    }

    static findByName(contractorName: string, excludedContractorId?: string) {
        return prisma.contractor.findFirst({
            where: {
                id: excludedContractorId
                    ? {
                        not: excludedContractorId,
                    }
                    : undefined,
                deletedAt: null,
                name: contractorName,
            },
            select: {
                id: true,
            },
        });
    }
}
