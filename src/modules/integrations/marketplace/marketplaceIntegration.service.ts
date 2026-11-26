import { randomUUID } from 'node:crypto';
import { MarketplaceIntegrationChannel, MarketplaceIntegrationStatus, OperationStatus } from '@prisma/client';
import { createAuditLog } from '../../../infrastructure/audit/auditLogger';
import { ACTIONS } from '../../../shared/constants/actions';
import { ENTITIES } from '../../../shared/constants/entities';
import { createMarketplaceAdapter } from './marketplaceAdapter.factory';
import { MarketplaceIntegrationRepository } from './repositories/marketplaceIntegrationRepository';
import { AppError, ErrorNames } from '../../../errors/errorHandler';
import { decryptSecret } from '../../../shared/utils/secretEncryption';
import { MarketplaceAccountData, MarketplaceCreationResult, PreparedMarketplaceConfiguration } from './types/marketplaceAdapter.types';
import { ZodError } from 'zod';

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
        const results: MarketplaceCreationResult[] = [];

        for (const market of adapter.markets ?? [undefined]) {
            const id = randomUUID();
            let configuration: PreparedMarketplaceConfiguration;
            try {
                configuration = await adapter.prepareConfiguration(input, id, market);
            } catch (error) {
                if (market === undefined || error instanceof ZodError) throw error;
                results.push({ market, status: 'ERROR', error: error instanceof AppError ? error.message : 'Nie udało się połączyć z tym rynkiem.' });
                continue;
            }

            if (await MarketplaceIntegrationRepository.findExisting(configuration)) {
                if (market === undefined) {
                    throw new AppError(ErrorNames.CONFLICT, 409, 'Ta integracja jest już dodana.');
                }
                results.push({ market, status: 'EXISTING', error: null });
                continue;
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

            if (market === undefined) return integration;
            results.push({ market, status: 'CONNECTED', error: null });
        }

        return { results };
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
