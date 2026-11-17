import { Router } from 'express';
import { requireAuth } from '../../middlewares/requireAuth';
import { requirePrivilege } from '../../middlewares/requirePrivilege';
import { ACTIONS } from '../../shared/constants/actions';
import { ENTITIES } from '../../shared/constants/entities';
import { RoleController } from './role.controller';

const router = Router();

router.use(requireAuth);

router.get('/', requirePrivilege(`${ENTITIES.ROLE}:${ACTIONS.READ}`), RoleController.getRoles);
router.get(
    '/privileges',
    requirePrivilege(`${ENTITIES.ROLE}:${ACTIONS.READ}`),
    RoleController.getPrivileges,
);
router.get('/:id', requirePrivilege(`${ENTITIES.ROLE}:${ACTIONS.READ}`), RoleController.getRole);
router.post('/', requirePrivilege(`${ENTITIES.ROLE}:${ACTIONS.CREATE}`), RoleController.createRole);
router.post(
    '/:id/privileges',
    requirePrivilege(`${ENTITIES.ROLE}:${ACTIONS.UPDATE}`),
    RoleController.grantPrivileges,
);
router.delete(
    '/:id/privileges',
    requirePrivilege(`${ENTITIES.ROLE}:${ACTIONS.UPDATE}`),
    RoleController.revokePrivileges,
);
router.delete(
    '/:id',
    requirePrivilege(`${ENTITIES.ROLE}:${ACTIONS.DELETE}`),
    RoleController.deleteRole,
);

export default router;
