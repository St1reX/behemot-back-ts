/*
  Warnings:

  - You are about to drop the column `descriptionId` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `intercarsNumber` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `klokkerholmNumber` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `offerTitle` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `polcarNumber` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `summary` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the `ProductDescription` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `listingTemplateId` to the `Product` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "EntityName" AS ENUM ('USER', 'REGISTRATION_TOKEN', 'DEPARTMENT', 'WAREHOUSE');

-- CreateEnum
CREATE TYPE "ProductSide" AS ENUM ('LEFT', 'RIGHT', 'BOTH', 'NONE');

-- DropForeignKey
ALTER TABLE "Product" DROP CONSTRAINT "Product_descriptionId_fkey";

-- DropForeignKey
ALTER TABLE "ProductDescription" DROP CONSTRAINT "ProductDescription_departmentId_fkey";

-- DropIndex
DROP INDEX "Product_intercarsNumber_key";

-- DropIndex
DROP INDEX "Product_klokkerholmNumber_key";

-- DropIndex
DROP INDEX "Product_polcarNumber_key";

-- AlterTable
ALTER TABLE "Product" DROP COLUMN "descriptionId",
DROP COLUMN "intercarsNumber",
DROP COLUMN "klokkerholmNumber",
DROP COLUMN "name",
DROP COLUMN "offerTitle",
DROP COLUMN "polcarNumber",
DROP COLUMN "summary",
ADD COLUMN     "internalNote" TEXT,
ADD COLUMN     "listingTemplateId" TEXT NOT NULL,
ADD COLUMN     "side" "ProductSide" NOT NULL DEFAULT 'NONE';

-- DropTable
DROP TABLE "ProductDescription";

-- CreateTable
CREATE TABLE "ProductListingTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "titleTemplate" TEXT NOT NULL,
    "summaryTemplate" TEXT NOT NULL,
    "descriptionTemplate" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ProductListingTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductCrossReference" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "contractorId" TEXT NOT NULL,
    "contractorSku" TEXT NOT NULL,
    "contractorEan" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ProductCrossReference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contractor" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Contractor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProductListingTemplate_name_key" ON "ProductListingTemplate"("name");

-- AddForeignKey
ALTER TABLE "ProductListingTemplate" ADD CONSTRAINT "ProductListingTemplate_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_listingTemplateId_fkey" FOREIGN KEY ("listingTemplateId") REFERENCES "ProductListingTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductCrossReference" ADD CONSTRAINT "ProductCrossReference_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductCrossReference" ADD CONSTRAINT "ProductCrossReference_contractorId_fkey" FOREIGN KEY ("contractorId") REFERENCES "Contractor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
