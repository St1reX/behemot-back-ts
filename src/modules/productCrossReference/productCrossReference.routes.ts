import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth/requireAuth';
import { requirePrivilege } from '../../middlewares/auth/requirePrivilege';
import { ACTIONS } from '../../shared/constants/actions';
import { ENTITIES } from '../../shared/constants/entities';
import { ProductCrossReferenceController } from './productCrossReference.controller';

const router = Router();

router.use(requireAuth);

router.get(
    '/',
    requirePrivilege(`${ENTITIES.PRODUCT_CROSS_REFERENCE}:${ACTIONS.READ}`),
    ProductCrossReferenceController.getProductCrossReferences,
);
router.get(
    '/:id',
    requirePrivilege(`${ENTITIES.PRODUCT_CROSS_REFERENCE}:${ACTIONS.READ}`),
    ProductCrossReferenceController.getProductCrossReference,
);
router.post(
    '/',
    requirePrivilege(`${ENTITIES.PRODUCT_CROSS_REFERENCE}:${ACTIONS.CREATE}`),
    ProductCrossReferenceController.createProductCrossReference,
);
router.put(
    '/:id',
    requirePrivilege(`${ENTITIES.PRODUCT_CROSS_REFERENCE}:${ACTIONS.UPDATE}`),
    ProductCrossReferenceController.updateProductCrossReference,
);
router.delete(
    '/:id',
    requirePrivilege(`${ENTITIES.PRODUCT_CROSS_REFERENCE}:${ACTIONS.DELETE}`),
    ProductCrossReferenceController.deleteProductCrossReference,
);

export default router;
