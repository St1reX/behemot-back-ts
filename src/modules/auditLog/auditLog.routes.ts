import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth/requireAuth';
import { requirePrivilege } from '../../middlewares/auth/requirePrivilege';
import { ACTIONS } from '../../shared/constants/actions';
import { ENTITIES } from '../../shared/constants/entities';
import { AuditLogController } from './auditLog.controller';

const router = Router();
router.use(requireAuth, requirePrivilege(`${ENTITIES.AUDIT_LOG}:${ACTIONS.READ}`));
router.get('/', AuditLogController.getLogs);
router.get('/:id', AuditLogController.getLog);
export default router;
