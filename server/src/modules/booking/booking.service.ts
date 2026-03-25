import { eq, and } from 'drizzle-orm';
import { db } from '../../db/connection.js';
import { bookings, packages, vouchers, voucherTemplates, users } from '../../db/schema.js';
import { assertValidTransition } from '../voucher/voucher.service.js';

export type BookingStatus = 'new_request' | 'in_review' | 'confirmed' | 'cancelled';

const VALID_BOOKING_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  new_request: ['in_review'],
  in_review: ['confirmed', 'cancelled'],
  confirmed: [],
  cancelled: [],
};

// Task 11.1: Create a booking
export async function createBooking(memberId: string, packageId: string, voucherId?: string) {
  // Validate package exists
  const [pkg] = await db
    .select({ id: packages.id })
    .from(packages)
    .where(eq(packages.id, packageId))
    .limit(1);

  if (!pkg) {
    const err = Object.assign(new Error('Package not found'), { statusCode: 404 });
    throw err;
  }

  // Validate voucher if provided
  if (voucherId) {
    const [voucher] = await db
      .select()
      .from(vouchers)
      .where(and(eq(vouchers.id, voucherId), eq(vouchers.memberId, memberId)))
      .limit(1);

    if (!voucher) {
      const err = Object.assign(new Error('Voucher not found or does not belong to member'), {
        statusCode: 404,
      });
      throw err;
    }

    if (voucher.status !== 'issued') {
      const err = Object.assign(
        new Error(`Voucher is not in Issued status (current: ${voucher.status})`),
        { statusCode: 409, currentVoucherStatus: voucher.status }
      );
      throw err;
    }

    // Transition voucher to pending
    assertValidTransition('issued', 'pending');
    await db
      .update(vouchers)
      .set({ status: 'pending' })
      .where(eq(vouchers.id, voucherId));
  }

  const [booking] = await db
    .insert(bookings)
    .values({
      memberId,
      packageId,
      voucherId: voucherId ?? null,
      status: 'new_request',
    })
    .returning();

  return booking;
}

// Task 11.2: Get booking history for a member
export async function getMemberBookings(memberId: string) {
  const results = await db
    .select({
      id: bookings.id,
      status: bookings.status,
      createdAt: bookings.createdAt,
      updatedAt: bookings.updatedAt,
      package: {
        id: packages.id,
        title: packages.title,
        location: packages.location,
        category: packages.category,
        price: packages.price,
        isFeatured: packages.isFeatured,
      },
      voucherId: bookings.voucherId,
    })
    .from(bookings)
    .innerJoin(packages, eq(bookings.packageId, packages.id))
    .where(eq(bookings.memberId, memberId))
    .orderBy(bookings.createdAt);

  type BookingRow = (typeof results)[number];

  // Enrich with voucher details if present
  const enriched = await Promise.all(
    results.map(async (b: BookingRow) => {
      if (!b.voucherId) return { ...b, voucher: null };

      const [voucher] = await db
        .select({
          id: vouchers.id,
          status: vouchers.status,
          valueType: voucherTemplates.valueType,
          discountValue: voucherTemplates.discountValue,
        })
        .from(vouchers)
        .innerJoin(voucherTemplates, eq(vouchers.templateId, voucherTemplates.id))
        .where(eq(vouchers.id, b.voucherId))
        .limit(1);

      return { ...b, voucher: voucher ?? null };
    })
  );

  return enriched;
}

// Task 11.3: Update booking status (Ops) with state machine enforcement
export async function updateBookingStatus(bookingId: string, newStatus: BookingStatus) {
  const [booking] = await db
    .select()
    .from(bookings)
    .where(eq(bookings.id, bookingId))
    .limit(1);

  if (!booking) {
    const err = Object.assign(new Error('Booking not found'), { statusCode: 404 });
    throw err;
  }

  const currentStatus = booking.status as BookingStatus;
  const allowed = VALID_BOOKING_TRANSITIONS[currentStatus] ?? [];

  if (!allowed.includes(newStatus)) {
    const err = Object.assign(
      new Error(
        `Invalid booking state transition: ${currentStatus} → ${newStatus}. Allowed: ${allowed.join(', ') || 'none'}`
      ),
      { statusCode: 422, currentStatus, allowedTransitions: allowed }
    );
    throw err;
  }

  // Handle voucher transitions on booking status change
  if (booking.voucherId) {
    if (newStatus === 'confirmed') {
      // Transition voucher: pending → redeemed
      assertValidTransition('pending', 'redeemed');
      await db
        .update(vouchers)
        .set({ status: 'redeemed', redeemedAt: new Date() })
        .where(eq(vouchers.id, booking.voucherId));
    } else if (newStatus === 'cancelled') {
      // Revert voucher: pending → issued
      assertValidTransition('pending', 'issued');
      await db
        .update(vouchers)
        .set({ status: 'issued' })
        .where(eq(vouchers.id, booking.voucherId));
    }
  }

  const [updated] = await db
    .update(bookings)
    .set({ status: newStatus, updatedAt: new Date() })
    .where(eq(bookings.id, bookingId))
    .returning();

  return updated;
}

// Get all bookings (Ops/Admin)
export async function getAllBookings() {
  const results = await db
    .select({
      id: bookings.id,
      status: bookings.status,
      createdAt: bookings.createdAt,
      updatedAt: bookings.updatedAt,
      memberId: bookings.memberId,
      memberName: users.name,
      memberEmail: users.email,
      voucherId: bookings.voucherId,
      package: {
        id: packages.id,
        title: packages.title,
        location: packages.location,
        price: packages.price,
      },
    })
    .from(bookings)
    .innerJoin(packages, eq(bookings.packageId, packages.id))
    .innerJoin(users, eq(bookings.memberId, users.id))
    .orderBy(bookings.createdAt);

  return results;
}
