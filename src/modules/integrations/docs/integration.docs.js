const { object, text, uuid } = require('../../../swagger/docs/crudDocs');

const nullableText = { ...text, nullable: true };
const date = { type: 'string', format: 'date-time' };
const nullableDate = { ...date, nullable: true };

const marketplaceIntegration = object({
    id: uuid,
    name: text,
    channel: { type: 'string', enum: ['ALLEGRO', 'EMAG', 'ERLI', 'PRESTASHOP'] },
    baseUrl: nullableText,
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
        EmagConfiguration: {
            type: 'object', additionalProperties: false, required: ['username', 'password'],
            properties: {
                username: { type: 'string', format: 'email', maxLength: 255 },
                password: { type: 'string', minLength: 1, maxLength: 4096, writeOnly: true },
            },
        },
        ErliConfiguration: {
            type: 'object', additionalProperties: false, required: ['token'],
            properties: { token: { type: 'string', minLength: 1, maxLength: 8192, pattern: '^\\S+$', writeOnly: true } },
        },
        PrestashopConfiguration: {
            type: 'object', additionalProperties: false, required: ['baseUrl', 'apiKey'],
            properties: {
                baseUrl: { type: 'string', format: 'uri', maxLength: 2048, description: 'HTTPS shop address or API base URL; stored normalized with a trailing /api/ path. No credentials, query or fragment.' },
                apiKey: { type: 'string', minLength: 1, maxLength: 128, pattern: '^[a-zA-Z0-9]+$', writeOnly: true },
            },
        },
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
                description: 'Requires INTEGRATION:UPDATE. Supports ERLI, PrestaShop and eMAG. A completed check returns HTTP 200 with the updated integration and an optional safe error. Connection failures persist ERROR diagnostics and retain previous account data. Does not change isEnabled. PrestaShop selects the first returned shop. eMAG checks API access through product_offer/count on the RO endpoint; its public API has no seller-profile endpoint.',
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
                description: 'Requires INTEGRATION:CREATE. ERLI accepts {token}; PRESTASHOP accepts {baseUrl, apiKey}; EMAG accepts {username, password}, with an email username. All channels use the same creation service and return one integration with HTTP 201. Duplicate active account configurations are rejected with HTTP 409. eMAG uses only the RO API for now, without separate market configurations.',
                security: [{ cookieAuth: [] }],
                parameters: [{ name: 'channel', in: 'path', required: true, schema: { type: 'string', enum: ['ALLEGRO', 'EMAG', 'ERLI', 'PRESTASHOP'] } }],
                requestBody: {
                    required: true,
                    content: { 'application/json': { schema: { oneOf: [
                        { $ref: '#/components/schemas/ErliConfiguration' },
                        { $ref: '#/components/schemas/PrestashopConfiguration' },
                        { $ref: '#/components/schemas/EmagConfiguration' },
                    ] } } },
                },
                responses: {
                    409: { description: 'This account configuration already exists.' },
                    201: { description: 'Configuration and verified shop identity saved.', content: { 'application/json': { schema: { $ref: '#/components/schemas/MarketplaceIntegration' } } } },
                    400: { description: 'Configuration for this channel is not implemented.' },
                    401: { description: 'User not authenticated.' },
                    403: { description: 'Missing INTEGRATION:CREATE privilege.' },
                    422: { description: 'Invalid channel, configuration or credentials rejected by the provider.' },
                    429: { description: 'Application or provider request limit exceeded.' },
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
