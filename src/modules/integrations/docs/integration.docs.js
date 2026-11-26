const { object, text, uuid } = require('../../../swagger/docs/crudDocs');

const nullableText = { ...text, nullable: true };
const date = { type: 'string', format: 'date-time' };
const nullableDate = { ...date, nullable: true };

module.exports = {
    tags: [{ name: 'Integrations', description: 'Read-only integration overview. Credentials and settings are never returned.' }],
    schemas: {
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
                items: object({
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
                }),
            },
        }),
    },
    paths: {
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
