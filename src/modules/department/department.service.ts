import { prisma } from '../../config/database';
import { AppError, ErrorNames } from '../../errors/errorHandler';
import { createAuditLog } from '../../infrastructure/audit/auditLogger';
import { ACTIONS } from '../../shared/constants/actions';
import { ENTITIES } from '../../shared/constants/entities';
import { OperationStatus } from '@prisma/client';
import { CreateDepartmentDTO, UpdateDepartmentDTO } from './schemas/department.schema';
import { DeleteDepartmentResponse, DepartmentResponse } from './types/department.types';

const departmentSelect = {
    id: true,
    name: true,
    shortcut: true,
    createdAt: true,
    updatedAt: true,
};

export class DepartmentService {
    static async getDepartments(): Promise<DepartmentResponse[]> {
        return prisma.department.findMany({
            where: {
                deletedAt: null,
            },
            select: departmentSelect,
            orderBy: {
                name: 'asc',
            },
        });
    }

    static async getDepartment(departmentId: string): Promise<DepartmentResponse> {
        const department = await prisma.department.findFirst({
            where: {
                id: departmentId,
                deletedAt: null,
            },
            select: departmentSelect,
        });

        if (!department) {
            throw new AppError(ErrorNames.RESOURCE_NOT_FOUND, 404, 'Department not found');
        }

        return department;
    }

    static async createDepartment(
        departmentData: CreateDepartmentDTO,
    ): Promise<DepartmentResponse> {
        await this.ensureDepartmentDataIsAvailable(departmentData);

        const createdDepartment = await prisma.department.create({
            data: departmentData,
            select: departmentSelect,
        });

        await createAuditLog({
            entityName: ENTITIES.DEPARTMENT,
            entityId: createdDepartment.id,
            action: ACTIONS.CREATE,
            operationStatus: OperationStatus.SUCCESS,
            dataBefore: null,
            dataAfter: createdDepartment,
        });

        return createdDepartment;
    }

    static async updateDepartment(
        departmentId: string,
        departmentData: UpdateDepartmentDTO,
    ): Promise<DepartmentResponse> {
        const existingDepartment = await this.getDepartment(departmentId);

        await this.ensureDepartmentDataIsAvailable(departmentData, departmentId);

        const updatedDepartment = await prisma.department.update({
            where: {
                id: departmentId,
                deletedAt: null,
            },
            data: departmentData,
            select: departmentSelect,
        });

        await createAuditLog({
            entityName: ENTITIES.DEPARTMENT,
            entityId: departmentId,
            action: ACTIONS.UPDATE,
            operationStatus: OperationStatus.SUCCESS,
            dataBefore: existingDepartment,
            dataAfter: updatedDepartment,
        });

        return updatedDepartment;
    }

    static async deleteDepartment(departmentId: string): Promise<DeleteDepartmentResponse> {
        const existingDepartment = await this.getDepartment(departmentId);

        const [assignedUsersCount, assignedProductsCount, assignedProductDescriptionsCount] =
            await prisma.$transaction([
                prisma.user.count({
                    where: {
                        departmentId,
                        deletedAt: null,
                    },
                }),
                prisma.product.count({
                    where: {
                        departmentId,
                        deletedAt: null,
                    },
                }),
                prisma.productListingTemplate.count({
                    where: {
                        departmentId,
                        deletedAt: null,
                    },
                }),
            ]);

        if (
            assignedUsersCount > 0 ||
            assignedProductsCount > 0 ||
            assignedProductDescriptionsCount > 0
        ) {
            throw new AppError(
                ErrorNames.CONFLICT,
                409,
                'Department cannot be deleted because it is assigned to another resource',
            );
        }

        await prisma.department.update({
            where: {
                id: departmentId,
                deletedAt: null,
            },
            data: {
                deletedAt: new Date(),
            },
        });

        await createAuditLog({
            entityName: ENTITIES.DEPARTMENT,
            entityId: departmentId,
            action: ACTIONS.DELETE,
            operationStatus: OperationStatus.SUCCESS,
            dataBefore: existingDepartment,
            dataAfter: null,
        });

        return {
            message: 'Department has been deleted successfully',
        };
    }

    private static async ensureDepartmentDataIsAvailable(
        departmentData: CreateDepartmentDTO | UpdateDepartmentDTO,
        excludedDepartmentId?: string,
    ) {
        const existingDepartment = await prisma.department.findFirst({
            where: {
                id: excludedDepartmentId
                    ? {
                          not: excludedDepartmentId,
                      }
                    : undefined,
                deletedAt: null,
                OR: [
                    ...(departmentData.name ? [{ name: departmentData.name }] : []),
                    ...(departmentData.shortcut ? [{ shortcut: departmentData.shortcut }] : []),
                ],
            },
            select: {
                id: true,
            },
        });

        if (existingDepartment) {
            throw new AppError(
                ErrorNames.CONFLICT,
                409,
                'Department name or shortcut is already in use',
            );
        }
    }
}
