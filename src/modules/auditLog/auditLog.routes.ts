import { Router } from 'express';
import { requireAuth } from '../../middlewares/requireAuth';
import { requirePrivilege } from '../../middlewares/requirePrivilege';
import { AuditLogController } from './auditLog.controller';

const router = Router();
router.use(requireAuth, requirePrivilege('AUDIT_LOG:READ'));
router.get('/', AuditLogController.getLogs);
router.get('/:id', AuditLogController.getLog);
export default router;
