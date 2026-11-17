module.exports = {
  securitySchemes: {
    cookieAuth: {
      type: 'apiKey',
      in: 'cookie',
      name: 'connect.sid',
    },
  },
  schemas: {
    ErrorResponse: {
      type: 'object',
      properties: {
        error: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            name: { type: 'string' },
          },
          required: ['message'],
        },
      },
      required: ['error'],
    },
    ValidationErrorResponse: {
      type: 'object',
      properties: {
        error: {
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
      required: ['error'],
    },
  },
};
