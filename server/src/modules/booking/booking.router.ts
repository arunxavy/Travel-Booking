import { Router, Request, Response } from 'express';
import { requireAuth } from '../../middleware/requireAuth.js';
import { createBooking, getMemberBookings, updateBookingStatus, getAllBookings } from './booking.service.js';
import {
  createCustomBooking, getMemberCustomBookings, getAllCustomBookings,
  updateCustomBookingStatus, addComment, getComments,
} from './customBooking.service.js';
import type { BookingStatus } from './booking.service.js';

const router = Router();
const VALID_STATUSES: BookingStatus[] = ['in_review', 'confirmed', 'cancelled'];

// ── Package Bookings ──────────────────────────────────────────────────────────

router.get('/', requireAuth(['operations', 'admin']), async (_req, res) => {
  try { res.json(await getAllBookings()); }
  catch (err: unknown) { res.status(500).json({ message: (err as Error).message }); }
});

router.post('/', requireAuth(['member']), async (req: Request, res: Response): Promise<void> => {
  const { packageId, voucherId } = req.body;
  if (!packageId) { res.status(400).json({ message: 'Missing required field: packageId' }); return; }
  try {
    res.status(201).json(await createBooking(req.user!.id, packageId, voucherId));
  } catch (err: unknown) {
    const e = err as Error & { statusCode?: number; currentVoucherStatus?: string };
    res.status(e.statusCode ?? 500).json({ message: e.message, currentVoucherStatus: e.currentVoucherStatus });
  }
});

router.get('/me', requireAuth(['member']), async (req, res) => {
  try { res.json(await getMemberBookings(req.user!.id)); }
  catch (err: unknown) { res.status(500).json({ message: (err as Error).message }); }
});

router.patch('/:id/status', requireAuth(['operations']), async (req: Request, res: Response): Promise<void> => {
  const { status } = req.body;
  if (!status || !VALID_STATUSES.includes(status)) {
    res.status(400).json({ message: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` });
    return;
  }
  try {
    res.json(await updateBookingStatus(req.params.id, status as BookingStatus));
  } catch (err: unknown) {
    const e = err as Error & { statusCode?: number; currentStatus?: string; allowedTransitions?: string[] };
    res.status(e.statusCode ?? 500).json({ message: e.message, currentStatus: e.currentStatus, allowedTransitions: e.allowedTransitions });
  }
});

// ── Package Booking Comments ──────────────────────────────────────────────────

router.get('/:id/comments', requireAuth(['member', 'operations', 'admin']), async (req, res) => {
  try { res.json(await getComments(req.params.id, 'package')); }
  catch (err: unknown) { res.status(500).json({ message: (err as Error).message }); }
});

router.post('/:id/comments', requireAuth(['member', 'operations', 'admin']), async (req: Request, res: Response): Promise<void> => {
  const { message } = req.body;
  if (!message?.trim()) { res.status(400).json({ message: 'message is required' }); return; }
  try {
    res.status(201).json(await addComment(req.params.id, 'package', req.user!.id, req.user!.role, message.trim()));
  } catch (err: unknown) { res.status(500).json({ message: (err as Error).message }); }
});

// ── Custom Bookings ───────────────────────────────────────────────────────────

router.get('/custom', requireAuth(['operations', 'admin']), async (_req, res) => {
  try { res.json(await getAllCustomBookings()); }
  catch (err: unknown) { res.status(500).json({ message: (err as Error).message }); }
});

router.post('/custom', requireAuth(['member']), async (req: Request, res: Response): Promise<void> => {
  const { destination, hotelName, googleLink, checkIn, checkOut, adults, kids, kidAges, voucherId, notes } = req.body;
  if (!destination || !checkIn || !checkOut) {
    res.status(400).json({ message: 'destination, checkIn and checkOut are required' });
    return;
  }
  try {
    res.status(201).json(await createCustomBooking({
      memberId: req.user!.id, destination, hotelName, googleLink,
      checkIn, checkOut,
      adults: Number(adults ?? 1), kids: Number(kids ?? 0),
      kidAges: Array.isArray(kidAges) ? kidAges : undefined,
      voucherId, notes,
    }));
  } catch (err: unknown) {
    const e = err as Error & { statusCode?: number };
    res.status(e.statusCode ?? 500).json({ message: e.message });
  }
});

router.get('/custom/me', requireAuth(['member']), async (req, res) => {
  try { res.json(await getMemberCustomBookings(req.user!.id)); }
  catch (err: unknown) { res.status(500).json({ message: (err as Error).message }); }
});

router.patch('/custom/:id/status', requireAuth(['operations']), async (req: Request, res: Response): Promise<void> => {
  const { status } = req.body;
  if (!status || !VALID_STATUSES.includes(status)) {
    res.status(400).json({ message: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` });
    return;
  }
  try {
    res.json(await updateCustomBookingStatus(req.params.id, status as BookingStatus));
  } catch (err: unknown) {
    const e = err as Error & { statusCode?: number; currentStatus?: string; allowedTransitions?: string[] };
    res.status(e.statusCode ?? 500).json({ message: e.message, currentStatus: e.currentStatus, allowedTransitions: e.allowedTransitions });
  }
});

// ── Custom Booking Comments ───────────────────────────────────────────────────

router.get('/custom/:id/comments', requireAuth(['member', 'operations', 'admin']), async (req, res) => {
  try { res.json(await getComments(req.params.id, 'custom')); }
  catch (err: unknown) { res.status(500).json({ message: (err as Error).message }); }
});

router.post('/custom/:id/comments', requireAuth(['member', 'operations', 'admin']), async (req: Request, res: Response): Promise<void> => {
  const { message } = req.body;
  if (!message?.trim()) { res.status(400).json({ message: 'message is required' }); return; }
  try {
    res.status(201).json(await addComment(req.params.id, 'custom', req.user!.id, req.user!.role, message.trim()));
  } catch (err: unknown) { res.status(500).json({ message: (err as Error).message }); }
});

export default router;
