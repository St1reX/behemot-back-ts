const { createCrudDocs, object, text, uuid, namedRelation, departmentRelation, carModelRelation, carGenerationRelation } = require('../../../swagger/docs/crudDocs');

const decimal = { type: 'number', minimum: 0, maximum: 9999.99, multipleOf: 0.01 };
const dimension = { ...decimal, exclusiveMinimum: true };
// Prisma.Decimal.toJSON() returns a string; request bodies require JSON numbers.
const decimalResponse = { type: 'string', example: '34.99', description: 'Decimal serialized as a JSON string.' };
const fitment = object({
  id: uuid, isPrimary: { type: 'boolean' },
  carBrand: { ...namedRelation, nullable: true },
  carModel: { ...carModelRelation, nullable: true },
  carGeneration: { ...carGenerationRelation, nullable: true },
});
const fitmentInput = object({
  id: uuid, carBrandId: { ...uuid, nullable: true }, carModelId: { ...uuid, nullable: true },
  carGenerationId: { ...uuid, nullable: true }, isPrimary: { type: 'boolean' },
});
fitmentInput.required = ['isPrimary'];
const body = object({
  imagesUrls: { type: 'array', items: { ...text, format: 'uri' } },
  descriptionImagesUrls: { type: 'array', items: { ...text, format: 'uri' } },
  price: decimal,
  customName: { ...text, minLength: 1, maxLength: 255, nullable: true },
  customSummary: { ...text, nullable: true },
  customDescription: { ...text, nullable: true },
  internalNote: { ...text, nullable: true },
  side: { ...text, enum: ['LEFT', 'RIGHT', 'BOTH', 'NONE'] },
  weight: dimension, length: dimension, width: dimension, height: { ...dimension, nullable: true },
  sku: { ...text, minLength: 1 }, ean: { ...text, minLength: 1, nullable: true },
  oem: { type: 'array', items: { ...text, minLength: 1 } },
  warehouseLocation: { ...text, minLength: 1 },
  warehouseId: uuid, listingTemplateId: uuid, departmentId: uuid, producerId: uuid,
  productFitments: { type: 'array', items: fitmentInput, description: 'Optional full replacement of fitments, saved atomically with the product. Keep IDs of existing fitments. A non-empty list must have exactly one primary fitment.' },
});
body.required = body.required.filter((field) => !['customSummary', 'customDescription', 'productFitments'].includes(field));
const fields = { ...body.properties };
for (const field of ['warehouseId', 'listingTemplateId', 'departmentId', 'producerId']) {
  delete fields[field];
}

const docs = createCrudDocs({
  path: '/product', name: 'Product', tag: 'Products', entity: 'PRODUCT', body,
  properties: {
    ...fields,
    isLegacy: { type: 'boolean', readOnly: true },
    contentVersion: { type: 'integer', minimum: 0, readOnly: true },
    quantity: { type: 'integer', minimum: 0, nullable: true, readOnly: true },
    side: { ...fields.side, nullable: true },
    warehouseLocation: { ...text, nullable: true },
    price: { ...decimalResponse, nullable: true }, weight: { ...decimalResponse, nullable: true }, length: { ...decimalResponse, nullable: true },
    width: { ...decimalResponse, nullable: true }, height: { ...decimalResponse, nullable: true },
    title: { ...text, nullable: true }, summary: { ...text, nullable: true },
    description: { ...text, nullable: true }, listingContentError: { ...text, nullable: true },
    warehouse: { ...namedRelation, nullable: true }, listingTemplate: { ...namedRelation, nullable: true },
    department: { ...departmentRelation, nullable: true }, producer: { ...namedRelation, nullable: true },
    primaryFitment: { ...fitment, nullable: true }, productFitments: { type: 'array', items: fitment },
    externalListings: { type: 'array', items: object({
      id: uuid, integrationId: uuid, integration: namedRelation,
      lastSyncedContentVersion: { type: 'integer', minimum: 1, nullable: true }, channel: { ...text, enum: ['ALLEGRO', 'EMAG', 'ERLI', 'PRESTASHOP'] },
      externalId: { ...text, nullable: true }, syncStatus: { ...text, enum: ['PENDING', 'SYNCED', 'FAILED'] },
      lastSyncedAt: { ...text, format: 'date-time', nullable: true }, lastError: { ...text, nullable: true },
    }) },
  },
  description: 'The listing template must belong to the selected department. Active products have unique SKU; EAN may repeat. Fitments may specify only a brand, a model or a generation; parent IDs are normalized and validated. Removing a fitment linked to an active external listing is forbidden. Listing content is rendered from the template, with optional custom summary and description; rendering failures are returned in listingContentError. Without a template, customName, customSummary and customDescription are returned as content, with missing values left null and HTML sanitized. Import allows incomplete products. A full panel save takes over a legacy product and atomically increments contentVersion. Quantity is read-only. A product and its fitments may have multiple active listings on the same integration account and channel. Each external offer identity is unique within its integration account; distinct offer IDs remain separate listings. Synchronization is disabled until real updates are implemented.',
  deleteDescription: 'Soft deletes the product together with its non-deleted fitments and cross-references.',
});

const multipart = {
  schema: {
    type: 'object',
    required: ['data'],
    properties: {
      data: { type: 'string', description: 'JSON-encoded ProductInput. Existing image URLs are retained; uploaded files are appended.' },
      productPhotoes: { type: 'array', maxItems: 20, items: { type: 'string', format: 'binary' } },
      descProductPhotoes: { type: 'array', maxItems: 20, items: { type: 'string', format: 'binary' } },
    },
  },
};
docs.paths['/product'].post.requestBody.content['multipart/form-data'] = multipart;
docs.paths['/product/{id}'].put.requestBody.content['multipart/form-data'] = multipart;
module.exports = docs;
