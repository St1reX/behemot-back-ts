const { createCrudDocs, object, text } = require('../../../swagger/docs/crudDocs');

module.exports = createCrudDocs({
  path: '/contractor', name: 'Contractor', tag: 'Contractors', entity: 'CONTRACTOR',
  body: object({ name: { ...text, minLength: 1, maxLength: 100 } }),
  properties: { name: text },
  deleteDescription: 'A contractor referenced by a non-deleted product cross-reference cannot be deleted.',
});
