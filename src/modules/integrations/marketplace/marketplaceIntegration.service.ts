import { randomUUID } from 'node:crypto';
import { MarketplaceIntegrationChannel, OperationStatus } from '@prisma/client';
import { createAuditLog } from '../../../infrastructure/audit/auditLogger';
import { ACTIONS } from '../../../shared/constants/actions';
import { ENTITIES } from '../../../shared/constants/entities';
import { createMarketplaceAdapter } from './marketplaceAdapter.factory';
import { MarketplaceIntegrationRepository } from './repositories/marketplaceIntegrationRepository';

export class MarketplaceIntegrationService {
    static getIntegrations() {
        return MarketplaceIntegrationRepository.findAll();
    }

    static async createIntegration(channel: MarketplaceIntegrationChannel, input: unknown) {
        const id = randomUUID();
        const adapter = createMarketplaceAdapter(channel);
        const configuration = adapter.prepareConfiguration(input, id);
        const integration = await MarketplaceIntegrationRepository.create(id, configuration);

        await createAuditLog({
            entityName: ENTITIES.INTEGRATION,
            entityId: integration.id,
            action: ACTIONS.CREATE,
            operationStatus: OperationStatus.SUCCESS,
            dataBefore: null,
            dataAfter: integration,
        });

        return integration;
    }
}
