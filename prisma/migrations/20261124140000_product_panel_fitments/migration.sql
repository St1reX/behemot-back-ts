BEGIN;

ALTER TABLE "ProductFitment"
  ADD COLUMN "carBrandId" TEXT,
  ADD COLUMN "carModelId" TEXT,
  ALTER COLUMN "carGenerationId" DROP NOT NULL;

UPDATE "ProductFitment" AS f
SET "carModelId" = g."carModelId", "carBrandId" = m."carBrandId"
FROM "CarGeneration" AS g JOIN "CarModel" AS m ON m.id = g."carModelId"
WHERE f."carGenerationId" = g.id;

ALTER TABLE "ProductFitment"
  ADD CONSTRAINT "ProductFitment_carBrandId_fkey" FOREIGN KEY ("carBrandId") REFERENCES "CarBrand"(id) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "ProductFitment_carModelId_fkey" FOREIGN KEY ("carModelId") REFERENCES "CarModel"(id) ON DELETE SET NULL ON UPDATE CASCADE;

-- Existing duplicates must be resolved explicitly; never discard product data during migration.
CREATE UNIQUE INDEX "Product_active_sku_key" ON "Product" (sku) WHERE "deletedAt" IS NULL;
CREATE UNIQUE INDEX "ProductFitment_active_vehicle_key" ON "ProductFitment"
  ("productId", (COALESCE("carBrandId", '')), (COALESCE("carModelId", '')), (COALESCE("carGenerationId", '')))
  WHERE "deletedAt" IS NULL;
CREATE UNIQUE INDEX "ProductFitment_active_primary_key" ON "ProductFitment" ("productId")
  WHERE "deletedAt" IS NULL AND "isPrimary" = true;

COMMIT;
