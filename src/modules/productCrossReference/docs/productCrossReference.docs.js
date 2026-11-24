const { createCrudDocs, object, text, uuid, productRelation, namedRelation } = require('../../../swagger/docs/crudDocs');

module.exports = createCrudDocs({
  path: '/product-cross-reference', name: 'ProductCrossReference', tag: 'Product cross-references', entity: 'PRODUCT_CROSS_REFERENCE',
  body: object({ productId: uuid, contractorId: uuid, contractorSku: { ...text, minLength: 1 }, contractorEan: { ...text, minLength: 1, nullable: true } }),
  properties: { product: productRelation, contractor: namedRelation, contractorSku: text, contractorEan: { ...text, nullable: true } },
  description: 'The product/contractor/SKU combination and each non-null contractor EAN must be available among non-deleted cross-references.',
});
