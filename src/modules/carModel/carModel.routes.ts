import { Router } from 'express';
import { requireAuth } from '../../middlewares/requireAuth';
import { requirePrivilege } from '../../middlewares/requirePrivilege';
import { ACTIONS } from '../../shared/constants/actions';
import { ENTITIES } from '../../shared/constants/entities';
import { CarModelController } from './carModel.controller';

const router = Router();

router.use(requireAuth);

router.get(
    '/',
    requirePrivilege(`${ENTITIES.CAR_MODEL}:${ACTIONS.READ}`),
    CarModelController.getCarModels,
);
router.get(
    '/brand/:carBrandId',
    requirePrivilege(`${ENTITIES.CAR_MODEL}:${ACTIONS.READ}`),
    CarModelController.getCarModelsByCarBrand,
);
router.get(
    '/:id',
    requirePrivilege(`${ENTITIES.CAR_MODEL}:${ACTIONS.READ}`),
    CarModelController.getCarModel,
);
router.post(
    '/',
    requirePrivilege(`${ENTITIES.CAR_MODEL}:${ACTIONS.CREATE}`),
    CarModelController.createCarModel,
);
router.put(
    '/:id',
    requirePrivilege(`${ENTITIES.CAR_MODEL}:${ACTIONS.UPDATE}`),
    CarModelController.updateCarModel,
);
router.delete(
    '/:id',
    requirePrivilege(`${ENTITIES.CAR_MODEL}:${ACTIONS.DELETE}`),
    CarModelController.deleteCarModel,
);

export default router;
