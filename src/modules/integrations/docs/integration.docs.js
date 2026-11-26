const { object, text, uuid } = require('../../../swagger/docs/crudDocs');

const nullableText = { ...text, nullable: true };
const date = { type: 'string', format: 'date-time' };
const nullableDate = { ...date, nullable: true };

const marketplaceIntegration = object({
    id: uuid,
    name: text,
    channel: { type: 'string', enum: ['ALLEGRO', 'EMAG', 'ERLI', 'PRESTASHOP'] },
    externalAccountId: nullableText,
    externalUsername: nullableText,
    environment: { type: 'string', enum: ['PRODUCTION', 'SANDBOX'] },
    market: nullableText,
    isEnabled: { type: 'boolean' },
    status: { type: 'string', enum: ['PENDING', 'CONNECTED', 'ERROR'] },
    accessTokenExpiresAt: nullableDate,
    lastConnectionCheckAt: nullableDate,
    lastSuccessfulSyncAt: nullableDate,
    lastErrorAt: nullableDate,
    createdAt: date,
    updatedAt: date,
});

module.exports = {
    tags: [{ name: 'Integrations', description: 'Integration overview and configuration. Credentials and settings are never returned.' }],
    schemas: {
        MarketplaceIntegration: marketplaceIntegration,
        ConnectionCheckResponse: object({
            integration: { $ref: '#/components/schemas/MarketplaceIntegration' },
            error: { type: 'string', nullable: true, description: 'Safe connection failure description, or null on success.' },
        }),
        IntegrationsResponse: object({
            bolma: object({
                id: { type: 'string', enum: ['bolma'] },
                name: text,
                engine: { type: 'string', enum: ['MySQL'] },
                isConfigured: { type: 'boolean', description: 'Configuration exists; this does not verify connectivity.' },
                sslEnabled: { type: 'boolean' },
            }),
            marketplaces: {
                type: 'array',
                items: { $ref: '#/components/schemas/MarketplaceIntegration' },
            },
        }),
    },
    paths: {
        '/integrations/marketplace/{id}/check-status': {
            post: {
                tags: ['Integrations'],
                summary: 'Check connection and refresh account data',
                description: 'Requires INTEGRATION:UPDATE. Currently supports ERLI. A completed check returns HTTP 200 with the updated integration and an optional safe error. Connection failures persist ERROR diagnostics and retain previous account data. Does not change isEnabled.',
                security: [{ cookieAuth: [] }],
                parameters: [{ name: 'id', in: 'path', required: true, schema: uuid }],
                responses: {
                    200: { description: 'Check completed; inspect integration.status and error.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ConnectionCheckResponse' } } } },
                    400: { description: 'Channel not implemented.' },
                    401: { description: 'User not authenticated.' },
                    403: { description: 'Missing INTEGRATION:UPDATE privilege.' },
                    404: { description: 'Integration not found or deleted during the check.' },
                    422: { description: 'Invalid integration identifier.' },
                },
            },
        },
        '/integrations/marketplace/{channel}': {
            post: {
                tags: ['Integrations'],
                summary: 'Save a marketplace account configuration',
                description: 'Requires INTEGRATION:CREATE. Currently supports ERLI only. Calls ERLI GET /me and saves the encrypted token, shop identity and CONNECTED status only after a successful response.',
                security: [{ cookieAuth: [] }],
                parameters: [{ name: 'channel', in: 'path', required: true, schema: { type: 'string', enum: ['ALLEGRO', 'EMAG', 'ERLI', 'PRESTASHOP'] } }],
                requestBody: {
                    required: true,
                    content: { 'application/json': { schema: {
                        type: 'object', additionalProperties: false, required: ['token'],
                        properties: { token: { type: 'string', minLength: 1, maxLength: 8192, pattern: '^\\S+$', writeOnly: true, description: 'Raw ERLI API key, without the Bearer prefix.' } },
                    } } },
                },
                responses: {
                    201: { description: 'Configuration and verified shop identity saved.', content: { 'application/json': { schema: { $ref: '#/components/schemas/MarketplaceIntegration' } } } },
                    400: { description: 'Configuration for this channel is not implemented.' },
                    401: { description: 'User not authenticated.' },
                    403: { description: 'Missing INTEGRATION:CREATE privilege.' },
                    422: { description: 'Invalid channel, configuration or token rejected by ERLI.' },
                    429: { description: 'Application or ERLI request limit exceeded.' },
                    502: { description: 'Provider request failed or returned invalid data.' },
                },
            },
        },
        '/integrations/marketplace/{id}': {
            delete: {
                tags: ['Integrations'],
                summary: 'Delete a marketplace integration and its local external listings',
                description: 'Requires INTEGRATION:DELETE. Soft-deletes the integration, all related external listings and listing fitment links in one transaction; disables the account and clears stored credentials. Does not call the provider API.',
                security: [{ cookieAuth: [] }],
                parameters: [{ name: 'id', in: 'path', required: true, schema: uuid }],
                responses: {
                    200: { description: 'Integration and dependent records deleted.', content: { 'application/json': { schema: object({ message: text }) } } },
                    401: { description: 'User not authenticated.' },
                    403: { description: 'Missing INTEGRATION:DELETE privilege.' },
                    404: { description: 'Integration not found or already deleted.' },
                    422: { description: 'Invalid integration identifier.' },
                },
            },
        },
        '/integrations': {
            get: {
                tags: ['Integrations'],
                summary: 'List the Bolma data source and active marketplace integration records',
                description: 'Requires INTEGRATION:READ. Excludes soft-deleted records. Does not connect to external services.',
                security: [{ cookieAuth: [] }],
                responses: {
                    200: {
                        description: 'Integration overview without credentials.',
                        content: { 'application/json': { schema: { $ref: '#/components/schemas/IntegrationsResponse' } } },
                    },
                    401: { description: 'User not authenticated.' },
                    403: { description: 'Missing INTEGRATION:READ privilege.' },
                },
            },
        },
    },
};
