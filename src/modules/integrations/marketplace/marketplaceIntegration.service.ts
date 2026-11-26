import { randomUUID } from 'node:crypto';
import { MarketplaceIntegrationChannel, MarketplaceIntegrationStatus, OperationStatus } from '@prisma/client';
import { createAuditLog } from '../../../infrastructure/audit/auditLogger';
import { ACTIONS } from '../../../shared/constants/actions';
import { ENTITIES } from '../../../shared/constants/entities';
import { createMarketplaceAdapter } from './marketplaceAdapter.factory';
import { MarketplaceIntegrationRepository } from './repositories/marketplaceIntegrationRepository';
import { AppError, ErrorNames } from '../../../errors/errorHandler';
import { decryptSecret } from '../../../shared/utils/secretEncryption';
import { MarketplaceAccountData } from './types/marketplaceAdapter.types';

export class MarketplaceIntegrationService {
    static async checkConnection(integrationId: string) {
        const storedIntegration = await MarketplaceIntegrationRepository.findForConnectionCheck(integrationId);
        if (!storedIntegration) {
            throw new AppError(ErrorNames.RESOURCE_NOT_FOUND, 404, 'Nie znaleziono integracji.');
        }

        const { encryptedApiKey, encryptedPassword, ...integrationBefore } = storedIntegration;
        const adapter = createMarketplaceAdapter(storedIntegration.channel);
        let account: MarketplaceAccountData | null = null;
        let errorMessage: string | null = null;

        try {
            const apiKey = encryptedApiKey ? decryptSecret(encryptedApiKey, `marketplace:${integrationId}:encryptedApiKey`) : undefined;
            const password = encryptedPassword ? decryptSecret(encryptedPassword, `marketplace:${integrationId}:encryptedPassword`) : undefined;
            account = await adapter.checkConnection({
                apiKey,
                password,
                username: storedIntegration.externalUsername,
                market: storedIntegration.market,
                environment: storedIntegration.environment,
                baseUrl: storedIntegration.baseUrl,
            });
        } catch (error) {
            errorMessage = error instanceof AppError
                ? error.message
                : 'Nie udało się sprawdzić połączenia. Sprawdź konfigurację integracji i klucz szyfrujący serwera.';
        }

        const checkedAt = new Date();
        const integration = await MarketplaceIntegrationRepository.updateConnectionCheck(integrationId, account ? {
            ...account,
            status: MarketplaceIntegrationStatus.CONNECTED,
            lastConnectionCheckAt: checkedAt,
            lastErrorAt: null,
            lastErrorMessage: null,
        } : {
            status: MarketplaceIntegrationStatus.ERROR,
            lastConnectionCheckAt: checkedAt,
            lastErrorAt: checkedAt,
            lastErrorMessage: errorMessage,
        });

        await createAuditLog({
            entityName: ENTITIES.INTEGRATION,
            entityId: integrationId,
            action: ACTIONS.UPDATE,
            operationStatus: account ? OperationStatus.SUCCESS : OperationStatus.FAILED,
            dataBefore: integrationBefore,
            dataAfter: integration,
            comment: errorMessage ?? 'Sprawdzono połączenie i odświeżono dane konta.',
        });

        return { integration, error: errorMessage };
    }

    static getIntegrations() {
        return MarketplaceIntegrationRepository.findAll();
    }

    static async createIntegration(channel: MarketplaceIntegrationChannel, input: unknown) {
        const adapter = createMarketplaceAdapter(channel);
        const id = randomUUID();
        const configuration = await adapter.prepareConfiguration(input, id);

        if (await MarketplaceIntegrationRepository.findExisting(configuration)) {
            throw new AppError(ErrorNames.CONFLICT, 409, 'Ta integracja jest już dodana.');
        }

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

    static async deleteIntegration(integrationId: string) {
        const integration = await MarketplaceIntegrationRepository.findById(integrationId);
        if (!integration) {
            throw new AppError(ErrorNames.RESOURCE_NOT_FOUND, 404, 'Nie znaleziono integracji.');
        }

        await MarketplaceIntegrationRepository.softDelete(integrationId);
        await createAuditLog({
            entityName: ENTITIES.INTEGRATION,
            entityId: integrationId,
            action: ACTIONS.DELETE,
            operationStatus: OperationStatus.SUCCESS,
            dataBefore: integration,
            dataAfter: null,
        });

        return { message: 'Integracja i powiązane oferty zostały usunięte.' };
    }
}
