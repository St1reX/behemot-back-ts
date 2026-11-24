import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth/requireAuth';
import { requirePrivilege } from '../../middlewares/auth/requirePrivilege';
import { ACTIONS } from '../../shared/constants/actions';
import { ENTITIES } from '../../shared/constants/entities';
import { ProductFitmentController } from './productFitment.controller';

const router = Router();

router.use(requireAuth);

router.get(
    '/',
    requirePrivilege(`${ENTITIES.PRODUCT_FITMENT}:${ACTIONS.READ}`),
    ProductFitmentController.getProductFitments,
);
router.get(
    '/:id',
    requirePrivilege(`${ENTITIES.PRODUCT_FITMENT}:${ACTIONS.READ}`),
    ProductFitmentController.getProductFitment,
);
router.post(
    '/',
    requirePrivilege(`${ENTITIES.PRODUCT_FITMENT}:${ACTIONS.CREATE}`),
    ProductFitmentController.createProductFitment,
);
router.put(
    '/:id',
    requirePrivilege(`${ENTITIES.PRODUCT_FITMENT}:${ACTIONS.UPDATE}`),
    ProductFitmentController.updateProductFitment,
);
router.delete(
    '/:id',
    requirePrivilege(`${ENTITIES.PRODUCT_FITMENT}:${ACTIONS.DELETE}`),
    ProductFitmentController.deleteProductFitment,
);

export default router;
