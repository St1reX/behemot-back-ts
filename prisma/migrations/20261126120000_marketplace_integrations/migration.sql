BEGIN;

LOCK TABLE "Integration", "ProductExternalListing" IN SHARE ROW EXCLUSIVE MODE;

-- BaseLinker is not one of the new marketplace channels. Never guess its replacement.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM "Integration" WHERE channel = 'BASELINKER')
        OR EXISTS (SELECT 1 FROM "ProductExternalListing" WHERE channel = 'BASELINKER') THEN
        RAISE EXCEPTION 'Istnieją integracje lub oferty BASELINKER (również archiwalne). Ustal ich docelowy kanał przed migracją marketplace; dane nie zostały zmienione.';
    END IF;
END $$;

ALTER TABLE "ProductExternalListing" DROP CONSTRAINT "ProductExternalListing_integrationId_channel_fkey";

ALTER TYPE "IntegrationChannel" RENAME TO "IntegrationChannel_old";
CREATE TYPE "MarketplaceIntegrationChannel" AS ENUM ('ALLEGRO', 'EMAG', 'ERLI', 'PRESTASHOP');
ALTER TABLE "Integration" ALTER COLUMN channel TYPE "MarketplaceIntegrationChannel"
    USING (channel::text::"MarketplaceIntegrationChannel");
ALTER TABLE "ProductExternalListing" ALTER COLUMN channel TYPE "MarketplaceIntegrationChannel"
    USING (channel::text::"MarketplaceIntegrationChannel");
DROP TYPE "IntegrationChannel_old";

CREATE TYPE "IntegrationEnvironment" AS ENUM ('PRODUCTION', 'SANDBOX');
CREATE TYPE "MarketplaceIntegrationStatus" AS ENUM ('PENDING', 'CONNECTED', 'ERROR');
ALTER TYPE "EntityName" ADD VALUE 'INTEGRATION';

ALTER TABLE "Integration" RENAME TO "MarketplaceIntegration";
ALTER TABLE "MarketplaceIntegration" RENAME CONSTRAINT "Integration_pkey" TO "MarketplaceIntegration_pkey";
ALTER INDEX "Integration_id_channel_key" RENAME TO "MarketplaceIntegration_id_channel_key";
ALTER INDEX "Integration_channel_idx" RENAME TO "MarketplaceIntegration_channel_idx";
DROP INDEX "Integration_channel_externalAccountId_key";

ALTER TABLE "MarketplaceIntegration"
    ALTER COLUMN "encryptedAccessToken" DROP NOT NULL,
    ALTER COLUMN "encryptedRefreshToken" DROP NOT NULL,
    ALTER COLUMN "accessTokenExpiresAt" DROP NOT NULL,
    ADD COLUMN "externalUsername" TEXT,
    ADD COLUMN "environment" "IntegrationEnvironment" NOT NULL DEFAULT 'PRODUCTION',
    ADD COLUMN "encryptedApiKey" TEXT,
    ADD COLUMN "encryptedPassword" TEXT,
    ADD COLUMN "baseUrl" TEXT,
    ADD COLUMN "market" TEXT,
    ADD COLUMN "settings" JSONB,
    ADD COLUMN "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN "status" "MarketplaceIntegrationStatus" NOT NULL DEFAULT 'PENDING',
    ADD COLUMN "lastConnectionCheckAt" TIMESTAMP(3),
    ADD COLUMN "lastSuccessfulSyncAt" TIMESTAMP(3),
    ADD COLUMN "lastErrorAt" TIMESTAMP(3),
    ADD COLUMN "lastErrorMessage" TEXT;

CREATE INDEX "MarketplaceIntegration_channel_externalAccountId_idx" ON "MarketplaceIntegration" (channel, "externalAccountId");
CREATE INDEX "MarketplaceIntegration_isEnabled_status_idx" ON "MarketplaceIntegration" ("isEnabled", status);
ALTER TABLE "ProductExternalListing" ADD CONSTRAINT "ProductExternalListing_integrationId_channel_fkey"
    FOREIGN KEY ("integrationId", channel) REFERENCES "MarketplaceIntegration" (id, channel)
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- Keep existing admins able to see the new read-only page without resetting other privileges.
INSERT INTO "Privilege" (id, name, "createdAt", "updatedAt")
VALUES (gen_random_uuid()::text, 'INTEGRATION:READ', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (name) DO UPDATE SET "deletedAt" = NULL;
INSERT INTO "_RoleToPrivilege" ("A", "B")
SELECT p.id, r.id FROM "Privilege" p CROSS JOIN "Role" r
WHERE p.name = 'INTEGRATION:READ' AND r.name IN ('admin', 'superadmin') AND r."deletedAt" IS NULL
ON CONFLICT DO NOTHING;

COMMIT;
