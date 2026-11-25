BEGIN;

-- Stop writes while checking identities and installing the constraints.
LOCK TABLE "Integration", "Product", "ProductExternalListing" IN SHARE ROW EXCLUSIVE MODE;
ALTER TABLE "ProductExternalListing" ADD COLUMN IF NOT EXISTS "integrationId" TEXT;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM "ProductExternalListing" l
        LEFT JOIN "Integration" i ON i.id = l."integrationId"
        WHERE i.id IS NULL OR i.channel <> l.channel
    ) THEN
        RAISE EXCEPTION 'Uzupełnij jawnie integrationId wszystkich ofert. Procedura: docs/legacy-products.md; raport: prisma/reports/legacy-product-listings.sql';
    END IF;
    IF EXISTS (
        SELECT 1 FROM "ProductExternalListing" WHERE "deletedAt" IS NULL
        GROUP BY "productId", channel HAVING COUNT(*) > 1
    ) THEN
        RAISE EXCEPTION 'Produkt ma wiele aktywnych ofert na jednym kanale. Rozwiąż konflikty jawnie; sprawdź raport legacy-product-listings.sql';
    END IF;
    IF EXISTS (
        SELECT 1 FROM "ProductExternalListing" WHERE "externalId" IS NOT NULL
        GROUP BY "integrationId", channel, "externalId" HAVING COUNT(*) > 1
    ) THEN
        RAISE EXCEPTION 'Powielona tożsamość oferty. Rozwiąż konflikty jawnie; sprawdź raport legacy-product-listings.sql';
    END IF;
    IF EXISTS (
        SELECT 1 FROM "Integration" WHERE "externalAccountId" IS NOT NULL
        GROUP BY channel, "externalAccountId" HAVING COUNT(*) > 1
    ) THEN
        RAISE EXCEPTION 'Powielone konto integracji. Rozwiąż konflikty jawnie; sprawdź raport legacy-product-listings.sql';
    END IF;
END $$;

ALTER TABLE "Product"
    ADD COLUMN "isLegacy" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN "contentVersion" INTEGER NOT NULL DEFAULT 1,
    ALTER COLUMN price DROP NOT NULL,
    ALTER COLUMN quantity DROP NOT NULL,
    ALTER COLUMN side DROP NOT NULL,
    ALTER COLUMN side DROP DEFAULT,
    ALTER COLUMN weight DROP NOT NULL,
    ALTER COLUMN length DROP NOT NULL,
    ALTER COLUMN width DROP NOT NULL,
    ALTER COLUMN "warehouseLocation" DROP NOT NULL,
    ALTER COLUMN "warehouseId" DROP NOT NULL,
    ALTER COLUMN "listingTemplateId" DROP NOT NULL,
    ALTER COLUMN "departmentId" DROP NOT NULL,
    ALTER COLUMN "producerId" DROP NOT NULL,
    ADD CONSTRAINT "Product_contentVersion_check" CHECK (
        ("isLegacy" AND "contentVersion" = 0) OR (NOT "isLegacy" AND "contentVersion" >= 1)
    );

ALTER TABLE "ProductExternalListing"
    ALTER COLUMN "integrationId" SET NOT NULL,
    ADD COLUMN "lastSyncedContentVersion" INTEGER,
    ADD CONSTRAINT "ProductExternalListing_contentVersion_check" CHECK ("lastSyncedContentVersion" >= 1);

-- Previous SYNCED values are not evidence of an actual content upload.
UPDATE "ProductExternalListing" SET "syncStatus" = 'PENDING', "lastSyncedAt" = NULL
WHERE "syncStatus" = 'SYNCED';

CREATE UNIQUE INDEX "Integration_id_channel_key" ON "Integration" (id, channel);
CREATE UNIQUE INDEX "Integration_channel_externalAccountId_key" ON "Integration" (channel, "externalAccountId");
DROP INDEX "Integration_channel_externalAccountId_idx";
ALTER TABLE "ProductExternalListing" ADD CONSTRAINT "ProductExternalListing_integrationId_channel_fkey"
    FOREIGN KEY ("integrationId", channel) REFERENCES "Integration" (id, channel) ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE UNIQUE INDEX "ProductExternalListing_active_product_channel_key"
    ON "ProductExternalListing" ("productId", channel) WHERE "deletedAt" IS NULL;
-- Keep identities reserved for archived rows as well: do not silently reassign offers.
CREATE UNIQUE INDEX "ProductExternalListing_integrationId_channel_externalId_key"
    ON "ProductExternalListing" ("integrationId", channel, "externalId");
COMMIT;
