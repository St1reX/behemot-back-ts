/*
  Warnings:

  - The `oem` column on the `Product` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - A unique constraint covering the columns `[contractorEan]` on the table `ProductCrossReference` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[productId,contractorId,contractorSku]` on the table `ProductCrossReference` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "EntityName" ADD VALUE 'CONTRACTOR';
ALTER TYPE "EntityName" ADD VALUE 'PRODUCER';
ALTER TYPE "EntityName" ADD VALUE 'CAR_BRAND';
ALTER TYPE "EntityName" ADD VALUE 'CAR_MODEL';
ALTER TYPE "EntityName" ADD VALUE 'CAR_GENERATION';
ALTER TYPE "EntityName" ADD VALUE 'PRODUCT_LISTING_TEMPLATE';

-- DropIndex
DROP INDEX "CarBrand_name_key";

-- DropIndex
DROP INDEX "CarGeneration_carModelId_startProduction_endProduction_key";

-- DropIndex
DROP INDEX "CarModel_carBrandId_name_key";

-- DropIndex
DROP INDEX "Department_name_key";

-- DropIndex
DROP INDEX "Department_shortcut_key";

-- DropIndex
DROP INDEX "ProductListingTemplate_name_key";

-- DropIndex
DROP INDEX "Warehouse_name_key";

-- AlterTable
ALTER TABLE "Product" DROP COLUMN "oem",
ADD COLUMN     "oem" TEXT[];

-- CreateIndex
CREATE UNIQUE INDEX "ProductCrossReference_contractorEan_key" ON "ProductCrossReference"("contractorEan");

-- CreateIndex
CREATE UNIQUE INDEX "ProductCrossReference_productId_contractorId_contractorSku_key" ON "ProductCrossReference"("productId", "contractorId", "contractorSku");
