-- AlterEnum
ALTER TYPE "EntityName" ADD VALUE 'PRODUCT_CROSS_REFERENCE';

-- DropIndex
DROP INDEX "ProductCrossReference_contractorEan_key";

-- DropIndex
DROP INDEX "ProductCrossReference_productId_contractorId_contractorSku_key";
