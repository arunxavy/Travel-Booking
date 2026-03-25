import { Router, Request, Response } from 'express';
import {
  loginUser,
  signAccessToken,
  verifyRefreshToken,
  REFRESH_COOKIE_NAME,
  REFRESH_COOKIE_OPTIONS,
} from './auth.service.js';

const router = Router();

// POST /auth/login
router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ message: 'Email and password are required' });
    return;
  }

  try {
    const { accessToken, refreshToken, user } = await loginUser(email, password);

    res.cookie(REFRESH_COOKIE_NAME, refreshToken, REFRESH_COOKIE_OPTIONS);
    res.json({ accessToken, user });
  } catch (err: unknown) {
    const statusCode = (err as { statusCode?: number }).statusCode ?? 500;
    const message = statusCode === 401 ? 'Invalid credentials' : 'Internal server error';
    if (statusCode === 500) console.error('[auth/login] error:', err);
    res.status(statusCode).json({ message });
  }
});

// POST /auth/refresh
router.post('/refresh', (req: Request, res: Response) => {
  const token = req.cookies?.[REFRESH_COOKIE_NAME];

  if (!token) {
    res.status(401).json({ message: 'No refresh token' });
    return;
  }

  try {
    const payload = verifyRefreshToken(token);
    const accessToken = signAccessToken({ id: payload.id, role: payload.role });
    res.json({ accessToken });
  } catch (err: unknown) {
    const isExpired = (err as Error).name === 'TokenExpiredError';
    res.status(401).json({
      message: isExpired ? 'Refresh token expired' : 'Invalid refresh token',
      ...(isExpired && { code: 'token_expired' }),
    });
  }
});

// POST /auth/logout
router.post('/logout', (_req: Request, res: Response) => {
  res.clearCookie(REFRESH_COOKIE_NAME, { path: '/' });
  res.status(200).json({ message: 'Logged out' });
});

export default router;
