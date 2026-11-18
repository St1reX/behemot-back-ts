import { prisma } from '../../../config/database';
import {
    CreateProductListingTemplateDTO,
    UpdateProductListingTemplateDTO,
} from '../schemas/productListingTemplate.schema';

const productListingTemplateSelect = {
    id: true,
    name: true,
    titleTemplate: true,
    summaryTemplate: true,
    descriptionTemplate: true,
    department: {
        select: {
            id: true,
            name: true,
            shortcut: true,
        },
    },
    createdAt: true,
    updatedAt: true,
};

export class ProductListingTemplateRepository {
    static findAll() {
        return prisma.productListingTemplate.findMany({
            where: {
                deletedAt: null,
                department: {
                    deletedAt: null,
                },
            },
            select: productListingTemplateSelect,
            orderBy: [
                {
                    department: {
                        name: 'asc',
                    },
                },
                {
                    name: 'asc',
                },
            ],
        });
    }

    static findById(productListingTemplateId: string) {
        return prisma.productListingTemplate.findFirst({
            where: {
                id: productListingTemplateId,
                deletedAt: null,
                department: {
                    deletedAt: null,
                },
            },
            select: productListingTemplateSelect,
        });
    }

    static create(productListingTemplateData: CreateProductListingTemplateDTO) {
        return prisma.productListingTemplate.create({
            data: productListingTemplateData,
            select: productListingTemplateSelect,
        });
    }

    static update(
        productListingTemplateId: string,
        productListingTemplateData: UpdateProductListingTemplateDTO,
    ) {
        return prisma.productListingTemplate.update({
            where: {
                id: productListingTemplateId,
                deletedAt: null,
            },
            data: productListingTemplateData,
            select: productListingTemplateSelect,
        });
    }

    static countAssignedProducts(productListingTemplateId: string) {
        return prisma.product.count({
            where: {
                listingTemplateId: productListingTemplateId,
                deletedAt: null,
            },
        });
    }

    static softDelete(productListingTemplateId: string) {
        return prisma.productListingTemplate.update({
            where: {
                id: productListingTemplateId,
                deletedAt: null,
            },
            data: {
                deletedAt: new Date(),
            },
        });
    }

    static findActiveDepartment(departmentId: string) {
        return prisma.department.findFirst({
            where: {
                id: departmentId,
                deletedAt: null,
            },
            select: {
                id: true,
            },
        });
    }

    static findByName(productListingTemplateName: string, excludedProductListingTemplateId?: string) {
        return prisma.productListingTemplate.findFirst({
            where: {
                id: excludedProductListingTemplateId
                    ? {
                        not: excludedProductListingTemplateId,
                    }
                    : undefined,
                deletedAt: null,
                name: productListingTemplateName,
            },
            select: {
                id: true,
            },
        });
    }
}
