-- Read-only; works before and after the integrationId column is added.
SELECT l.id, l."productId", p.sku, l.channel, l."externalId", l."deletedAt",
       to_jsonb(l)->>'integrationId' AS "integrationId", i.name AS "integrationName", i."externalAccountId",
       CASE WHEN i.id IS NULL THEN 'BRAK POTWIERDZONEGO KONTA'
            WHEN i.channel <> l.channel THEN 'NIEZGODNY KANAL'
            ELSE 'POWIAZANIE POPRAWNE' END AS "mappingStatus"
FROM "ProductExternalListing" l JOIN "Product" p ON p.id = l."productId"
LEFT JOIN "Integration" i ON i.id = (to_jsonb(l)->>'integrationId')
ORDER BY p.sku, l.channel, l.id;

SELECT "productId", channel, array_agg(id) AS "listingIds"
FROM "ProductExternalListing" WHERE "deletedAt" IS NULL
GROUP BY "productId", channel HAVING count(*) > 1;

SELECT to_jsonb(l)->>'integrationId' AS "integrationId", channel, "externalId", array_agg(id) AS "listingIds"
FROM "ProductExternalListing" l WHERE "externalId" IS NOT NULL
GROUP BY to_jsonb(l)->>'integrationId', channel, "externalId" HAVING count(*) > 1;

SELECT channel, "externalAccountId", array_agg(id) AS "integrationIds"
FROM "Integration" WHERE "externalAccountId" IS NOT NULL
GROUP BY channel, "externalAccountId" HAVING count(*) > 1;

SELECT id, name, channel, "externalAccountId", "deletedAt" FROM "Integration" ORDER BY channel, name;
