import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import { validate } from '../middleware/validate.js';
import * as ticketController from '../controllers/ticketController.js';
import { createTicketSchema, updateTicketSchema } from '@healthbridge/shared';

const router = Router();

router.use(authenticate);

// User-facing
router.post('/', validate(createTicketSchema), ticketController.createTicket);
router.get('/', ticketController.myTickets);
router.get('/:id', ticketController.getTicket);

// Admin
router.get('/admin/all', requireRole('admin'), ticketController.allTickets);
router.put('/admin/:id', requireRole('admin'), validate(updateTicketSchema), ticketController.updateTicket);
router.get('/admin/stats', requireRole('admin'), ticketController.getTicketStats);

export default router;
