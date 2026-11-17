import { Router } from 'express';
import { requireAuth } from '../../middlewares/requireAuth';
import { requirePrivilege } from '../../middlewares/requirePrivilege';
import { ACTIONS } from '../../shared/constants/actions';
import { ENTITIES } from '../../shared/constants/entities';
import { CarGenerationController } from './carGeneration.controller';

const router = Router();

router.use(requireAuth);

router.get(
    '/',
    requirePrivilege(`${ENTITIES.CAR_GENERATION}:${ACTIONS.READ}`),
    CarGenerationController.getCarGenerations,
);
router.get(
    '/model/:carModelId',
    requirePrivilege(`${ENTITIES.CAR_GENERATION}:${ACTIONS.READ}`),
    CarGenerationController.getCarGenerationsByCarModel,
);
router.get(
    '/:id',
    requirePrivilege(`${ENTITIES.CAR_GENERATION}:${ACTIONS.READ}`),
    CarGenerationController.getCarGeneration,
);
router.post(
    '/',
    requirePrivilege(`${ENTITIES.CAR_GENERATION}:${ACTIONS.CREATE}`),
    CarGenerationController.createCarGeneration,
);
router.put(
    '/:id',
    requirePrivilege(`${ENTITIES.CAR_GENERATION}:${ACTIONS.UPDATE}`),
    CarGenerationController.updateCarGeneration,
);
router.delete(
    '/:id',
    requirePrivilege(`${ENTITIES.CAR_GENERATION}:${ACTIONS.DELETE}`),
    CarGenerationController.deleteCarGeneration,
);

export default router;
