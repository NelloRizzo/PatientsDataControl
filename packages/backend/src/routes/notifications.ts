import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import * as notificationsController from '../controllers/notificationsController.js';

const router = Router();

router.use(authenticate);

router.get('/', notificationsController.listNotifications);
router.get('/unread-count', notificationsController.unreadCount);
router.put('/read-all', notificationsController.markAllAsRead);
router.put('/:id/read', notificationsController.markAsRead);

export default router;
