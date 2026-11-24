const { createCrudDocs, object, text } = require('../../../swagger/docs/crudDocs');

const fields = {
  name: { ...text, minLength: 1, maxLength: 100 },
  postalCode: { ...text, minLength: 1, maxLength: 20 },
  city: { ...text, minLength: 1, maxLength: 100 },
  street: { ...text, minLength: 1, maxLength: 100 },
  buildingNumber: { ...text, minLength: 1, maxLength: 20 },
};
module.exports = createCrudDocs({
  path: '/warehouse', name: 'Warehouse', tag: 'Warehouses', entity: 'WAREHOUSE',
  body: object(fields), properties: fields,
  description: 'The name must be available among non-deleted warehouses.',
  deleteDescription: 'A warehouse assigned to a non-deleted product cannot be deleted.',
});
