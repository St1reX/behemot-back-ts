module.exports = {
  tags: [{ name: 'Operations', description: 'Operational endpoints registered directly on the application.' }],
  paths: {
    '/metrics': {
      get: {
        tags: ['Operations'], summary: 'Read Prometheus metrics',
        responses: {
          200: { description: 'Prometheus metrics.', content: { 'text/plain': { schema: { type: 'string' } } } },
        },
      },
    },
  },
};
