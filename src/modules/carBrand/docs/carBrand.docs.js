const { createCrudDocs, object, text } = require('../../../swagger/docs/crudDocs');

module.exports = createCrudDocs({
  path: '/car-brand', name: 'CarBrand', tag: 'Car brands', entity: 'CAR_BRAND',
  body: object({ name: { ...text, minLength: 1, maxLength: 100 } }),
  properties: { name: text },
  deleteDescription: 'A brand with non-deleted models cannot be deleted.',
});
