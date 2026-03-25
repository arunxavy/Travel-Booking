import { eq, sql } from 'drizzle-orm';
import { db } from '../../db/connection.js';
import { specialDays, users, bookings, wishlist, packages, vouchers, voucherTemplates, tiers } from '../../db/schema.js';

// ─── Lookahead (Ops) ────────────────────────────────────────────────────────

export interface LookaheadEntry {
  memberName: string;
  label: string;
  eventDate: string;
  daysRemaining: number;
}

export async function getLookahead(): Promise<LookaheadEntry[]> {
  const today = new Date();
  const in30Days = new Date(today);
  in30Days.setDate(today.getDate() + 30);

  const todayMonth = today.getMonth() + 1;
  const todayDay = today.getDate();
  const futureMonth = in30Days.getMonth() + 1;
  const futureDay = in30Days.getDate();

  const todayMMDD = todayMonth * 100 + todayDay;
  const futureMMDD = futureMonth * 100 + futureDay;

  // Fetch all special days with member names
  const allSpecialDays = await db
    .select({
      label: specialDays.label,
      eventDate: specialDays.eventDate,
      memberName: users.name,
    })
    .from(specialDays)
    .innerJoin(users, eq(specialDays.userId, users.id));

  const results: LookaheadEntry[] = [];

  for (const sd of allSpecialDays) {
    const eventDate = new Date(sd.eventDate);
    const eventMonth = eventDate.getUTCMonth() + 1;
    const eventDay = eventDate.getUTCDate();
    const eventMMDD = eventMonth * 100 + eventDay;

    // Same year-wrap logic as the Alert Worker
    const inWindow =
      todayMMDD <= futureMMDD
        ? eventMMDD >= todayMMDD && eventMMDD <= futureMMDD
        : eventMMDD >= todayMMDD || eventMMDD <= futureMMDD;

    if (!inWindow) continue;

    // Compute next occurrence date (this year or next year)
    const thisYear = today.getFullYear();
    let nextOccurrence = new Date(thisYear, eventMonth - 1, eventDay);
    if (nextOccurrence < today) {
      nextOccurrence = new Date(thisYear + 1, eventMonth - 1, eventDay);
    }

    const msPerDay = 1000 * 60 * 60 * 24;
    const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const daysRemaining = Math.round(
      (nextOccurrence.getTime() - todayMidnight.getTime()) / msPerDay
    );

    results.push({
      memberName: sd.memberName,
      label: sd.label,
      eventDate: sd.eventDate,
      daysRemaining,
    });
  }

  // Sort by daysRemaining ascending
  results.sort((a, b) => a.daysRemaining - b.daysRemaining);

  return results;
}

// ─── Ops Wishlist Dashboard ─────────────────────────────────────────────────

export interface WishlistDashboardEntry {
  memberId: string;
  memberName: string;
  memberEmail: string;
  packageId: string;
  packageTitle: string;
  packageLocation: string;
  savedAt: string;
}

export async function getWishlistDashboard(): Promise<WishlistDashboardEntry[]> {
  const rows = await db
    .select({
      memberId: users.id,
      memberName: users.name,
      memberEmail: users.email,
      packageId: packages.id,
      packageTitle: packages.title,
      packageLocation: packages.location,
      savedAt: wishlist.savedAt,
    })
    .from(wishlist)
    .innerJoin(users, eq(wishlist.memberId, users.id))
    .innerJoin(packages, eq(wishlist.packageId, packages.id))
    .orderBy(wishlist.savedAt);

  return rows.map((r) => ({
    memberId: r.memberId,
    memberName: r.memberName,
    memberEmail: r.memberEmail,
    packageId: r.packageId,
    packageTitle: r.packageTitle,
    packageLocation: r.packageLocation,
    savedAt: r.savedAt.toISOString(),
  }));
}

// ─── BI Dashboard (Admin) ───────────────────────────────────────────────────

export interface BookingsByMonth {
  year: number;
  month: number;
  count: number;
}

export interface BookingsByYear {
  year: number;
  count: number;
}

export interface ExpiringMembership {
  id: string;
  name: string;
  email: string;
  membershipExpiry: string;
  tier: string | null;
}

export interface TopWishlistedPackage {
  packageId: string;
  title: string;
  location: string;
  saveCount: number;
}

