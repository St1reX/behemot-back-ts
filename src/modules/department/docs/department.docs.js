const { createCrudDocs, object, text } = require('../../../swagger/docs/crudDocs');

module.exports = createCrudDocs({
  path: '/department', name: 'Department', tag: 'Departments', entity: 'DEPARTMENT',
  body: object({ name: { ...text, minLength: 1, maxLength: 100 }, shortcut: { ...text, minLength: 1, maxLength: 2 } }),
  properties: { name: text, shortcut: text },
  description: 'The shortcut is converted to uppercase. Name and shortcut must be available among non-deleted departments.',
  deleteDescription: 'A department referenced by a non-deleted product or listing template cannot be deleted. Users have no department relationship.',
});
