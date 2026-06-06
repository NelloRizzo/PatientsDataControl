import type { Request, Response, NextFunction } from 'express';
import type { AuthRequest } from '../middleware/auth.js';
import { Ticket } from '../models/Ticket.js';
import { AppError } from '../middleware/errorHandler.js';
import { t } from '../services/i18n.js';
import { createRegistrationRequestSchema } from '@healthbridge/shared';

// ── Simple in-memory rate limiter ──
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= max) return false;
  entry.count++;
  return true;
}

// ── Public ──

export async function createRegistrationRequest(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const parsed = createRegistrationRequestSchema.parse(req.body);

    // Rate limit: 3 per IP per hour
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    if (!checkRateLimit(`reg:ip:${ip}`, 3, 3600_000)) {
      res.status(429).json({ error: 'Troppe richieste da questo indirizzo. Riprova tra un\'ora.' });
      return;
    }
    // Rate limit: 3 per email per day
    if (!checkRateLimit(`reg:email:${parsed.email}`, 3, 86400_000)) {
      res.status(429).json({ error: 'Troppe richieste per questa email. Riprova domani.' });
      return;
    }

    const count = await Ticket.countDocuments();
    const ticketNumber = 'TKT-' + String(count + 1).padStart(4, '0');

    const ticket = await Ticket.create({
      ticketNumber,
      userId: null,
      type: 'registration_request',
      title: parsed.name,
      description: parsed.message || '',
      severity: 'low',
      status: 'open',
      requesterEmail: parsed.email,
      requestedRole: parsed.requestedRole,
      annotation: parsed.annotation || '',
    });

    res.status(201).json({ data: ticket });
  } catch (err) {
    next(err);
  }
}

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
    if (ticket.userId && ticket.userId.toString() !== req.userId! && req.userRole !== 'admin') {
      throw new AppError(403, t('error.ticket.notAuthorized'));
    }
    if (!ticket.userId && req.userRole !== 'admin') {
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
