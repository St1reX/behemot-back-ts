import { Router } from 'express';
import { requireAuth } from '../../middlewares/requireAuth';
import { requirePrivilege } from '../../middlewares/requirePrivilege';
import { ACTIONS } from '../../shared/constants/actions';
import { ENTITIES } from '../../shared/constants/entities';
import { ProductListingTemplateController } from './productListingTemplate.controller';

const router = Router();

router.use(requireAuth);

router.get(
    '/',
    requirePrivilege(`${ENTITIES.PRODUCT_LISTING_TEMPLATE}:${ACTIONS.READ}`),
    ProductListingTemplateController.getProductListingTemplates,
);
router.get(
    '/:id',
    requirePrivilege(`${ENTITIES.PRODUCT_LISTING_TEMPLATE}:${ACTIONS.READ}`),
    ProductListingTemplateController.getProductListingTemplate,
);
router.post(
    '/',
    requirePrivilege(`${ENTITIES.PRODUCT_LISTING_TEMPLATE}:${ACTIONS.CREATE}`),
    ProductListingTemplateController.createProductListingTemplate,
);
router.put(
    '/:id',
    requirePrivilege(`${ENTITIES.PRODUCT_LISTING_TEMPLATE}:${ACTIONS.UPDATE}`),
    ProductListingTemplateController.updateProductListingTemplate,
);
router.delete(
    '/:id',
    requirePrivilege(`${ENTITIES.PRODUCT_LISTING_TEMPLATE}:${ACTIONS.DELETE}`),
    ProductListingTemplateController.deleteProductListingTemplate,
);

export default router;
