import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth/requireAuth';
import { requirePrivilege } from '../../middlewares/auth/requirePrivilege';
import { ACTIONS } from '../../shared/constants/actions';
import { ENTITIES } from '../../shared/constants/entities';
import { DepartmentController } from './department.controller';

const router = Router();

router.use(requireAuth);

router.get(
    '/',
    requirePrivilege(`${ENTITIES.DEPARTMENT}:${ACTIONS.READ}`),
    DepartmentController.getDepartments,
);
router.get(
    '/:id',
    requirePrivilege(`${ENTITIES.DEPARTMENT}:${ACTIONS.READ}`),
    DepartmentController.getDepartment,
);
router.post(
    '/',
    requirePrivilege(`${ENTITIES.DEPARTMENT}:${ACTIONS.CREATE}`),
    DepartmentController.createDepartment,
);
router.put(
    '/:id',
    requirePrivilege(`${ENTITIES.DEPARTMENT}:${ACTIONS.UPDATE}`),
    DepartmentController.updateDepartment,
);
router.delete(
    '/:id',
    requirePrivilege(`${ENTITIES.DEPARTMENT}:${ACTIONS.DELETE}`),
    DepartmentController.deleteDepartment,
);

export default router;
