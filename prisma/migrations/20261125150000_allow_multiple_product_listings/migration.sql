-- Keep all existing listings and fitment links. A product/fitment may have
-- multiple offers on the same integration account, including the same channel.
DROP INDEX "ProductExternalListing_active_product_channel_key";

-- ProductExternalListing_integrationId_channel_externalId_key remains in place:
-- the same external offer cannot be assigned more than once on one account.
