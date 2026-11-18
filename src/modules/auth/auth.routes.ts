import { Router } from 'express';
import { AuthController } from './auth.controller';
import { requireGuest } from '../../middlewares/requireGuest';
import { requireAuth } from '../../middlewares/requireAuth';

const router = Router();

router.get('/me', requireAuth, AuthController.getCurrentUser);
router.post('/login', requireGuest, AuthController.loginUser);
router.post('/logout', requireAuth, AuthController.logoutUser);
router.post('/register', requireGuest, AuthController.registerUser);
router.post('/resend-mail', requireGuest, AuthController.resendRegistrationMail);
router.get('/verify-account', requireGuest, AuthController.verifyAccount);

export default router;
