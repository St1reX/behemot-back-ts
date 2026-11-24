const privilegeSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    name: { type: 'string' },
  },
  required: ['id', 'name'],
};

const roleSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    name: { type: 'string' },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
  required: ['id', 'name', 'createdAt', 'updatedAt'],
};

const privilegeIdsSchema = { type: 'array', items: { type: 'string', format: 'uuid' } };
const roleBodySchema = {
  type: 'object',
  properties: {
    name: { type: 'string', minLength: 1, maxLength: 100 },
    privilegeIds: privilegeIdsSchema,
  },
};
const roleIdParameter = { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } };
const roleAccess = { tags: ['Roles'], security: [{ cookieAuth: [] }] };
const errorResponses = {
  401: { description: 'Authentication required.' },
  403: { description: 'Insufficient privileges or an attempt to edit your own role.' },
  404: { description: 'Role or selected privilege not found.' },
  422: { description: 'Invalid request data.' },
};
const privilegeUpdateBody = {
  required: true,
  content: {
    'application/json': {
      schema: {
        type: 'object',
        properties: { privilegeIds: { ...privilegeIdsSchema, minItems: 1 } },
        required: ['privilegeIds'],
      },
    },
  },
};

module.exports = {
  tags: [{ name: 'Roles', description: 'Roles and assigned privileges.' }],
  schemas: {
    Role: roleSchema,
    RolePrivilege: privilegeSchema,
    RoleDetails: {
      ...roleSchema,
      properties: { ...roleSchema.properties, privileges: { type: 'array', items: privilegeSchema } },
      required: [...roleSchema.required, 'privileges'],
    },
  },
  paths: {
    '/role': {
      get: {
        ...roleAccess,
        summary: 'List active roles (ROLE:READ)',
        responses: {
          ...errorResponses,
          200: { description: 'Active roles.', content: { 'application/json': { schema: { type: 'array', items: roleSchema } } } },
        },
      },
      post: {
        ...roleAccess,
        summary: 'Create a role with privileges (ROLE:CREATE)',
        description: 'Name and privileges are created together with ROLE:CREATE. Omitted privilegeIds defaults to an empty array.',
        requestBody: { required: true, content: { 'application/json': { schema: { ...roleBodySchema, required: ['name'] } } } },
        responses: { ...errorResponses, 201: { description: 'Role created.' }, 409: { description: 'Role name is already in use.' } },
      },
    },
    '/role/privileges': {
      get: {
        ...roleAccess,
        summary: 'List available privileges (ROLE:READ)',
        responses: {
          ...errorResponses,
          200: { description: 'Active privileges.', content: { 'application/json': { schema: { type: 'array', items: privilegeSchema } } } },
        },
      },
    },
    '/role/{id}': {
      get: {
        ...roleAccess,
        summary: 'Get a role with privileges (ROLE:READ)',
        parameters: [roleIdParameter],
        responses: { ...errorResponses, 200: { description: 'Role details.', content: { 'application/json': { schema: { $ref: '#/components/schemas/RoleDetails' } } } } },
      },
      put: {
        ...roleAccess,
        summary: 'Replace role name and privileges (ROLE:UPDATE)',
        description: 'Updates name and the complete set of privileges atomically. An empty array removes all privileges. Editing your own role is forbidden.',
        parameters: [roleIdParameter],
        requestBody: { required: true, content: { 'application/json': { schema: { ...roleBodySchema, required: ['name', 'privilegeIds'] } } } },
        responses: { ...errorResponses, 200: { description: 'Role updated.' }, 409: { description: 'Role name is already in use.' } },
      },
      delete: {
        ...roleAccess,
        summary: 'Soft delete a role (ROLE:DELETE)',
        parameters: [roleIdParameter],
        responses: { ...errorResponses, 200: { description: 'Role deleted.' }, 409: { description: 'Role is assigned to users.' } },
      },
    },
    '/role/{id}/privileges': {
      post: {
        ...roleAccess,
        summary: 'Grant privileges (ROLE:UPDATE)',
        parameters: [roleIdParameter],
        requestBody: privilegeUpdateBody,
        responses: { ...errorResponses, 200: { description: 'Privileges granted.' } },
      },
      delete: {
        ...roleAccess,
        summary: 'Revoke privileges (ROLE:UPDATE)',
        parameters: [roleIdParameter],
        requestBody: privilegeUpdateBody,
        responses: { ...errorResponses, 200: { description: 'Privileges revoked.' } },
      },
    },
  },
};
