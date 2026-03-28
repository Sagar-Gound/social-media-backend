import { Router } from 'express';
import * as authController from './auth.controller';
import { authenticate } from '../../shared/middleware/authenticate';

const router = Router();

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/google', authController.googleLogin);
router.post('/refresh', authController.refresh);
router.post('/logout', authenticate, authController.logout);
router.get('/me', authenticate, authController.me);

export default router;
