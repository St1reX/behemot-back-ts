import { MarketplaceIntegrationChannel } from '@prisma/client';
import { z } from 'zod';

export const MarketplaceChannelParamsSchema = z.object({
    channel: z.nativeEnum(MarketplaceIntegrationChannel),
});
