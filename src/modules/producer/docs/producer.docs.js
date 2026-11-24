const { createCrudDocs, object, text } = require('../../../swagger/docs/crudDocs');

module.exports = createCrudDocs({
  path: '/producer', name: 'Producer', tag: 'Producers', entity: 'PRODUCER',
  body: object({ name: { ...text, minLength: 1, maxLength: 100 } }),
  properties: { name: text },
  deleteDescription: 'A producer referenced by a non-deleted product cannot be deleted.',
});
