import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth/requireAuth';
import { requirePrivilege } from '../../middlewares/auth/requirePrivilege';
import { ACTIONS } from '../../shared/constants/actions';
import { ENTITIES } from '../../shared/constants/entities';
import { IntegrationController } from './integration.controller';

const router = Router();

router.get('/', requireAuth, requirePrivilege(`${ENTITIES.INTEGRATION}:${ACTIONS.READ}`), IntegrationController.getIntegrations);
router.post('/marketplace/:channel', requireAuth, requirePrivilege(`${ENTITIES.INTEGRATION}:${ACTIONS.CREATE}`), IntegrationController.createMarketplaceIntegration);
router.delete('/marketplace/:id', requireAuth, requirePrivilege(`${ENTITIES.INTEGRATION}:${ACTIONS.DELETE}`), IntegrationController.deleteMarketplaceIntegration);
router.post('/marketplace/:id/check-status', requireAuth, requirePrivilege(`${ENTITIES.INTEGRATION}:${ACTIONS.UPDATE}`), IntegrationController.checkMarketplaceConnection);

export default router;
