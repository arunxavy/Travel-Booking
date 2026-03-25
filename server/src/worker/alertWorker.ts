import cron from 'node-cron';
import { and, eq, gte, lte } from 'drizzle-orm';
import { db } from '../db/connection.js';
import { specialDays, vouchers, workerLogs } from '../db/schema.js';
import { issueGiftVoucher } from '../modules/voucher/voucher.service.js';

async function runSpecialDayScan(): Promise<void> {
  try {
    const today = new Date();
    const in30Days = new Date(today);
    in30Days.setDate(today.getDate() + 30);

    // Extract month/day from today and 30 days from now for comparison
    const todayMonth = today.getMonth() + 1;
    const todayDay = today.getDate();
    const futureMonth = in30Days.getMonth() + 1;
    const futureDay = in30Days.getDate();

    // Fetch all special days and filter in JS to handle month/day wrap-around correctly
    const allSpecialDays = await db
      .select({
        id: specialDays.id,
        userId: specialDays.userId,
        eventDate: specialDays.eventDate,
      })
      .from(specialDays);

    // Filter: check if the month+day of eventDate falls within the next 30 days
    const matchingSpecialDays = allSpecialDays.filter((sd: { id: string; userId: string; eventDate: string }) => {
      const eventDate = new Date(sd.eventDate);
      const eventMonth = eventDate.getUTCMonth() + 1;
      const eventDay = eventDate.getUTCDate();

      // Build comparable numbers: MMDD
      const eventMMDD = eventMonth * 100 + eventDay;
      const todayMMDD = todayMonth * 100 + todayDay;
      const futureMMDD = futureMonth * 100 + futureDay;

      if (todayMMDD <= futureMMDD) {
        // No year wrap: simple range check
        return eventMMDD >= todayMMDD && eventMMDD <= futureMMDD;
      } else {
        // Year wrap (e.g. Dec 20 → Jan 19): event is in [today..Dec31] OR [Jan1..future]
        return eventMMDD >= todayMMDD || eventMMDD <= futureMMDD;
      }
    });

    // For each matching member, check if a gift voucher was already issued today
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

    for (const sd of matchingSpecialDays) {
      const existingVouchers = await db
        .select({ id: vouchers.id })
        .from(vouchers)
        .where(
          and(
            eq(vouchers.memberId, sd.userId),
            gte(vouchers.issuedAt, todayStart),
            lte(vouchers.issuedAt, todayEnd)
          )
        )
        .limit(1);

      if (existingVouchers.length === 0) {
        await issueGiftVoucher(sd.userId);
      }
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);

    await db.insert(workerLogs).values({
      timestamp: new Date(),
      error: errorMessage,
      cycle: 'special_day_scan',
    }).catch((logErr: unknown) => {
      console.error('[AlertWorker] Failed to write to worker_logs:', logErr);
    });

    // Schedule retry after 5 minutes — never throw
    setTimeout(() => {
      runSpecialDayScan().catch(() => {
        // Swallow retry errors to prevent unhandled rejections
      });
    }, 5 * 60 * 1000);
  }
}

export function startAlertWorker(): void {
  // Schedule at 2 AM daily
  cron.schedule('0 2 * * *', () => {
    runSpecialDayScan().catch(() => {
      // Swallow unhandled rejections — worker must not crash the server
    });
  });

  console.log('[AlertWorker] Scheduled special day scan at 0 2 * * * (2 AM daily)');
}
