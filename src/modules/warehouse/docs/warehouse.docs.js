const warehouseSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    name: { type: 'string' },
    postalCode: { type: 'string' },
    city: { type: 'string' },
    street: { type: 'string' },
    buildingNumber: { type: 'string' },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
  required: [
    'id',
    'name',
    'postalCode',
    'city',
    'street',
    'buildingNumber',
    'createdAt',
    'updatedAt',
  ],
};

const warehouseBodySchema = {
  type: 'object',
  properties: {
    name: { type: 'string', minLength: 1, maxLength: 100 },
    postalCode: { type: 'string', minLength: 1, maxLength: 20 },
    city: { type: 'string', minLength: 1, maxLength: 100 },
    street: { type: 'string', minLength: 1, maxLength: 100 },
    buildingNumber: { type: 'string', minLength: 1, maxLength: 20 },
  },
};

const warehouseIdParameter = {
  name: 'id',
  in: 'path',
  required: true,
  schema: { type: 'string', format: 'uuid' },
};

module.exports = {
  tags: [{ name: 'Warehouses', description: 'Warehouse management.' }],
  schemas: {
    Warehouse: warehouseSchema,
  },
  paths: {
    '/warehouse': {
      get: {
        tags: ['Warehouses'],
        summary: 'List active warehouses',
        security: [{ cookieAuth: [] }],
        responses: {
          200: {
            description: 'Active warehouses.',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/Warehouse' },
                },
              },
            },
          },
          401: { description: 'Authentication required.' },
          403: { description: 'Insufficient privileges.' },
        },
      },
      post: {
        tags: ['Warehouses'],
        summary: 'Create a warehouse',
        security: [{ cookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                ...warehouseBodySchema,
                required: ['name', 'postalCode', 'city', 'street', 'buildingNumber'],
              },
            },
          },
        },
        responses: {
          201: { description: 'Warehouse created.' },
          409: { description: 'Warehouse name is already in use.' },
          422: { description: 'Invalid request body.' },
        },
      },
    },
    '/warehouse/{id}': {
      get: {
        tags: ['Warehouses'],
        summary: 'Get an active warehouse',
        security: [{ cookieAuth: [] }],
        parameters: [warehouseIdParameter],
        responses: {
          200: { description: 'Warehouse details.' },
          404: { description: 'Warehouse not found.' },
          422: { description: 'Invalid warehouse identifier.' },
        },
      },
      patch: {
        tags: ['Warehouses'],
        summary: 'Update an active warehouse',
        security: [{ cookieAuth: [] }],
        parameters: [warehouseIdParameter],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: warehouseBodySchema,
            },
          },
        },
        responses: {
          200: { description: 'Warehouse updated.' },
          404: { description: 'Warehouse not found.' },
          409: { description: 'Warehouse name is already in use.' },
          422: { description: 'Invalid request data.' },
        },
      },
      delete: {
        tags: ['Warehouses'],
        summary: 'Soft delete a warehouse',
        security: [{ cookieAuth: [] }],
        parameters: [warehouseIdParameter],
        responses: {
          200: { description: 'Warehouse deleted.' },
          404: { description: 'Warehouse not found.' },
          409: { description: 'Warehouse is assigned to an active product.' },
          422: { description: 'Invalid warehouse identifier.' },
        },
      },
    },
  },
};
