const { createCrudDocs, object, text, optionalPaginatedList } = require('../../../swagger/docs/crudDocs');

const docs = createCrudDocs({
  path: '/car-brand', name: 'CarBrand', tag: 'Car brands', entity: 'CAR_BRAND',
  body: object({ name: { ...text, minLength: 1, maxLength: 100 } }),
  properties: { name: text },
  deleteDescription: 'A brand with non-deleted models cannot be deleted.',
});

docs.paths['/car-brand'].get = optionalPaginatedList({ name: 'CarBrand', tag: 'Car brands', entity: 'CAR_BRAND' }).get;
module.exports = docs;
