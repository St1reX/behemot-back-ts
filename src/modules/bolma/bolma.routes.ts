import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth/requireAuth';
import { requirePrivilege } from '../../middlewares/auth/requirePrivilege';
import { ACTIONS } from '../../shared/constants/actions';
import { ENTITIES } from '../../shared/constants/entities';
import { BolmaController } from './bolma.controller';

const router = Router();

router.use(requireAuth);
router.get('/configuration', requirePrivilege(`${ENTITIES.INTEGRATION}:${ACTIONS.READ}`), BolmaController.getConfiguration);
router.get('/status', BolmaController.getStatus);

export default router;
