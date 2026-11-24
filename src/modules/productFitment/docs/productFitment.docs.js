const { createCrudDocs, object, uuid, productRelation, namedRelation, carModelRelation, carGenerationRelation } = require('../../../swagger/docs/crudDocs');

const body = object({
  productId: uuid, carBrandId: { ...uuid, nullable: true }, carModelId: { ...uuid, nullable: true },
  carGenerationId: { ...uuid, nullable: true }, isPrimary: { type: 'boolean' },
});
body.required = ['productId', 'isPrimary'];

module.exports = createCrudDocs({
  path: '/product-fitment', name: 'ProductFitment', tag: 'Product fitments', entity: 'PRODUCT_FITMENT',
  body,
  properties: {
    product: productRelation, carBrand: { ...namedRelation, nullable: true },
    carModel: { ...carModelRelation, nullable: true }, carGeneration: { ...carGenerationRelation, nullable: true },
    isPrimary: { type: 'boolean' },
  },
  description: 'A product can have at most one primary fitment and one fitment for a given brand/model/generation combination. Supply at least one vehicle ID; parent IDs are normalized and validated. A fitment cannot be moved to another product.',
  deleteDescription: 'Primary fitments and fitments linked to active external listings cannot be deleted directly.',
});