export interface VoucherRedemptionRate {
  valueType: string;
  totalIssued: number;
  totalRedeemed: number;
  redemptionRate: number;
}

export interface BIMetrics {
  bookingsByMonth: BookingsByMonth[];
  bookingsByYear: BookingsByYear[];
  expiringMemberships: ExpiringMembership[];
  topWishlistedPackages: TopWishlistedPackage[];
  voucherRedemptionRates: VoucherRedemptionRate[];
}

export async function getBIMetrics(): Promise<BIMetrics> {
  const [
    bookingsByMonthRows,
    bookingsByYearRows,
    expiringRows,
    wishlistRows,
    voucherRows,
  ] = await Promise.all([
    // Confirmed bookings grouped by year+month
    db
      .select({
        year: sql<number>`EXTRACT(YEAR FROM ${bookings.createdAt})::int`,
        month: sql<number>`EXTRACT(MONTH FROM ${bookings.createdAt})::int`,
        count: sql<number>`COUNT(*)::int`,
      })
      .from(bookings)
      .where(eq(bookings.status, 'confirmed'))
      .groupBy(
        sql`EXTRACT(YEAR FROM ${bookings.createdAt})`,
        sql`EXTRACT(MONTH FROM ${bookings.createdAt})`
      )
      .orderBy(
        sql`EXTRACT(YEAR FROM ${bookings.createdAt})`,
        sql`EXTRACT(MONTH FROM ${bookings.createdAt})`
      ),

    // Confirmed bookings grouped by year
    db
      .select({
        year: sql<number>`EXTRACT(YEAR FROM ${bookings.createdAt})::int`,
        count: sql<number>`COUNT(*)::int`,
      })
      .from(bookings)
      .where(eq(bookings.status, 'confirmed'))
      .groupBy(sql`EXTRACT(YEAR FROM ${bookings.createdAt})`)
      .orderBy(sql`EXTRACT(YEAR FROM ${bookings.createdAt})`),

    // Members expiring within 60 days
    db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        membershipExpiry: users.membershipExpiry,
        tier: tiers.name,
      })
      .from(users)
      .leftJoin(tiers, eq(users.tierId, tiers.id))
      .where(
        sql`${users.membershipExpiry} IS NOT NULL
          AND ${users.membershipExpiry}::date >= CURRENT_DATE
          AND ${users.membershipExpiry}::date <= CURRENT_DATE + INTERVAL '60 days'`
      )
      .orderBy(users.membershipExpiry),

    // Top 10 most wishlisted packages
    db
      .select({
        packageId: packages.id,
        title: packages.title,
        location: packages.location,
        saveCount: sql<number>`COUNT(${wishlist.id})::int`,
      })
      .from(wishlist)
      .innerJoin(packages, eq(wishlist.packageId, packages.id))
      .groupBy(packages.id, packages.title, packages.location)
      .orderBy(sql`COUNT(${wishlist.id}) DESC`)
      .limit(10),

    // Voucher redemption rates by value type
    db
      .select({
        valueType: voucherTemplates.valueType,
        totalIssued: sql<number>`COUNT(${vouchers.id})::int`,
        totalRedeemed: sql<number>`COUNT(CASE WHEN ${vouchers.status} = 'redeemed' THEN 1 END)::int`,
      })
      .from(vouchers)
      .innerJoin(voucherTemplates, eq(vouchers.templateId, voucherTemplates.id))
      .groupBy(voucherTemplates.valueType),
  ]);

  const voucherRedemptionRates: VoucherRedemptionRate[] = voucherRows.map((row: { valueType: string; totalIssued: number; totalRedeemed: number }) => ({
    valueType: row.valueType,
    totalIssued: row.totalIssued,
    totalRedeemed: row.totalRedeemed,
    redemptionRate:
      row.totalIssued > 0
        ? Math.round((row.totalRedeemed / row.totalIssued) * 10000) / 100
        : 0,
  }));

  return {
    bookingsByMonth: bookingsByMonthRows,
    bookingsByYear: bookingsByYearRows,
    expiringMemberships: expiringRows.map((r: { id: string; name: string; email: string; membershipExpiry: string | null; tier: string | null }) => ({
      id: r.id,
      name: r.name,
      email: r.email,
      membershipExpiry: r.membershipExpiry ?? '',
      tier: r.tier ?? null,
    })),
    topWishlistedPackages: wishlistRows,
    voucherRedemptionRates,
  };
}
