import { Router } from 'express';
import { requireAuth } from '../../middlewares/requireAuth';
import { requirePrivilege } from '../../middlewares/requirePrivilege';
import { ACTIONS } from '../../shared/constants/actions';
import { ENTITIES } from '../../shared/constants/entities';
import { ProductController } from './product.controller';

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
    ProductController.createProduct,
);
router.put(
    '/:id',
    requirePrivilege(`${ENTITIES.PRODUCT}:${ACTIONS.UPDATE}`),
    ProductController.updateProduct,
);
router.delete(
    '/:id',
    requirePrivilege(`${ENTITIES.PRODUCT}:${ACTIONS.DELETE}`),
    ProductController.deleteProduct,
);

export default router;
