import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth/requireAuth';
import { requirePrivilege } from '../../middlewares/auth/requirePrivilege';
import { ACTIONS } from '../../shared/constants/actions';
import { ENTITIES } from '../../shared/constants/entities';
import { AllegroController } from './marketplace/adapters/allegro/allegro.controller';

const router = Router();

router.get(
    '/allegro/configuration',
    requireAuth,
    requirePrivilege(`${ENTITIES.INTEGRATION}:${ACTIONS.UPDATE}`),
    AllegroController.configuration,
);
router.post(
    '/allegro/authorize',
    requireAuth,
    requirePrivilege(`${ENTITIES.INTEGRATION}:${ACTIONS.UPDATE}`),
    AllegroController.authorize,
);
router.get(
    '/allegro/callback',
    requireAuth,
    requirePrivilege(`${ENTITIES.INTEGRATION}:${ACTIONS.UPDATE}`),
    AllegroController.callback,
);

export default router;
