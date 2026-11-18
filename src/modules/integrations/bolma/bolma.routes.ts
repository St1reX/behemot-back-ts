import { Router } from 'express';
import { requireAuth } from '../../../middlewares/requireAuth';
import { BolmaController } from './bolma.controller';

const router = Router();

router.use(requireAuth);
router.get('/status', BolmaController.getStatus);

export default router;
