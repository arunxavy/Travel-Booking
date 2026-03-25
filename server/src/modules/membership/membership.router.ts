import { Router, Request, Response } from 'express';
import { requireAuth } from '../../middleware/requireAuth.js';
import {
  createMember, createOpsUser, getMemberById, updateMember,
  getAllTiers, listMembers, listOpsUsers,
} from './membership.service.js';
import {
  getSpecialDays, createSpecialDay, updateSpecialDay, deleteSpecialDay,
} from '../specialDays/specialDays.service.js';

const router = Router();

// ── Tiers ──────────────────────────────────────────────────────────────────

router.get('/tiers', requireAuth(['operations', 'admin']), async (_req, res) => {
  try { res.json(await getAllTiers()); }
  catch { res.status(500).json({ message: 'Internal server error' }); }
});

// ── Ops User Management (Admin only) ──────────────────────────────────────

router.get('/ops-users', requireAuth(['admin']), async (_req, res) => {
  try { res.json(await listOpsUsers()); }
  catch { res.status(500).json({ message: 'Internal server error' }); }
});

router.post('/ops-users', requireAuth(['admin']), async (req: Request, res: Response): Promise<void> => {
  const { email, name } = req.body;
  if (!email || !name) { res.status(400).json({ message: 'email and name are required' }); return; }
  try {
    const result = await createOpsUser({ email, name });
    res.status(201).json(result);
  } catch (err: unknown) {
    const e = err as Error & { statusCode?: number };
    res.status(e.statusCode ?? 500).json({ message: e.message });
  }
});

router.patch('/ops-users/:id', requireAuth(['admin']), async (req: Request, res: Response): Promise<void> => {
  const { status } = req.body;
  try {
    await updateMember(req.params.id, { status });
    res.json({ message: 'Updated' });
  } catch (err: unknown) {
    const e = err as Error & { statusCode?: number };
    res.status(e.statusCode ?? 500).json({ message: e.message });
  }
});

// ── Members ────────────────────────────────────────────────────────────────

router.get('/', requireAuth(['operations', 'admin']), async (req, res) => {
  try {
    const email = typeof req.query.email === 'string' ? req.query.email : undefined;
    res.json(await listMembers(email));
  } catch { res.status(500).json({ message: 'Internal server error' }); }
});

router.post('/', requireAuth(['operations', 'admin']), async (req: Request, res: Response): Promise<void> => {
  const { email, name, tierId, membershipExpiry, phone } = req.body;
  if (!email || !name || !tierId || !membershipExpiry) {
    res.status(400).json({ message: 'Missing required fields: email, name, tierId, membershipExpiry' });
    return;
  }
  try {
    const result = await createMember({ email, name, tierId, membershipExpiry, phone });
    res.status(201).json(result);
  } catch (err: unknown) {
    const e = err as Error & { statusCode?: number };
    res.status(e.statusCode ?? 500).json({ message: e.message });
  }
});

router.get('/me', requireAuth(['member', 'operations', 'admin']), async (req, res) => {
  try { res.json(await getMemberById(req.user!.id)); }
  catch (err: unknown) {
    const e = err as Error & { statusCode?: number };
    res.status(e.statusCode ?? 500).json({ message: e.message });
  }
});

// Member self-update (phone only)
router.patch('/me', requireAuth(['member']), async (req: Request, res: Response): Promise<void> => {
  const { phone } = req.body;
  try {
    const updated = await updateMember(req.user!.id, { phone });
    res.json(updated);
  } catch (err: unknown) {
    const e = err as Error & { statusCode?: number };
    res.status(e.statusCode ?? 500).json({ message: e.message });
  }
});

router.get('/:id', requireAuth(['operations', 'admin']), async (req, res) => {
  try { res.json(await getMemberById(req.params.id)); }
  catch (err: unknown) {
    const e = err as Error & { statusCode?: number };
    res.status(e.statusCode ?? 500).json({ message: e.message });
  }
});

router.patch('/:id', requireAuth(['operations', 'admin']), async (req: Request, res: Response): Promise<void> => {
  const { membershipExpiry, tierId, status, phone } = req.body;
  try {
    res.json(await updateMember(req.params.id, { membershipExpiry, tierId, status, phone }));
  } catch (err: unknown) {
    const e = err as Error & { statusCode?: number };
    res.status(e.statusCode ?? 500).json({ message: e.message });
  }
});

// ── Special Days (Member — read/add only, no edit) ─────────────────────────

router.get('/me/special-days', requireAuth(['member']), async (req, res) => {
  try { res.json(await getSpecialDays(req.user!.id)); }
  catch { res.status(500).json({ message: 'Internal server error' }); }
});

router.post('/me/special-days', requireAuth(['member']), async (req: Request, res: Response): Promise<void> => {
  const { label, eventDate } = req.body;
  if (!label || !eventDate) { res.status(400).json({ message: 'label and eventDate are required' }); return; }
  try {
    res.status(201).json(await createSpecialDay({ userId: req.user!.id, label, eventDate }));
  } catch (err: unknown) {
    const e = err as Error & { statusCode?: number };
    res.status(e.statusCode ?? 500).json({ message: e.message });
  }
});

// Members can delete their own special days but NOT edit them
router.delete('/me/special-days/:id', requireAuth(['member']), async (req: Request, res: Response): Promise<void> => {
  try {
    await deleteSpecialDay(req.params.id, req.user!.id);
    res.status(204).send();
  } catch (err: unknown) {
    const e = err as Error & { statusCode?: number };
    res.status(e.statusCode ?? 500).json({ message: e.message });
  }
});

// ── Special Days (Ops — can edit any member's special days) ────────────────

router.get('/:memberId/special-days', requireAuth(['operations', 'admin']), async (req, res) => {
  try { res.json(await getSpecialDays(req.params.memberId)); }
  catch { res.status(500).json({ message: 'Internal server error' }); }
});

router.patch('/:memberId/special-days/:id', requireAuth(['operations', 'admin']), async (req: Request, res: Response): Promise<void> => {
  const { label, eventDate } = req.body;
  try {
    res.json(await updateSpecialDay(req.params.id, req.params.memberId, { label, eventDate }));
  } catch (err: unknown) {
    const e = err as Error & { statusCode?: number };
    res.status(e.statusCode ?? 500).json({ message: e.message });
  }
});

export default router;
