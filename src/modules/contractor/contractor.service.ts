import { OperationStatus } from '@prisma/client';
import { AppError, ErrorNames } from '../../errors/errorHandler';
import { createAuditLog } from '../../infrastructure/audit/auditLogger';
import { ACTIONS } from '../../shared/constants/actions';
import { ENTITIES } from '../../shared/constants/entities';
import { ContractorRepository } from './repositories/contractorRepository';
import { CreateContractorDTO, UpdateContractorDTO } from './schemas/contractor.schema';
import { ContractorResponse, DeleteContractorResponse } from './types/contractor.types';

export class ContractorService {
    static async getContractors(): Promise<ContractorResponse[]> {
        return ContractorRepository.findAll();
    }

    static async getContractor(contractorId: string): Promise<ContractorResponse> {
        const contractor = await ContractorRepository.findById(contractorId);

        if (!contractor) {
            throw new AppError(ErrorNames.RESOURCE_NOT_FOUND, 404, 'Nie znaleziono kontrahenta.');
        }

        return contractor;
    }

    static async createContractor(
        contractorData: CreateContractorDTO,
    ): Promise<ContractorResponse> {
        await this.ensureContractorNameIsAvailable(contractorData.name);

        const createdContractor = await ContractorRepository.create(contractorData);

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

        const updatedContractor = await ContractorRepository.update(contractorId, contractorData);

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

        const assignedProductCrossReferencesCount = await ContractorRepository.countAssignedCrossReferences(
            contractorId,
        );

        if (assignedProductCrossReferencesCount > 0) {
            throw new AppError(
                ErrorNames.CONFLICT,
                409,
                'Nie można usunąć kontrahenta powiązanego z numerami referencyjnymi produktów.',
            );
        }

        await ContractorRepository.softDelete(contractorId);

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
        const existingContractor = await ContractorRepository.findByName(contractorName, excludedContractorId);

        if (existingContractor) {
            throw new AppError(ErrorNames.CONFLICT, 409, 'Kontrahent o tej nazwie już istnieje.');
        }
    }
}
