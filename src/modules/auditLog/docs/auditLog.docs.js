const auditLogSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    userId: { type: 'string', format: 'uuid' },
    username: { type: 'string', nullable: true },
    entityName: { type: 'string' },
    entityId: { type: 'string' },
    action: { type: 'string' },
    operationStatus: { type: 'string', enum: ['SUCCESS', 'FAILED', 'PENDING'] },
    comment: { type: 'string', nullable: true },
    sourceIp: { type: 'string', nullable: true },
    requestId: { type: 'string', nullable: true },
    isSuspicious: { type: 'boolean' },
    suspiciousReason: { type: 'string', nullable: true },
    createdAt: { type: 'string', format: 'date-time' },
  },
};

const errorResponses = {
  401: { description: 'Authentication required.' },
  403: { description: 'AUDIT_LOG:READ privilege required.' },
  422: { description: 'Invalid query or identifier.' },
};

module.exports = {
  tags: [{ name: 'Audit logs', description: 'Read-only operation history.' }],
  schemas: { AuditLog: auditLogSchema },
  paths: {
    '/audit-log': {
      get: {
        tags: ['Audit logs'],
        summary: 'Read operation history, newest first',
        security: [{ cookieAuth: [] }],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100000, default: 1 } },
          { name: 'pageSize', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 25 } },
          ...['search', 'entityName', 'action', 'operationStatus'].map((name) => ({ name, in: 'query', schema: { type: 'string' } })),
          ...['from', 'to'].map((name) => ({ name, in: 'query', schema: { type: 'string', format: 'date-time' } })),
        ],
        responses: {
          ...errorResponses,
          200: {
            description: 'Paginated history without data snapshots.',
            content: { 'application/json': { schema: {
              type: 'object',
              properties: {
                items: { type: 'array', items: { $ref: '#/components/schemas/AuditLog' } },
                total: { type: 'integer' }, page: { type: 'integer' }, pageSize: { type: 'integer' },
              },
            } } },
          },
        },
      },
    },
    '/audit-log/{id}': {
      get: {
        tags: ['Audit logs'],
        summary: 'Read one entry with before/after snapshots',
        security: [{ cookieAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          ...errorResponses,
          404: { description: 'Entry not found.' },
          200: {
            description: 'Audit entry with snapshots.',
            content: { 'application/json': { schema: {
              allOf: [
                { $ref: '#/components/schemas/AuditLog' },
                { type: 'object', properties: { dataBefore: { nullable: true }, dataAfter: { nullable: true } } },
              ],
            } } },
          },
        },
      },
    },
  },
};
