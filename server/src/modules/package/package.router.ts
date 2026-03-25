import { Router, Request, Response } from 'express';
import { requireAuth } from '../../middleware/requireAuth.js';
import { searchPackages, createPackage, updatePackage } from './package.service.js';

const router = Router();

// GET /packages — Member/Ops/Admin: search/browse packages
router.get('/', requireAuth(['member', 'operations', 'admin']), async (req: Request, res: Response): Promise<void> => {
  const { location, category, maxPrice } = req.query;
  const input: { location?: string; category?: string; maxPrice?: number } = {};
  if (typeof location === 'string') input.location = location;
  if (typeof category === 'string') input.category = category;
  if (typeof maxPrice === 'string') {
    const parsed = parseFloat(maxPrice);
    if (isNaN(parsed)) { res.status(400).json({ message: 'maxPrice must be a valid number' }); return; }
    input.maxPrice = parsed;
  }
  try {
    res.json(await searchPackages(input));
  } catch (err: unknown) {
    console.error('searchPackages error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /packages — Admin: create package
router.post('/', requireAuth(['admin']), async (req: Request, res: Response): Promise<void> => {
  const { title, location, category, price, isFeatured, numberOfDays, itinerary, included, excluded } = req.body;
  if (!title || !location || !category || price === undefined) {
    res.status(400).json({ message: 'Missing required fields: title, location, category, price' });
    return;
  }
  try {
    const pkg = await createPackage({ title, location, category, price, isFeatured, numberOfDays, itinerary, included, excluded });
    res.status(201).json(pkg);
  } catch (err: unknown) {
    const e = err as Error & { statusCode?: number };
    res.status(e.statusCode ?? 500).json({ message: e.message });
  }
});

// PATCH /packages/:id — Admin: update package
router.patch('/:id', requireAuth(['admin']), async (req: Request, res: Response): Promise<void> => {
  const { title, location, category, price, isFeatured, numberOfDays, itinerary, included, excluded } = req.body;
  try {
    const pkg = await updatePackage(req.params.id as string, { title, location, category, price, isFeatured, numberOfDays, itinerary, included, excluded });
    res.json(pkg);
  } catch (err: unknown) {
    const e = err as Error & { statusCode?: number };
    res.status(e.statusCode ?? 500).json({ message: e.message });
  }
});

export default router;
