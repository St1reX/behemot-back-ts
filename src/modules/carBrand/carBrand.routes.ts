import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth/requireAuth';
import { requirePrivilege } from '../../middlewares/auth/requirePrivilege';
import { ACTIONS } from '../../shared/constants/actions';
import { ENTITIES } from '../../shared/constants/entities';
import { CarBrandController } from './carBrand.controller';

const router = Router();

router.use(requireAuth);

router.get(
    '/',
    requirePrivilege(`${ENTITIES.CAR_BRAND}:${ACTIONS.READ}`),
    CarBrandController.getCarBrands,
);
router.get(
    '/:id',
    requirePrivilege(`${ENTITIES.CAR_BRAND}:${ACTIONS.READ}`),
    CarBrandController.getCarBrand,
);
router.post(
    '/',
    requirePrivilege(`${ENTITIES.CAR_BRAND}:${ACTIONS.CREATE}`),
    CarBrandController.createCarBrand,
);
router.put(
    '/:id',
    requirePrivilege(`${ENTITIES.CAR_BRAND}:${ACTIONS.UPDATE}`),
    CarBrandController.updateCarBrand,
);
router.delete(
    '/:id',
    requirePrivilege(`${ENTITIES.CAR_BRAND}:${ACTIONS.DELETE}`),
    CarBrandController.deleteCarBrand,
);

export default router;
