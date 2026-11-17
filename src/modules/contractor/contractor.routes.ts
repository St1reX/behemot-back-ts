import { Router } from 'express';
import { requireAuth } from '../../middlewares/requireAuth';
import { requirePrivilege } from '../../middlewares/requirePrivilege';
import { ACTIONS } from '../../shared/constants/actions';
import { ENTITIES } from '../../shared/constants/entities';
import { ContractorController } from './contractor.controller';

const router = Router();

router.use(requireAuth);

router.get(
    '/',
    requirePrivilege(`${ENTITIES.CONTRACTOR}:${ACTIONS.READ}`),
    ContractorController.getContractors,
);
router.get(
    '/:id',
    requirePrivilege(`${ENTITIES.CONTRACTOR}:${ACTIONS.READ}`),
    ContractorController.getContractor,
);
router.post(
    '/',
    requirePrivilege(`${ENTITIES.CONTRACTOR}:${ACTIONS.CREATE}`),
    ContractorController.createContractor,
);
router.put(
    '/:id',
    requirePrivilege(`${ENTITIES.CONTRACTOR}:${ACTIONS.UPDATE}`),
    ContractorController.updateContractor,
);
router.delete(
    '/:id',
    requirePrivilege(`${ENTITIES.CONTRACTOR}:${ACTIONS.DELETE}`),
    ContractorController.deleteContractor,
);

export default router;
