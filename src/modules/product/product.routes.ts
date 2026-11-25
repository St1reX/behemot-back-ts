import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth/requireAuth';
import { requirePrivilege } from '../../middlewares/auth/requirePrivilege';
import { ACTIONS } from '../../shared/constants/actions';
import { ENTITIES } from '../../shared/constants/entities';
import { ProductController } from './product.controller';

import { productUpload } from './uploads/product.upload';

const router = Router();

router.use(requireAuth);

router.get('/', requirePrivilege(`${ENTITIES.PRODUCT}:${ACTIONS.READ}`), ProductController.getProducts);
router.get(
    '/:id',
    requirePrivilege(`${ENTITIES.PRODUCT}:${ACTIONS.READ}`),
    ProductController.getProduct,
);
router.post(
    '/',
    requirePrivilege(`${ENTITIES.PRODUCT}:${ACTIONS.CREATE}`),
    productUpload,
    ProductController.createProduct,
);
router.put(
    '/:id',
    requirePrivilege(`${ENTITIES.PRODUCT}:${ACTIONS.UPDATE}`),
    productUpload,
    ProductController.updateProduct,
);
router.delete(
    '/:id',
    requirePrivilege(`${ENTITIES.PRODUCT}:${ACTIONS.DELETE}`),
    ProductController.deleteProduct,
);

export default router;
