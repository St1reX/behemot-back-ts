module.exports = {
  tags: [{ name: 'Auth', description: 'Authentication and account verification.' }],
  schemas: {
    AuthenticatedUser: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        email: { type: 'string', format: 'email' },
        username: { type: 'string' },
        profilePictureUrl: { type: 'string', nullable: true },
        role: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            privileges: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string', format: 'uuid' },
                  name: { type: 'string' },
                },
                required: ['id', 'name'],
              },
            },
          },
          required: ['id', 'name', 'privileges'],
        },
        isActive: { type: 'boolean' },
      },
      required: ['id', 'email', 'username', 'profilePictureUrl', 'role', 'isActive'],
    },
  },
  paths: {
    '/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Get the current user with their role and privileges',
        security: [{ cookieAuth: [] }],
        responses: {
          200: {
            description: 'Authenticated user from the current session.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    user: { $ref: '#/components/schemas/AuthenticatedUser' },
                  },
                  required: ['user'],
                },
              },
            },
          },
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
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Log in',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string', minLength: 8 },
                },
                required: ['email', 'password'],
              },
            },
          },
        },
        responses: {
          200: {
            description: 'User logged in.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    user: { $ref: '#/components/schemas/AuthenticatedUser' },
                  },
                  required: ['user'],
                },
              },
            },
          },
          401: {
            description: 'Invalid credentials.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          422: {
            description: 'Invalid request body.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ValidationErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Register a user account',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string', minLength: 8 },
                  username: { type: 'string', minLength: 3, maxLength: 25 },
                },
                required: ['email', 'password', 'username'],
              },
            },
          },
        },
        responses: {
          201: { description: 'User account created.' },
          409: {
            description: 'Email or username is already in use.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          422: {
            description: 'Invalid request body.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ValidationErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/auth/resend-mail': {
      post: {
        tags: ['Auth'],
        summary: 'Resend the account verification email',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  email: { type: 'string', format: 'email' },
                },
                required: ['email'],
              },
            },
          },
        },
        responses: {
          200: { description: 'Request processed.' },
          429: {
            description: 'Verification email resend cooldown is active.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          422: {
            description: 'Invalid request body.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ValidationErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/auth/verify-account': {
      get: {
        tags: ['Auth'],
        summary: 'Verify a user account',
        parameters: [
          {
            name: 'token',
            in: 'query',
            required: true,
            schema: { type: 'string', minLength: 1 },
          },
        ],
        responses: {
          200: { description: 'Account verified.' },
          400: {
            description: 'Verification token is invalid or expired.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          422: {
            description: 'Invalid verification token query.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ValidationErrorResponse' },
              },
            },
          },
        },
      },
    },
  },
};
