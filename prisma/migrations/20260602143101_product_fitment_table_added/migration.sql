/*
  Warnings:

  - You are about to drop the column `carGenerationId` on the `Product` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[polcarNumber]` on the table `Product` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[intercarsNumber]` on the table `Product` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[klokkerholmNumber]` on the table `Product` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "Product" DROP CONSTRAINT "Product_carGenerationId_fkey";

-- AlterTable
ALTER TABLE "Product" DROP COLUMN "carGenerationId",
ADD COLUMN     "intercarsNumber" TEXT,
ADD COLUMN     "klokkerholmNumber" TEXT,
ADD COLUMN     "polcarNumber" TEXT;

-- CreateTable
CREATE TABLE "ProductFitment" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "carGenerationId" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ProductFitment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProductFitment_productId_carGenerationId_key" ON "ProductFitment"("productId", "carGenerationId");

-- CreateIndex
CREATE UNIQUE INDEX "Product_polcarNumber_key" ON "Product"("polcarNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Product_intercarsNumber_key" ON "Product"("intercarsNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Product_klokkerholmNumber_key" ON "Product"("klokkerholmNumber");

-- AddForeignKey
ALTER TABLE "ProductFitment" ADD CONSTRAINT "ProductFitment_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductFitment" ADD CONSTRAINT "ProductFitment_carGenerationId_fkey" FOREIGN KEY ("carGenerationId") REFERENCES "CarGeneration"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
