import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth/requireAuth';
import { requirePrivilege } from '../../middlewares/auth/requirePrivilege';
import { ACTIONS } from '../../shared/constants/actions';
import { ENTITIES } from '../../shared/constants/entities';
import { ProducerController } from './producer.controller';

const router = Router();

router.use(requireAuth);

router.get(
    '/',
    requirePrivilege(`${ENTITIES.PRODUCER}:${ACTIONS.READ}`),
    ProducerController.getProducers,
);
router.get(
    '/:id',
    requirePrivilege(`${ENTITIES.PRODUCER}:${ACTIONS.READ}`),
    ProducerController.getProducer,
);
router.post(
    '/',
    requirePrivilege(`${ENTITIES.PRODUCER}:${ACTIONS.CREATE}`),
    ProducerController.createProducer,
);
router.put(
    '/:id',
    requirePrivilege(`${ENTITIES.PRODUCER}:${ACTIONS.UPDATE}`),
    ProducerController.updateProducer,
);
router.delete(
    '/:id',
    requirePrivilege(`${ENTITIES.PRODUCER}:${ACTIONS.DELETE}`),
    ProducerController.deleteProducer,
);

export default router;
