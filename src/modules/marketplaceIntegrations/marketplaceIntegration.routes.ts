import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth/requireAuth';
import { requirePrivilege } from '../../middlewares/auth/requirePrivilege';
import { ACTIONS } from '../../shared/constants/actions';
import { ENTITIES } from '../../shared/constants/entities';
import { MarketplaceIntegrationController } from './marketplaceIntegration.controller';

const router = Router();

router.get('/', requireAuth, requirePrivilege(`${ENTITIES.INTEGRATION}:${ACTIONS.READ}`), MarketplaceIntegrationController.getIntegrations);
router.post('/:channel', requireAuth, requirePrivilege(`${ENTITIES.INTEGRATION}:${ACTIONS.CREATE}`), MarketplaceIntegrationController.createMarketplaceIntegration);
router.delete('/:id', requireAuth, requirePrivilege(`${ENTITIES.INTEGRATION}:${ACTIONS.DELETE}`), MarketplaceIntegrationController.deleteMarketplaceIntegration);
router.post('/:id/check-status', requireAuth, requirePrivilege(`${ENTITIES.INTEGRATION}:${ACTIONS.UPDATE}`), MarketplaceIntegrationController.checkMarketplaceConnection);

export default router;
