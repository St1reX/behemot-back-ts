const swaggerAutogen = require('swagger-autogen')({
  openapi: '3.0.0',
});
const fg = require('fast-glob');
const fs = require('fs');
const path = require('path');
const commonDocs = require('./src/swagger/docs/common.docs');
const operationsDocs = require('./src/swagger/docs/operations.docs');

const moduleDocs = [commonDocs, operationsDocs, ...fg.sync('./src/modules/**/docs/*.docs.js').sort().map((file) => require(path.resolve(file)))];
const documentedPaths = Object.assign({}, ...moduleDocs.map(({ paths = {} }) => paths));

const doc = {
  info: {
    title: 'Behemot API',
    description: 'Session-cookie authentication: log in through POST /auth/login, then reuse the behemot-api-sid cookie. Bearer tokens are not supported. CRUD lists exclude soft-deleted records. Global rate limit: 200 requests per IP per 10 minutes. Validation errors use HTTP 422 with error.issues.',
    version: '1.0.0',
  },
  servers: [{ url: '/' }],
  tags: moduleDocs.flatMap(({ tags = [] }) => tags),
  components: {
    securitySchemes: Object.assign(
      {},
      ...moduleDocs.map(({ securitySchemes = {} }) => securitySchemes),
    ),
    schemas: Object.assign({}, ...moduleDocs.map(({ schemas = {} }) => schemas)),
  },
};

const outputFile = './src/swagger/swagger_output.json';
const endpointsFiles = fg.sync('./src/modules/**/*.routes.ts');

// Compare source declarations without importing routes (which would connect to services).
const declaredOperations = new Set(['get /metrics']);
for (const file of endpointsFiles) {
  const modulePath = path.relative('./src/modules', path.dirname(file)).split(path.sep).join('/')
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
  const source = fs.readFileSync(file, 'utf8');
  for (const [, method, route] of source.matchAll(/router\.(get|post|put|patch|delete)\(\s*['"]([^'"]+)['"]/g)) {
    const routePath = `/${modulePath}${route === '/' ? '' : route}`.replace(/:([\w]+)/g, '{$1}');
    declaredOperations.add(`${method} ${routePath}`);
  }
}
const documentedOperations = new Set(Object.entries(documentedPaths).flatMap(([route, methods]) =>
  Object.keys(methods).map((method) => `${method} ${route}`),
));
const missing = [...declaredOperations].filter((operation) => !documentedOperations.has(operation));
const obsolete = [...documentedOperations].filter((operation) => !declaredOperations.has(operation));
if (missing.length || obsolete.length) {
  throw new Error(`OpenAPI route mismatch. Missing: ${missing.join(', ')}. Obsolete: ${obsolete.join(', ')}.`);
}

for (const methods of Object.values(documentedPaths)) {
  for (const operation of Object.values(methods)) {
    const statuses = {
      400: 'Malformed JSON body.', 413: 'Request body exceeds the size limit.',
      429: 'Too many requests.', 500: 'Internal server error.',
    };
    for (const [status, description] of Object.entries(statuses)) {
      operation.responses[status] ??= { description };
    }
    for (const [status, result] of Object.entries(operation.responses)) {
      if (Number(status) >= 400 && !result.content) {
        result.content = { 'application/json': { schema: {
          $ref: `#/components/schemas/${status === '422' ? 'ValidationErrorResponse' : 'ErrorResponse'}`,
        } } };
      }
    }
  }
}

swaggerAutogen(outputFile, endpointsFiles, doc).then(({ success }) => {
  if (!success) {
    process.exitCode = 1;
    return;
  }

  const generatedDocs = JSON.parse(fs.readFileSync(outputFile, 'utf8'));

  generatedDocs.paths = documentedPaths;
  Object.assign(generatedDocs.components.schemas, doc.components.schemas);

  fs.writeFileSync(outputFile, JSON.stringify(generatedDocs, null, 2));
  console.log(`Documented ${documentedOperations.size} operations; route coverage is complete.`);
});
