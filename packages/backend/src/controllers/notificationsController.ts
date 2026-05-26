import type { Response, NextFunction } from 'express';
import type { AuthRequest } from '../middleware/auth.js';
import { Notification } from '../models/Notification.js';

export async function listNotifications(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const category = req.query.category as string | undefined;
    const readFilter = req.query.read as string | undefined;

    const filter: Record<string, unknown> = { userId: req.userId };
    if (category) filter.category = category;
    if (readFilter === 'true') filter.read = true;
    else if (readFilter === 'false') filter.read = false;

    const total = await Notification.countDocuments(filter);
    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const data = notifications.map((n) => ({
      _id: n._id.toString(),
      userId: n.userId.toString(),
      category: n.category,
      title: n.title,
      body: n.body,
      read: n.read,
      readAt: n.readAt?.toISOString?.() ?? null,
      referenceId: n.referenceId?.toString() ?? null,
      referenceModel: n.referenceModel ?? null,
      createdAt: n.createdAt?.toISOString?.(),
      updatedAt: n.updatedAt?.toISOString?.(),
    }));

    res.json({
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
}

export async function unreadCount(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const count = await Notification.countDocuments({ userId: req.userId, read: false });
    res.json({ count });
  } catch (error) {
    next(error);
  }
}

export async function markAsRead(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { read: true, readAt: new Date() },
      { new: true }
    );
    if (!notification) {
      res.status(404).json({ error: 'Notification not found' });
      return;
    }
    res.json({ data: { _id: notification._id.toString(), read: true } });
  } catch (error) {
    next(error);
  }
}

export async function markAllAsRead(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const result = await Notification.updateMany(
      { userId: req.userId, read: false },
      { read: true, readAt: new Date() }
    );
    res.json({ data: { modifiedCount: result.modifiedCount } });
  } catch (error) {
    next(error);
  }
}
