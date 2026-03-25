import 'dotenv/config';
import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { join } from 'path';
import { fileURLToPath } from 'url';
import authRouter from './modules/auth/auth.router.js';
import membershipRouter from './modules/membership/membership.router.js';
import { templateRouter, voucherRouter } from './modules/voucher/voucher.router.js';
import packageRouter from './modules/package/package.router.js';
import wishlistRouter from './modules/wishlist/wishlist.router.js';
import bookingRouter from './modules/booking/booking.router.js';
import { startAlertWorker } from './worker/alertWorker.js';
import dashboardRouter from './modules/dashboard/dashboard.router.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const isProd = process.env.NODE_ENV === 'production';

const app = express();
const PORT = process.env.PORT ?? 3000;

// In production the React app is served by Express, so no separate origin needed
app.use(cors({
  origin: isProd ? false : (process.env.CLIENT_URL ?? 'http://localhost:5173'),
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// API routes — must be registered before the static catch-all
app.use('/api/auth', authRouter);
app.use('/api/members', membershipRouter);
app.use('/api/voucher-templates', templateRouter);
app.use('/api/vouchers', voucherRouter);
app.use('/api/packages', packageRouter);
app.use('/api/wishlist', wishlistRouter);
app.use('/api/bookings', bookingRouter);
app.use('/api/dashboard', dashboardRouter);

// Serve React build in production
if (isProd) {
  const clientDist = join(__dirname, '../../client/dist');
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => {
    res.sendFile(join(clientDist, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  startAlertWorker();
});

export default app;
