import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth/requireAuth';
import { requirePrivilege } from '../../middlewares/auth/requirePrivilege';
import { ACTIONS } from '../../shared/constants/actions';
import { ENTITIES } from '../../shared/constants/entities';
import { IntegrationController } from './integration.controller';

const router = Router();

router.get('/', requireAuth, requirePrivilege(`${ENTITIES.INTEGRATION}:${ACTIONS.READ}`), IntegrationController.getIntegrations);
router.post('/marketplace/:channel', requireAuth, requirePrivilege(`${ENTITIES.INTEGRATION}:${ACTIONS.CREATE}`), IntegrationController.createMarketplaceIntegration);

export default router;
