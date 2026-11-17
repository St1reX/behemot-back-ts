module.exports = {
  tags: [{ name: 'Health', description: 'Service health checks.' }],
  schemas: {
    HealthStatus: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['ok', 'error'] },
      },
      required: ['status'],
    },
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
          200: { description: 'API dependencies are available.' },
          500: { description: 'At least one API dependency is unavailable.' },
        },
      },
    },
  },
};
