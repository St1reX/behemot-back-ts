const { createCrudDocs, object, text, uuid, namedRelation, departmentRelation, carGenerationRelation } = require('../../../swagger/docs/crudDocs');

const decimal = { type: 'number', minimum: 0, maximum: 9999.99, multipleOf: 0.01 };
const dimension = { ...decimal, exclusiveMinimum: true };
// Prisma.Decimal.toJSON() returns a string; request bodies require JSON numbers.
const decimalResponse = { type: 'string', example: '34.99', description: 'Decimal serialized as a JSON string.' };
const fitment = object({ id: uuid, isPrimary: { type: 'boolean' }, carGeneration: carGenerationRelation });
const body = object({
  imagesUrls: { type: 'array', items: { ...text, format: 'uri' } },
  descriptionImagesUrls: { type: 'array', items: { ...text, format: 'uri' } },
  price: decimal,
  quantity: { type: 'integer', minimum: 0 },
  customName: { ...text, minLength: 1, maxLength: 255, nullable: true },
  internalNote: { ...text, nullable: true },
  side: { ...text, enum: ['LEFT', 'RIGHT', 'BOTH', 'NONE'] },
  weight: dimension, length: dimension, width: dimension, height: { ...dimension, nullable: true },
  sku: { ...text, minLength: 1 }, ean: { ...text, minLength: 1, nullable: true },
  oem: { type: 'array', items: { ...text, minLength: 1 } },
  warehouseLocation: { ...text, minLength: 1 },
  warehouseId: uuid, listingTemplateId: uuid, departmentId: uuid, producerId: uuid,
});
const fields = { ...body.properties };
for (const field of ['warehouseId', 'listingTemplateId', 'departmentId', 'producerId']) {
  delete fields[field];
}

module.exports = createCrudDocs({
  path: '/product', name: 'Product', tag: 'Products', entity: 'PRODUCT', body,
  properties: {
    ...fields,
    price: decimalResponse, weight: decimalResponse, length: decimalResponse,
    width: decimalResponse, height: { ...decimalResponse, nullable: true },
    title: { ...text, nullable: true }, summary: { ...text, nullable: true },
    description: { ...text, nullable: true }, listingContentError: { ...text, nullable: true },
    warehouse: namedRelation, listingTemplate: namedRelation, department: departmentRelation, producer: namedRelation,
    primaryFitment: { ...fitment, nullable: true }, productFitments: { type: 'array', items: fitment },
  },
  description: 'The listing template must belong to the selected department. SKU and non-null EAN must be available. Listing content is rendered from the template; rendering failures are returned in listingContentError. Updating a product queues listing synchronization.',
  deleteDescription: 'Soft deletes the product together with its non-deleted fitments and cross-references.',
});
