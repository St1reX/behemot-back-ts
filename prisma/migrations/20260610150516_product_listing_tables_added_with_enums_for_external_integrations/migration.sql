-- CreateEnum
CREATE TYPE "IntegrationChannel" AS ENUM ('ALLEGRO', 'BASELINKER', 'PRESTASHOP');

-- CreateEnum
CREATE TYPE "IntegrationSyncStatus" AS ENUM ('PENDING', 'SYNCED', 'FAILED');

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "customName" TEXT;

-- CreateTable
CREATE TABLE "ProductExternalListing" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "channel" "IntegrationChannel" NOT NULL,
    "externalId" TEXT,
    "syncStatus" "IntegrationSyncStatus" NOT NULL DEFAULT 'PENDING',
    "lastSyncedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ProductExternalListing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductExternalListingFitment" (
    "id" TEXT NOT NULL,
    "externalListingId" TEXT NOT NULL,
    "productFitmentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ProductExternalListingFitment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductExternalListing_productId_idx" ON "ProductExternalListing"("productId");

-- CreateIndex
CREATE INDEX "ProductExternalListing_channel_externalId_idx" ON "ProductExternalListing"("channel", "externalId");

-- CreateIndex
CREATE INDEX "ProductExternalListing_syncStatus_idx" ON "ProductExternalListing"("syncStatus");

-- CreateIndex
CREATE INDEX "ProductExternalListingFitment_externalListingId_idx" ON "ProductExternalListingFitment"("externalListingId");

-- CreateIndex
CREATE INDEX "ProductExternalListingFitment_productFitmentId_idx" ON "ProductExternalListingFitment"("productFitmentId");

-- AddForeignKey
ALTER TABLE "ProductExternalListing" ADD CONSTRAINT "ProductExternalListing_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductExternalListingFitment" ADD CONSTRAINT "ProductExternalListingFitment_externalListingId_fkey" FOREIGN KEY ("externalListingId") REFERENCES "ProductExternalListing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductExternalListingFitment" ADD CONSTRAINT "ProductExternalListingFitment_productFitmentId_fkey" FOREIGN KEY ("productFitmentId") REFERENCES "ProductFitment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
