const { createCrudDocs, object, uuid, carModelRelation, idParameter, errors, response, ref } = require('../../../swagger/docs/crudDocs');

const docs = createCrudDocs({
  path: '/car-generation', name: 'CarGeneration', tag: 'Car generations', entity: 'CAR_GENERATION',
  body: object({
    startProduction: { type: 'integer', minimum: 1886 },
    endProduction: { type: 'integer', minimum: 1886, nullable: true },
    carModelId: uuid,
  }),
  properties: { startProduction: { type: 'integer' }, endProduction: { type: 'integer', nullable: true }, carModel: carModelRelation },
  description: 'endProduction must be null or greater than or equal to startProduction.',
  deleteDescription: 'A generation referenced by a non-deleted product fitment cannot be deleted.',
});
docs.paths['/car-generation/model/{carModelId}'] = {
  get: {
    tags: ['Car generations'], security: [{ cookieAuth: [] }], summary: 'List generations of a model (CAR_GENERATION:READ)',
    parameters: [idParameter('carModelId')],
    responses: { ...errors, 200: response('Generations of the selected non-deleted model.', { type: 'array', items: ref('CarGeneration') }) },
  },
};
module.exports = docs;
