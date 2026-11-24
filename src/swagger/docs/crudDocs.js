// Shared OpenAPI shapes for the existing CRUD endpoints. No application modules are loaded.
const uuid = { type: 'string', format: 'uuid' };
const text = { type: 'string' };
const timestamps = {
  createdAt: { type: 'string', format: 'date-time' },
  updatedAt: { type: 'string', format: 'date-time' },
};
const object = (properties) => ({ type: 'object', properties, required: Object.keys(properties) });
const ref = (name) => ({ $ref: `#/components/schemas/${name}` });
const json = (schema) => ({ 'application/json': { schema } });
const response = (description, schema) => ({ description, content: json(schema) });
const idParameter = (name = 'id') => ({ name, in: 'path', required: true, schema: uuid });
const namedRelation = object({ id: uuid, name: text });
const productRelation = object({ id: uuid, sku: text });
const departmentRelation = object({ id: uuid, name: text, shortcut: text });
const carModelRelation = object({ id: uuid, name: text, carBrand: namedRelation });
const carGenerationRelation = object({
  id: uuid,
  startProduction: { type: 'integer' },
  endProduction: { type: 'integer', nullable: true },
  carModel: carModelRelation,
});
const errors = {
  401: response('Authentication required.', ref('ErrorResponse')),
  403: response('Insufficient privileges.', ref('ErrorResponse')),
  404: response('Resource or related record not found.', ref('ErrorResponse')),
  409: response('Duplicate data or a relationship prevents this operation.', ref('ErrorResponse')),
  422: response('Invalid request data.', ref('ValidationErrorResponse')),
};

function createCrudDocs({ path, name, tag, entity, body, properties, description = '', deleteDescription = '' }) {
  const access = { tags: [tag], security: [{ cookieAuth: [] }] };
  const item = ref(name);
  const requestBody = { required: true, content: json(ref(`${name}Input`)) };
  return {
    tags: [{ name: tag, description: `${entity} management. ${description}`.trim() }],
    schemas: { [name]: object({ id: uuid, ...properties, ...timestamps }), [`${name}Input`]: body },
    paths: {
      [path]: {
        get: {
          ...access, summary: `List records (${entity}:READ)`,
          responses: { 401: errors[401], 403: errors[403], 200: response('Non-deleted records.', { type: 'array', items: item }) },
        },
        post: {
          ...access, summary: `Create a record (${entity}:CREATE)`, requestBody,
          responses: { ...errors, 201: response('Record created.', item) },
        },
      },
      [`${path}/{id}`]: {
        get: {
          ...access, summary: `Get a record (${entity}:READ)`, parameters: [idParameter()],
          responses: { ...errors, 200: response('Record details.', item) },
        },
        put: {
          ...access, summary: `Update a record (${entity}:UPDATE)`, parameters: [idParameter()],
          description: 'All input fields are required, including nullable fields. ' + description,
          requestBody, responses: { ...errors, 200: response('Record updated.', item) },
        },
        delete: {
          ...access, summary: `Soft delete a record (${entity}:DELETE)`, parameters: [idParameter()],
          description: deleteDescription,
          responses: { ...errors, 200: response('Record deleted.', ref('MessageResponse')) },
        },
      },
    },
  };
}

function optionalPaginatedList({ name, tag, entity, parameters = [], searchDescription = 'Filter names (case-insensitive).' }) {
  return {
    get: {
      tags: [tag], security: [{ cookieAuth: [] }], summary: `List records (${entity}:READ)`,
      description: 'Without page and pageSize, returns the complete array. Supplying either parameter enables pagination. Search applies only to paginated results.',
      parameters: [
        ...parameters,
        { name: 'page', in: 'query', description: 'Enables pagination. Defaults to 1 when only pageSize is supplied.', schema: { type: 'integer', minimum: 1, maximum: 100000 } },
        { name: 'pageSize', in: 'query', description: 'Enables pagination. Defaults to 25 when only page is supplied.', schema: { type: 'integer', minimum: 1, maximum: 100 } },
        { name: 'search', in: 'query', description: searchDescription, schema: { type: 'string', maxLength: 100 } },
      ],
      responses: {
        401: errors[401], 403: errors[403], 404: errors[404], 422: errors[422],
        200: response('The complete array, or a page of records with the filtered total.', { oneOf: [
          { type: 'array', items: ref(name) },
          object({
            items: { type: 'array', items: ref(name) },
            total: { type: 'integer', minimum: 0 },
            page: { type: 'integer', minimum: 1 },
            pageSize: { type: 'integer', minimum: 1, maximum: 100 },
          }),
        ] }),
      },
    },
  };
}

module.exports = {
  uuid, text, object, ref, json, response, idParameter, errors, namedRelation, productRelation,
  departmentRelation, carModelRelation, carGenerationRelation, createCrudDocs, optionalPaginatedList,
};
