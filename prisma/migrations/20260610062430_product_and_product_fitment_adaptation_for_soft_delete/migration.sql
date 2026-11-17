-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "EntityName" ADD VALUE 'PRODUCT';
ALTER TYPE "EntityName" ADD VALUE 'PRODUCT_FITMENT';

-- DropIndex
DROP INDEX "Product_ean_key";

-- DropIndex
DROP INDEX "Product_sku_key";

-- DropIndex
DROP INDEX "ProductFitment_productId_carGenerationId_key";
