module.exports = {
  securitySchemes: {
    cookieAuth: {
      type: 'apiKey',
      in: 'cookie',
      name: 'behemot-api-sid',
    },
  },
  schemas: {
    MessageResponse: {
      type: 'object',
      properties: { message: { type: 'string' } },
      required: ['message'],
    },
    ErrorResponse: {
      type: 'object',
      properties: {
        error: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            name: { type: 'string' },
          },
          required: ['name', 'message'],
        },
      },
      required: ['error'],
    },
    ValidationErrorResponse: {
      type: 'object',
      properties: {
        error: {
          type: 'object',
          properties: {
            name: { type: 'string', enum: ['ValidationError'] },
            message: { type: 'string' },
            issues: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  path: { type: 'string' },
                  message: { type: 'string' },
                  code: { type: 'string' },
                },
                required: ['path', 'message', 'code'],
              },
            },
          },
          required: ['name', 'message', 'issues'],
        },
      },
      required: ['error'],
    },
  },
};
