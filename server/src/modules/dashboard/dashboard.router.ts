import { Router, Request, Response } from 'express';
import { requireAuth } from '../../middleware/requireAuth.js';
import { getLookahead, getBIMetrics, getWishlistDashboard } from './dashboard.service.js';

const router = Router();

// GET /dashboard/lookahead — Ops only
router.get('/lookahead', requireAuth(['operations']), async (_req: Request, res: Response) => {
  try {
    res.json(await getLookahead());
  } catch (err: unknown) {
    res.status((err as { statusCode?: number }).statusCode ?? 500).json({ message: (err as Error).message });
  }
});

// GET /dashboard/wishlist — Ops only
router.get('/wishlist', requireAuth(['operations']), async (_req: Request, res: Response) => {
  try {
    res.json(await getWishlistDashboard());
  } catch (err: unknown) {
    res.status((err as { statusCode?: number }).statusCode ?? 500).json({ message: (err as Error).message });
  }
});

// GET /dashboard/bi — Admin only
router.get('/bi', requireAuth(['admin']), async (_req: Request, res: Response) => {
  try {
    const data = await getBIMetrics();
    res.json(data);
  } catch (err: unknown) {
    const status = (err as { statusCode?: number }).statusCode ?? 500;
    res.status(status).json({ message: (err as Error).message });
  }
});

export default router;
