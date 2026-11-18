const statusContent = {
    'application/json': {
        schema: { $ref: '#/components/schemas/BolmaStatusResponse' },
    },
};

module.exports = {
    tags: [{ name: 'Bolma', description: 'Internal product catalog integration.' }],
    schemas: {
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
        '/integrations/bolma/status': {
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
