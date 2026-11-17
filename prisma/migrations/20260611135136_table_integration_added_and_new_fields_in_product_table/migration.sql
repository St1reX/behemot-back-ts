-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "customDescription" TEXT,
ADD COLUMN     "customSummary" TEXT;

-- CreateTable
CREATE TABLE "Integration" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "channel" "IntegrationChannel" NOT NULL,
    "externalAccountId" TEXT,
    "encryptedAccessToken" TEXT NOT NULL,
    "encryptedRefreshToken" TEXT NOT NULL,
    "accessTokenExpiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Integration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Integration_channel_idx" ON "Integration"("channel");

-- CreateIndex
CREATE INDEX "Integration_channel_externalAccountId_idx" ON "Integration"("channel", "externalAccountId");
