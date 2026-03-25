import { Router, Request, Response } from 'express';
import { requireAuth } from '../../middleware/requireAuth.js';
import { addToWishlist, removeFromWishlist, getWishlist } from './wishlist.service.js';

const router = Router();

// POST /wishlist/:packageId — Member: add to wishlist
router.post('/:packageId', requireAuth(['member']), async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await addToWishlist(req.user!.id, req.params.packageId as string);
    if (result.already_saved) {
      res.json({ already_saved: true, entry: result.entry });
    } else {
      res.status(201).json({ already_saved: false, entry: result.entry });
    }
  } catch (err: unknown) {
    const e = err as Error & { statusCode?: number };
    if (e.statusCode === 404) {
      res.status(404).json({ message: e.message });
      return;
    }
    console.error('addToWishlist error:', e);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// DELETE /wishlist/:packageId — Member: remove from wishlist
router.delete('/:packageId', requireAuth(['member']), async (req: Request, res: Response): Promise<void> => {
  try {
    await removeFromWishlist(req.user!.id, req.params.packageId as string);
    res.status(204).send();
  } catch (err: unknown) {
    const e = err as Error & { statusCode?: number };
    if (e.statusCode === 404) {
      res.status(404).json({ message: e.message });
      return;
    }
    console.error('removeFromWishlist error:', e);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /wishlist — Member: view wishlist
router.get('/', requireAuth(['member']), async (req: Request, res: Response): Promise<void> => {
  try {
    const entries = await getWishlist(req.user!.id);
    res.json(entries);
  } catch (err: unknown) {
    console.error('getWishlist error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
