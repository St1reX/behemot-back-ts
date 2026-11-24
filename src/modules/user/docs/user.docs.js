const optionSchema = {
  type: 'object',
  properties: { id: { type: 'string', format: 'uuid' }, name: { type: 'string' } },
  required: ['id', 'name'],
};
const bodySchema = {
  type: 'object',
  properties: {
    username: { type: 'string', minLength: 3, maxLength: 25 },
    email: { type: 'string', format: 'email' },
    roleId: { type: 'string', format: 'uuid' },
    isActive: { type: 'boolean' },
  },
  required: ['username', 'email', 'roleId', 'isActive'],
};
const userSchema = {
  type: 'object',
  properties: {
    ...bodySchema.properties,
    id: { type: 'string', format: 'uuid' },
    role: optionSchema,
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
  required: ['id', 'username', 'email', 'roleId', 'role', 'isActive', 'createdAt', 'updatedAt'],
};
const common = {
  tags: ['Users'],
  security: [{ cookieAuth: [] }],
};
const errors = {
  401: { description: 'Authentication required.' },
  403: { description: 'Insufficient privileges or forbidden own-account operation.' },
  404: { description: 'User or role not found.' },
  409: { description: 'Email or username already reserved, including soft-deleted accounts.' },
  422: { description: 'Invalid request data.' },
};
const json = (schema) => ({ 'application/json': { schema } });
const userReference = { $ref: '#/components/schemas/ManagedUser' };
const idParameter = { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } };

module.exports = {
  tags: [{ name: 'Users', description: 'User management. Requires corresponding USER privileges.' }],
  schemas: { ManagedUser: userSchema },
  paths: {
    '/user': {
      get: {
        ...common, summary: 'List users that have not been deleted',
        responses: { ...errors, 200: { description: 'Users.', content: json({ type: 'array', items: userReference }) } },
      },
      post: {
        ...common, summary: 'Create an account with an administrator-provided password',
        description: 'Active accounts can log in immediately. No verification email is sent.',
        requestBody: { required: true, content: json({
          ...bodySchema,
          properties: { ...bodySchema.properties, password: { type: 'string', minLength: 8, writeOnly: true } },
          required: [...bodySchema.required, 'password'],
        }) },
        responses: { ...errors, 201: { description: 'User created.', content: json(userReference) } },
      },
    },
    '/user/form-options': {
      get: {
        ...common, summary: 'List available roles for the user editor',
        description: 'Requires USER:CREATE or USER:UPDATE.',
        responses: { ...errors, 200: { description: 'Editor options.', content: json({
          type: 'object', properties: {
            roles: { type: 'array', items: optionSchema },
          },
          required: ['roles'],
        }) } },
      },
    },
    '/user/{id}': {
      get: {
        ...common, parameters: [idParameter], summary: 'Get a user',
        responses: { ...errors, 200: { description: 'User.', content: json(userReference) } },
      },
      put: {
        ...common, parameters: [idParameter], summary: 'Update user data, role and status',
        description: 'Cannot change own role or deactivate own account. Password is not changed. Status or email changes invalidate pending verification links; saving an inactive account also invalidates its pending links.',
        requestBody: { required: true, content: json(bodySchema) },
        responses: { ...errors, 200: { description: 'User updated.', content: json(userReference) } },
      },
      delete: {
        ...common, parameters: [idParameter], summary: 'Soft delete a user',
        description: 'Cannot delete own account. The email and username remain reserved.',
        responses: { ...errors, 200: { description: 'User deleted.', content: json({ $ref: '#/components/schemas/MessageResponse' }) } },
      },
    },
  },
};
