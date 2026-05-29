import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import * as contractController from '../controllers/contractController.js';

const router = Router();

router.use(authenticate);
router.use(requireRole('admin'));

router.get('/', contractController.listContracts);
router.post('/', contractController.createContract);
router.put('/:id', contractController.updateContract);
router.delete('/:id', contractController.deleteContract);
router.get('/report', contractController.getContractReport);

export default router;
