const { createCrudDocs, object, uuid, productRelation, carGenerationRelation } = require('../../../swagger/docs/crudDocs');

module.exports = createCrudDocs({
  path: '/product-fitment', name: 'ProductFitment', tag: 'Product fitments', entity: 'PRODUCT_FITMENT',
  body: object({ productId: uuid, carGenerationId: uuid, isPrimary: { type: 'boolean' } }),
  properties: { product: productRelation, carGeneration: carGenerationRelation, isPrimary: { type: 'boolean' } },
  description: 'A product can have at most one primary fitment and one fitment for a given car generation.',
  deleteDescription: 'The primary fitment cannot be deleted directly.',
});
