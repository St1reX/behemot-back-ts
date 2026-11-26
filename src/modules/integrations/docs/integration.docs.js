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
        AllegroAuthorization: {
            type: 'object', additionalProperties: false, required: ['baseUrl', 'clientId', 'clientSecret'],
            properties: {
                baseUrl: { type: 'string', format: 'uri', maxLength: 2048, description: 'API base URL supplied in the form and stored on the integration. HTTPS without credentials, query or fragment; normalized with a trailing slash.' },
                clientId: { type: 'string', minLength: 1, maxLength: 255, pattern: '^[a-zA-Z0-9-]+$', writeOnly: true },
                clientSecret: { type: 'string', minLength: 1, maxLength: 4096, writeOnly: true },
                integrationId: { ...uuid, description: 'Optional existing Allegro integration to reconnect. Must authorize the same account.' },
            },
        },
        AllegroAuthorizationResponse: object({ authorizationUrl: { type: 'string', format: 'uri' } }),
        AllegroApplicationConfiguration: object({ callbackUrl: { type: 'string', format: 'uri' } }),
        EmagConfiguration: {
            type: 'object', additionalProperties: false, required: ['baseUrl', 'market', 'username', 'password'],
            properties: {
                baseUrl: { type: 'string', format: 'uri', maxLength: 2048, description: 'HTTPS API base URL for the selected market. No credentials, query or fragment; normalized with a trailing slash.' },
                market: { type: 'string', enum: ['RO', 'BG', 'HU'] },
                username: { type: 'string', format: 'email', maxLength: 255 },
                password: { type: 'string', minLength: 1, maxLength: 4096, writeOnly: true },
            },
        },
        ErliConfiguration: {
            type: 'object', additionalProperties: false, required: ['baseUrl', 'token'],
            properties: {
                baseUrl: { type: 'string', format: 'uri', maxLength: 2048, description: 'HTTPS API base URL. No credentials, query or fragment; normalized with a trailing slash.' },
                token: { type: 'string', minLength: 1, maxLength: 8192, pattern: '^\\S+$', writeOnly: true },
            },
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
        '/integrations/allegro/configuration': {
            get: {
                tags: ['Integrations'], summary: 'Read Allegro redirect URI',
                description: 'Requires both INTEGRATION:CREATE and INTEGRATION:UPDATE. Returns only the redirect URI derived from the backend public URL. Application credentials are entered in the authorization form and never returned.',
                security: [{ cookieAuth: [] }],
                responses: {
                    200: { description: 'Callback URL.', content: { 'application/json': { schema: { $ref: '#/components/schemas/AllegroApplicationConfiguration' } } } },
                    401: { description: 'User not authenticated.' },
                    403: { description: 'Missing integration privileges.' },
                },
            },
        },
        '/integrations/allegro/authorize': {
            post: {
                tags: ['Integrations'], summary: 'Start Allegro OAuth2 Authorization Code',
                description: 'Requires both INTEGRATION:CREATE and INTEGRATION:UPDATE, enforced by route middleware. Requires API base URL, Client ID and Client Secret from the form. Returns an Allegro authorization URL. Credentials and the server-generated redirect URI are held in encrypted, session-bound state for up to 10 minutes, consumed once, then credentials are stored encrypted on the verified integration. Requests only allegro:api:profile:read. No application credentials are read from the environment.',
                security: [{ cookieAuth: [] }],
                requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/AllegroAuthorization' } } } },
                responses: {
                    200: { description: 'Navigate the browser to authorizationUrl.', content: { 'application/json': { schema: { $ref: '#/components/schemas/AllegroAuthorizationResponse' } } } },
                    401: { description: 'User not authenticated.' },
                    403: { description: 'Missing privilege for the requested operation.' },
                    404: { description: 'Integration to reconnect not found.' },
                    422: { description: 'Invalid API URL or integration identifier.' },
                },
            },
        },
        '/integrations/allegro/callback': {
            get: {
                tags: ['Integrations'], summary: 'Complete Allegro OAuth2 and return to the integrations page',
                description: 'Browser callback registered in Allegro Developer. Route middleware requires authentication and both INTEGRATION:CREATE and INTEGRATION:UPDATE. Requires the initiating session and consumes state before exchanging code using Basic authentication with submitted application credentials and the redirect URI saved at authorization start. Verifies identity through GET /me, then uses the shared integration service and duplicate checks. Stores encrypted application credentials, access/refresh tokens and expiry. Reconnection retains the integration ID and requires the same Allegro account. Handles cancellation and errors through safe return messages.',
                security: [{ cookieAuth: [] }],
                parameters: [
                    { name: 'state', in: 'query', required: true, schema: { type: 'string', pattern: '^[a-f0-9]{64}$' } },
                    { name: 'code', in: 'query', schema: { type: 'string', maxLength: 4096 } },
                    { name: 'error', in: 'query', schema: { type: 'string', maxLength: 255 } },
                ],
                responses: {
                    303: { description: 'Redirect to the frontend integrations page with connected, cancelled or error result.', headers: { Location: { schema: { type: 'string', format: 'uri' } } } },
                    401: { description: 'User not authenticated.' },
                    403: { description: 'Missing INTEGRATION:CREATE or INTEGRATION:UPDATE privilege.' },
                },
            },
        },
        '/integrations/marketplace/{id}/check-status': {
            post: {
                tags: ['Integrations'],
                summary: 'Check connection and refresh account data',
                description: 'Requires INTEGRATION:UPDATE. Supports Allegro, ERLI, PrestaShop and eMAG. Uses the stored API URL. Allegro calls GET /me with its stored access token; missing, expired or rejected tokens require OAuth reconnection. Tokens are not refreshed and requests are not retried. A completed check returns HTTP 200 with the updated integration and an optional safe error. Failures persist ERROR diagnostics and retain previous account data. Does not change isEnabled. PrestaShop selects the first returned shop. eMAG uses product_offer/count.',
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
                description: 'Requires INTEGRATION:CREATE. ERLI accepts {baseUrl, token}; PRESTASHOP accepts {baseUrl, apiKey}; EMAG accepts {baseUrl, market, username, password}, with one selected market: RO, BG or HU. These channels save one integration with HTTP 201; duplicates return HTTP 409. Allegro must use POST /integrations/allegro/authorize; direct creation through this endpoint is rejected.',
                security: [{ cookieAuth: [] }],
                parameters: [{ name: 'channel', in: 'path', required: true, schema: { type: 'string', enum: ['EMAG', 'ERLI', 'PRESTASHOP'] } }],
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
