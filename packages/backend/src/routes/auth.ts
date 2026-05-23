import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { registerSchema, loginSchema } from '@healthbridge/shared';
import * as authController from '../controllers/authController.js';

const router = Router();

router.post('/register', validate(registerSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);
router.post('/refresh', authController.refresh);
router.get('/me', authenticate, authController.me);
router.put('/profile', authenticate, authController.updateProfile);

export default router;
