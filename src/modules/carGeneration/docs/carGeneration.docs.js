const { createCrudDocs, object, uuid, carModelRelation, idParameter, optionalPaginatedList } = require('../../../swagger/docs/crudDocs');

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

const searchDescription = 'Exact start or end production year, or "obecnie" for ongoing production.';
docs.paths['/car-generation'].get = optionalPaginatedList({
  name: 'CarGeneration', tag: 'Car generations', entity: 'CAR_GENERATION', searchDescription,
}).get;
docs.paths['/car-generation/model/{carModelId}'] = optionalPaginatedList({
  name: 'CarGeneration', tag: 'Car generations', entity: 'CAR_GENERATION', parameters: [idParameter('carModelId')],
  searchDescription,
});
module.exports = docs;
