const swaggerAutogen = require('swagger-autogen')({
  openapi: '3.0.0',
});
const fg = require('fast-glob');
const fs = require('fs');
const authDocs = require('./src/modules/auth/docs/auth.docs');
const departmentDocs = require('./src/modules/department/docs/department.docs');
const healthDocs = require('./src/modules/health/docs/health.docs');
const warehouseDocs = require('./src/modules/warehouse/docs/warehouse.docs');
const commonDocs = require('./src/swagger/docs/common.docs');
const bolmaDocs = require('./src/modules/integrations/bolma/docs/bolma.docs');
const auditLogDocs = require('./src/modules/auditLog/docs/auditLog.docs');
const roleDocs = require('./src/modules/role/docs/role.docs');

const moduleDocs = [commonDocs, authDocs, healthDocs, departmentDocs, warehouseDocs, bolmaDocs, auditLogDocs, roleDocs];
const documentedPaths = Object.assign({}, ...moduleDocs.map(({ paths = {} }) => paths));

const doc = {
  info: {
    title: 'Behemot API',
    description: 'API documentation for the Behemot backend.',
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

swaggerAutogen(outputFile, endpointsFiles, doc).then(({ success }) => {
  if (!success) {
    process.exitCode = 1;
    return;
  }

  const generatedDocs = JSON.parse(fs.readFileSync(outputFile, 'utf8'));

  generatedDocs.paths = documentedPaths;
  Object.assign(generatedDocs.components.schemas, doc.components.schemas);

  fs.writeFileSync(outputFile, JSON.stringify(generatedDocs, null, 2));
});
