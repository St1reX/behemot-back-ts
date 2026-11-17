const departmentSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    name: { type: 'string' },
    shortcut: { type: 'string', minLength: 2, maxLength: 2 },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
  required: ['id', 'name', 'shortcut', 'createdAt', 'updatedAt'],
};

const departmentBodySchema = {
  type: 'object',
  properties: {
    name: { type: 'string', minLength: 1, maxLength: 100 },
    shortcut: { type: 'string', minLength: 2, maxLength: 2 },
  },
};

const departmentIdParameter = {
  name: 'id',
  in: 'path',
  required: true,
  schema: { type: 'string', format: 'uuid' },
};

module.exports = {
  tags: [{ name: 'Departments', description: 'Department management.' }],
  schemas: {
    Department: departmentSchema,
  },
  paths: {
    '/department': {
      get: {
        tags: ['Departments'],
        summary: 'List active departments',
        security: [{ cookieAuth: [] }],
        responses: {
          200: {
            description: 'Active departments.',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/Department' },
                },
              },
            },
          },
          401: { description: 'Authentication required.' },
          403: { description: 'Insufficient privileges.' },
        },
      },
      post: {
        tags: ['Departments'],
        summary: 'Create a department',
        security: [{ cookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                ...departmentBodySchema,
                required: ['name', 'shortcut'],
              },
            },
          },
        },
        responses: {
          201: { description: 'Department created.' },
          409: { description: 'Department name or shortcut is already in use.' },
          422: { description: 'Invalid request body.' },
        },
      },
    },
    '/department/{id}': {
      get: {
        tags: ['Departments'],
        summary: 'Get an active department',
        security: [{ cookieAuth: [] }],
        parameters: [departmentIdParameter],
        responses: {
          200: { description: 'Department details.' },
          404: { description: 'Department not found.' },
          422: { description: 'Invalid department identifier.' },
        },
      },
      patch: {
        tags: ['Departments'],
        summary: 'Update an active department',
        security: [{ cookieAuth: [] }],
        parameters: [departmentIdParameter],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: departmentBodySchema,
            },
          },
        },
        responses: {
          200: { description: 'Department updated.' },
          404: { description: 'Department not found.' },
          409: { description: 'Department name or shortcut is already in use.' },
          422: { description: 'Invalid request data.' },
        },
      },
      delete: {
        tags: ['Departments'],
        summary: 'Soft delete a department',
        security: [{ cookieAuth: [] }],
        parameters: [departmentIdParameter],
        responses: {
          200: { description: 'Department deleted.' },
          404: { description: 'Department not found.' },
          409: { description: 'Department is assigned to an active resource.' },
          422: { description: 'Invalid department identifier.' },
        },
      },
    },
  },
};
