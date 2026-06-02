import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import * as adminController from '../controllers/adminController.js';

const router = Router();

router.use(authenticate);
router.use(requireRole('admin'));

router.get('/users', adminController.listUsers);
router.post('/users', adminController.createUser);
router.put('/users/:id', adminController.updateUser);
router.post('/users/:id/reset-password', adminController.resetUserPassword);
router.delete('/users/:id', adminController.deleteUser);
router.post('/associations', adminController.assignDoctor);
router.get('/associations', adminController.listAssociations);
router.patch('/associations/:id/remove', adminController.removeAssociation);

export default router;
