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
        '/integrations/marketplace/{channel}': {
            post: {
                tags: ['Integrations'],
                summary: 'Save a marketplace account configuration',
                description: 'Requires INTEGRATION:CREATE. Currently supports ERLI only. Encrypts the token and creates a PENDING account without calling the provider API.',
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
                    201: { description: 'Configuration saved; connection not checked.', content: { 'application/json': { schema: { $ref: '#/components/schemas/MarketplaceIntegration' } } } },
                    400: { description: 'Configuration for this channel is not implemented.' },
                    401: { description: 'User not authenticated.' },
                    403: { description: 'Missing INTEGRATION:CREATE privilege.' },
                    422: { description: 'Invalid channel or configuration.' },
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
