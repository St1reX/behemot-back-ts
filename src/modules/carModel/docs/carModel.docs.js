const { createCrudDocs, object, text, uuid, namedRelation, idParameter, errors, response, ref } = require('../../../swagger/docs/crudDocs');

const docs = createCrudDocs({
  path: '/car-model', name: 'CarModel', tag: 'Car models', entity: 'CAR_MODEL',
  body: object({ name: { ...text, minLength: 1, maxLength: 100 }, carBrandId: uuid }),
  properties: { name: text, carBrand: namedRelation },
  deleteDescription: 'A model with non-deleted generations cannot be deleted.',
});
docs.paths['/car-model/brand/{carBrandId}'] = {
  get: {
    tags: ['Car models'], security: [{ cookieAuth: [] }], summary: 'List models of a brand (CAR_MODEL:READ)',
    parameters: [idParameter('carBrandId')],
    responses: { ...errors, 200: response('Models of the selected non-deleted brand.', { type: 'array', items: ref('CarModel') }) },
  },
};
module.exports = docs;
