const { createCrudDocs, object, text, uuid, departmentRelation, response, errors, json } = require('../../../swagger/docs/crudDocs');

const templateFields = {
  titleTemplate: { ...text, description: 'Single-line plain text. Supports known {{name}} placeholders; HTML is rejected.' },
  summaryTemplate: { ...text, description: 'Sanitized HTML or plain text, with known {{name}} placeholders.' },
  descriptionTemplate: { ...text, description: 'Sanitized HTML or plain text, with known {{name}} placeholders.' },
};
const docs = createCrudDocs({
  path: '/product-listing-template', name: 'ProductListingTemplate', tag: 'Product listing templates', entity: 'PRODUCT_LISTING_TEMPLATE',
  body: object({ name: { ...text, minLength: 1, maxLength: 100 }, ...templateFields, departmentId: uuid }),
  properties: { name: text, ...templateFields, department: departmentRelation },
  description: 'Name is trimmed and must be available among non-deleted templates. All template fields must contain text. Unknown or malformed placeholders are rejected. Rich text is sanitized before saving.',
  deleteDescription: 'A template assigned to a non-deleted product cannot be deleted.',
});
const access = {
  tags: ['Product listing templates'], security: [{ cookieAuth: [] }],
  description: 'Requires any one of PRODUCT_LISTING_TEMPLATE:READ, PRODUCT_LISTING_TEMPLATE:CREATE or PRODUCT_LISTING_TEMPLATE:UPDATE.',
};
docs.paths['/product-listing-template/placeholders'] = {
  get: {
    ...access, summary: 'List supported placeholders and example values',
    responses: { 401: errors[401], 403: errors[403], 200: response('Case-sensitive placeholder names.', {
      type: 'array', items: object({ name: text, label: text, description: text, optional: { type: 'boolean' }, example: text }),
    }) },
  },
};
docs.paths['/product-listing-template/preview'] = {
  post: {
    ...access, summary: 'Render a template using example product data',
    requestBody: { required: true, content: json(object(templateFields)) },
    responses: { 401: errors[401], 403: errors[403], 422: errors[422], 200: response('Rendered content. Preview accepts empty template strings.', object({ title: text, summary: text, description: text })) },
  },
};
module.exports = docs;
