import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth/requireAuth';
import { requirePrivilege } from '../../middlewares/auth/requirePrivilege';
import { ACTIONS } from '../../shared/constants/actions';
import { ENTITIES } from '../../shared/constants/entities';
import { ImportsController } from './imports.controller';

const router = Router();

router.use(requireAuth);
router.get('/bolma/status', ImportsController.getBolmaStatus);
router.use(requirePrivilege(`${ENTITIES.INTEGRATION}:${ACTIONS.READ}`));
router.get('/bolma/configuration', ImportsController.getBolmaConfiguration);
router.post('/bolma/products',
    requirePrivilege(`${ENTITIES.INTEGRATION}:${ACTIONS.UPDATE}`),
    requirePrivilege(`${ENTITIES.PRODUCT}:${ACTIONS.CREATE}`),
    requirePrivilege(`${ENTITIES.PRODUCT}:${ACTIONS.UPDATE}`),
    ImportsController.importBolmaProducts);
router.get('/bolma/products/report/latest', ImportsController.downloadLatestBolmaReport);

export default router;
