import { Router } from 'express';
import { requireAuth } from '../../middlewares/requireAuth';
import { requirePrivilege } from '../../middlewares/requirePrivilege';
import { ACTIONS } from '../../shared/constants/actions';
import { ENTITIES } from '../../shared/constants/entities';
import { WarehouseController } from './warehouse.controller';

const router = Router();

router.use(requireAuth);

router.get(
    '/',
    requirePrivilege(`${ENTITIES.WAREHOUSE}:${ACTIONS.READ}`),
    WarehouseController.getWarehouses,
);
router.get(
    '/:id',
    requirePrivilege(`${ENTITIES.WAREHOUSE}:${ACTIONS.READ}`),
    WarehouseController.getWarehouse,
);
router.post(
    '/',
    requirePrivilege(`${ENTITIES.WAREHOUSE}:${ACTIONS.CREATE}`),
    WarehouseController.createWarehouse,
);
router.put(
    '/:id',
    requirePrivilege(`${ENTITIES.WAREHOUSE}:${ACTIONS.UPDATE}`),
    WarehouseController.updateWarehouse,
);
router.delete(
    '/:id',
    requirePrivilege(`${ENTITIES.WAREHOUSE}:${ACTIONS.DELETE}`),
    WarehouseController.deleteWarehouse,
);

export default router;
