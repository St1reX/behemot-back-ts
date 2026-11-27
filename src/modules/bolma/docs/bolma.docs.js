const statusContent = {
    'application/json': {
        schema: { $ref: '#/components/schemas/BolmaStatusResponse' },
    },
};

module.exports = {
    tags: [{ name: 'Bolma', description: 'Internal product catalog integration.' }],
    schemas: {
        BolmaConfiguration: {
            type: 'object',
            properties: {
                id: { type: 'string', enum: ['bolma'] },
                name: { type: 'string' },
                engine: { type: 'string', enum: ['MySQL'] },
                isConfigured: { type: 'boolean', description: 'Configuration exists; this does not verify connectivity.' },
                sslEnabled: { type: 'boolean' },
            },
            required: ['id', 'name', 'engine', 'isConfigured', 'sslEnabled'],
        },
        BolmaStatusResponse: {
            type: 'object',
            properties: {
                status: { type: 'string', enum: ['ok', 'error'] },
                components: {
                    type: 'object',
                    properties: {
                        database: { type: 'string', enum: ['ok', 'error'] },
                    },
                    required: ['database'],
                },
            },
            required: ['status', 'components'],
        },
    },
    paths: {
        '/bolma/configuration': {
            get: {
                tags: ['Bolma'],
                summary: 'Read the Bolma catalog configuration without credentials',
                description: 'Requires INTEGRATION:READ. Reads environment configuration without checking the database connection.',
                security: [{ cookieAuth: [] }],
                responses: {
                    200: { description: 'Safe catalog configuration.', content: { 'application/json': { schema: { $ref: '#/components/schemas/BolmaConfiguration' } } } },
                    401: { description: 'User not authenticated.' },
                    403: { description: 'Missing INTEGRATION:READ privilege.' },
                },
            },
        },
        '/bolma/status': {
            get: {
                tags: ['Bolma'],
                summary: 'Check the Bolma catalog database connection',
                security: [{ cookieAuth: [] }],
                responses: {
                    200: { description: 'Database is available.', content: statusContent },
                    503: { description: 'Database is unavailable.', content: statusContent },
                    401: {
                        description: 'User not authenticated.',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/ErrorResponse' },
                            },
                        },
                    },
                },
            },
        },
    },
};
