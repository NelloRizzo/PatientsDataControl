import type { Response, NextFunction } from 'express';
import type { AuthRequest } from '../middleware/auth.js';
import { Ticket } from '../models/Ticket.js';
import { AppError } from '../middleware/errorHandler.js';
import { t } from '../services/i18n.js';

// ── User-facing ──

export async function createTicket(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const count = await Ticket.countDocuments();
    const ticketNumber = 'TKT-' + String(count + 1).padStart(4, '0');
    const ticket = await Ticket.create({
      ticketNumber,
      userId: req.userId!,
      ...req.body,
    });
    res.status(201).json({ data: ticket });
  } catch (err) {
    next(err);
  }
}

export async function myTickets(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { page = '1', limit = '20', status, type } = req.query as Record<string, string>;
    const filter: any = { userId: req.userId! };
    if (status) filter.status = status;
    if (type) filter.type = type;

    const pageInt = Math.max(1, parseInt(page));
    const limitInt = Math.min(100, Math.max(1, parseInt(limit) || 20));

    const [docs, total] = await Promise.all([
      Ticket.find(filter)
        .sort({ createdAt: -1 })
        .skip((pageInt - 1) * limitInt)
        .limit(limitInt)
        .lean(),
      Ticket.countDocuments(filter),
    ]);

    res.json({
      data: docs,
      pagination: { page: pageInt, limit: limitInt, total, totalPages: Math.ceil(total / limitInt) },
    });
  } catch (err) {
    next(err);
  }
}

export async function getTicket(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const ticket = await Ticket.findById(req.params.id).lean();
    if (!ticket) throw new AppError(404, t('error.ticket.notFound'));
    // Only owner or admin can view
    if (ticket.userId.toString() !== req.userId! && req.userRole !== 'admin') {
      throw new AppError(403, t('error.ticket.notAuthorized'));
    }
    res.json({ data: ticket });
  } catch (err) {
    next(err);
  }
}

// ── Admin-facing ──

export async function allTickets(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { page = '1', limit = '20', status, type, severity } = req.query as Record<string, string>;
    const filter: any = {};
    if (status) filter.status = status;
    if (type) filter.type = type;
    if (severity) filter.severity = severity;

    const pageInt = Math.max(1, parseInt(page));
    const limitInt = Math.min(100, Math.max(1, parseInt(limit) || 20));

    const [docs, total] = await Promise.all([
      Ticket.find(filter)
        .populate('userId', 'name email')
        .populate('assigneeId', 'name')
        .sort({ createdAt: -1 })
        .skip((pageInt - 1) * limitInt)
        .limit(limitInt)
        .lean(),
      Ticket.countDocuments(filter),
    ]);

    res.json({
      data: docs,
      pagination: { page: pageInt, limit: limitInt, total, totalPages: Math.ceil(total / limitInt) },
    });
  } catch (err) {
    next(err);
  }
}

export async function updateTicket(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const ticket = await Ticket.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );
    if (!ticket) throw new AppError(404, t('error.ticket.notFound'));
    res.json({ data: ticket });
  } catch (err) {
    next(err);
  }
}

export async function getTicketStats(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const stats = await Ticket.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    const byType = await Ticket.aggregate([
      { $group: { _id: '$type', count: { $sum: 1 } } },
    ]);
    res.json({ data: { byStatus: stats, byType } });
  } catch (err) {
    next(err);
  }
}
