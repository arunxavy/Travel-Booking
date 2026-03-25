import { Router, Request, Response } from 'express';
import { requireAuth } from '../../middleware/requireAuth.js';
import {
  createTemplate,
  listTemplates,
  assignVoucher,
  bulkAssignVoucher,
  getMemberWallet,
} from './voucher.service.js';

const templateRouter = Router();
const voucherRouter = Router();

// GET /voucher-templates — Ops/Admin: list all templates
templateRouter.get('/', requireAuth(['operations', 'admin']), async (_req: Request, res: Response): Promise<void> => {
  try {
    const templates = await listTemplates();
    res.json(templates);
  } catch (err: unknown) {
    const e = err as Error & { statusCode?: number };
    res.status(e.statusCode ?? 500).json({ message: e.message });
  }
});

// POST /voucher-templates — Admin only
templateRouter.post('/', requireAuth(['admin']), async (req: Request, res: Response): Promise<void> => {
  const { valueType, discountValue, tierRestriction, isFlash, flashHours } = req.body;

  if (!valueType || discountValue === undefined || isFlash === undefined) {
    res.status(400).json({ message: 'valueType, discountValue, and isFlash are required' });
    return;
  }

  try {
    const template = await createTemplate({
      valueType,
      discountValue: Number(discountValue),
      tierRestriction,
      isFlash: Boolean(isFlash),
      flashHours: flashHours !== undefined ? Number(flashHours) : undefined,
    });
    res.status(201).json(template);
  } catch (err: unknown) {
    const e = err as Error & { statusCode?: number };
    res.status(e.statusCode ?? 500).json({ message: e.message });
  }
});

// POST /vouchers/assign — Operations only
voucherRouter.post('/assign', requireAuth(['operations']), async (req: Request, res: Response): Promise<void> => {
  const { templateId, memberId } = req.body;

  if (!templateId || !memberId) {
    res.status(400).json({ message: 'templateId and memberId are required' });
    return;
  }

  try {
    const voucher = await assignVoucher(templateId, memberId);
    res.status(201).json(voucher);
  } catch (err: unknown) {
    const e = err as Error & { statusCode?: number };
    res.status(e.statusCode ?? 500).json({ message: e.message });
  }
});

// POST /vouchers/bulk-assign — Operations or Admin
voucherRouter.post('/bulk-assign', requireAuth(['operations', 'admin']), async (req: Request, res: Response): Promise<void> => {
  const { templateId, tierId } = req.body;

  if (!templateId || !tierId) {
    res.status(400).json({ message: 'templateId and tierId are required' });
    return;
  }

  try {
    const result = await bulkAssignVoucher(templateId, tierId);
    res.status(201).json(result);
  } catch (err: unknown) {
    const e = err as Error & { statusCode?: number };
    res.status(e.statusCode ?? 500).json({ message: e.message });
  }
});

// GET /vouchers/me — Member only
voucherRouter.get('/me', requireAuth(['member']), async (req: Request, res: Response): Promise<void> => {
  const memberId = req.user!.id;

  try {
    const wallet = await getMemberWallet(memberId);
    res.json(wallet);
  } catch (err: unknown) {
    const e = err as Error & { statusCode?: number };
    res.status(e.statusCode ?? 500).json({ message: e.message });
  }
});

export { templateRouter, voucherRouter };
