-- CreateTable
CREATE TABLE "public"."Log" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "entityName" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "operationStatus" TEXT NOT NULL,
    "comment" TEXT,
    "dataBefore" JSONB,
    "dataAfter" JSONB,
    "sourceIp" TEXT,
    "isSuspicious" BOOLEAN NOT NULL DEFAULT false,
    "suspiciousReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Log_userId_idx" ON "public"."Log"("userId");

-- CreateIndex
CREATE INDEX "Log_entityName_entityId_idx" ON "public"."Log"("entityName", "entityId");

-- CreateIndex
CREATE INDEX "Log_isSuspicious_idx" ON "public"."Log"("isSuspicious");
