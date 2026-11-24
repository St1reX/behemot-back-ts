const { createCrudDocs, object, text, uuid, namedRelation, idParameter, optionalPaginatedList } = require('../../../swagger/docs/crudDocs');

const docs = createCrudDocs({
  path: '/car-model', name: 'CarModel', tag: 'Car models', entity: 'CAR_MODEL',
  body: object({ name: { ...text, minLength: 1, maxLength: 100 }, carBrandId: uuid }),
  properties: { name: text, carBrand: namedRelation },
  deleteDescription: 'A model with non-deleted generations cannot be deleted.',
});

docs.paths['/car-model'].get = optionalPaginatedList({ name: 'CarModel', tag: 'Car models', entity: 'CAR_MODEL' }).get;
docs.paths['/car-model/brand/{carBrandId}'] = optionalPaginatedList({
  name: 'CarModel', tag: 'Car models', entity: 'CAR_MODEL', parameters: [idParameter('carBrandId')],
});
module.exports = docs;
