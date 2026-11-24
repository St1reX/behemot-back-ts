const { object, response, ref } = require('../../../swagger/docs/crudDocs');

module.exports = {
  tags: [{ name: 'Health', description: 'Service health checks.' }],
  schemas: {
    HealthStatus: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['ok'] },
      },
      required: ['status'],
    },
    ReadinessStatus: object({
      status: { type: 'string', enum: ['ok', 'error'] },
      components: object({
        database: { type: 'string', enum: ['ok', 'error'] },
        redis: { type: 'string', enum: ['ok', 'error'] },
      }),
    }),
  },
  paths: {
    '/health/live': {
      get: {
        tags: ['Health'],
        summary: 'Check whether the API process is running',
        responses: {
          200: {
            description: 'API process is running.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/HealthStatus' },
              },
            },
          },
        },
      },
    },
    '/health/ready': {
      get: {
        tags: ['Health'],
        summary: 'Check whether API dependencies are available',
        responses: {
          200: response('API dependencies are available.', ref('ReadinessStatus')),
          500: response('At least one API dependency is unavailable.', ref('ReadinessStatus')),
        },
      },
    },
  },
};
