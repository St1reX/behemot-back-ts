import { OperationStatus } from '@prisma/client';
import { prisma } from '../../config/database';
import { AppError, ErrorNames } from '../../errors/errorHandler';
import { createAuditLog } from '../../infrastructure/audit/auditLogger';
import { ACTIONS } from '../../shared/constants/actions';
import { ENTITIES } from '../../shared/constants/entities';
import { CreateContractorDTO, UpdateContractorDTO } from './schemas/contractor.schema';
import { ContractorResponse, DeleteContractorResponse } from './types/contractor.types';

const contractorSelect = {
    id: true,
    name: true,
    createdAt: true,
    updatedAt: true,
};

export class ContractorService {
    static async getContractors(): Promise<ContractorResponse[]> {
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

    static async getContractor(contractorId: string): Promise<ContractorResponse> {
        const contractor = await prisma.contractor.findFirst({
            where: {
                id: contractorId,
                deletedAt: null,
            },
            select: contractorSelect,
        });

        if (!contractor) {
            throw new AppError(ErrorNames.RESOURCE_NOT_FOUND, 404, 'Contractor not found');
        }

        return contractor;
    }

    static async createContractor(
        contractorData: CreateContractorDTO,
    ): Promise<ContractorResponse> {
        await this.ensureContractorNameIsAvailable(contractorData.name);

        const createdContractor = await prisma.contractor.create({
            data: contractorData,
            select: contractorSelect,
        });

        await createAuditLog({
            entityName: ENTITIES.CONTRACTOR,
            entityId: createdContractor.id,
            action: ACTIONS.CREATE,
            operationStatus: OperationStatus.SUCCESS,
            dataBefore: null,
            dataAfter: createdContractor,
        });

        return createdContractor;
    }

    static async updateContractor(
        contractorId: string,
        contractorData: UpdateContractorDTO,
    ): Promise<ContractorResponse> {
        const existingContractor = await this.getContractor(contractorId);

        await this.ensureContractorNameIsAvailable(contractorData.name, contractorId);

        const updatedContractor = await prisma.contractor.update({
            where: {
                id: contractorId,
                deletedAt: null,
            },
            data: contractorData,
            select: contractorSelect,
        });

        await createAuditLog({
            entityName: ENTITIES.CONTRACTOR,
            entityId: contractorId,
            action: ACTIONS.UPDATE,
            operationStatus: OperationStatus.SUCCESS,
            dataBefore: existingContractor,
            dataAfter: updatedContractor,
        });

        return updatedContractor;
    }

    static async deleteContractor(contractorId: string): Promise<DeleteContractorResponse> {
        const existingContractor = await this.getContractor(contractorId);

        const assignedProductCrossReferencesCount = await prisma.productCrossReference.count({
            where: {
                contractorId,
                deletedAt: null,
            },
        });

        if (assignedProductCrossReferencesCount > 0) {
            throw new AppError(
                ErrorNames.CONFLICT,
                409,
                'Contractor cannot be deleted because it is assigned to a product cross reference',
            );
        }

        await prisma.contractor.update({
            where: {
                id: contractorId,
                deletedAt: null,
            },
            data: {
                deletedAt: new Date(),
            },
        });

        await createAuditLog({
            entityName: ENTITIES.CONTRACTOR,
            entityId: contractorId,
            action: ACTIONS.DELETE,
            operationStatus: OperationStatus.SUCCESS,
            dataBefore: existingContractor,
            dataAfter: null,
        });

        return {
            message: 'Contractor has been deleted successfully',
        };
    }

    private static async ensureContractorNameIsAvailable(
        contractorName: string,
        excludedContractorId?: string,
    ) {
        const existingContractor = await prisma.contractor.findFirst({
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

        if (existingContractor) {
            throw new AppError(ErrorNames.CONFLICT, 409, 'Contractor name is already in use');
        }
    }
}
