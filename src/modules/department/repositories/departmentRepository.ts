import { prisma } from '../../../config/database';
import { CreateDepartmentDTO, UpdateDepartmentDTO } from '../schemas/department.schema';

const departmentSelect = {
    id: true,
    name: true,
    shortcut: true,
    createdAt: true,
    updatedAt: true,
};

export class DepartmentRepository {
    static findAll() {
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

    static findById(departmentId: string) {
        return prisma.department.findFirst({
            where: {
                id: departmentId,
                deletedAt: null,
            },
            select: departmentSelect,
        });
    }

    static create(departmentData: CreateDepartmentDTO) {
        return prisma.department.create({
            data: departmentData,
            select: departmentSelect,
        });
    }

    static update(departmentId: string, departmentData: UpdateDepartmentDTO) {
        return prisma.department.update({
            where: {
                id: departmentId,
                deletedAt: null,
            },
            data: departmentData,
            select: departmentSelect,
        });
    }

    static countAssignments(departmentId: string) {
        return prisma.$transaction([
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
    }

    static softDelete(departmentId: string) {
        return prisma.department.update({
            where: {
                id: departmentId,
                deletedAt: null,
            },
            data: {
                deletedAt: new Date(),
            },
        });
    }

    static findConflictingDepartment(
        departmentData: CreateDepartmentDTO | UpdateDepartmentDTO,
        excludedDepartmentId?: string,
    ) {
        return prisma.department.findFirst({
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
    }
}
