import { eq, and, desc } from 'drizzle-orm';
import { db } from '../../db/connection.js';
import { customBookings, bookingComments, vouchers, users } from '../../db/schema.js';
import { assertValidTransition } from '../voucher/voucher.service.js';
import type { BookingStatus } from './booking.service.js';

export interface CreateCustomBookingInput {
  memberId: string;
  destination: string;
  hotelName?: string;
  googleLink?: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  kids: number;
  kidAges?: number[];
  voucherId?: string;
  notes?: string;
}

export async function createCustomBooking(input: CreateCustomBookingInput) {
  if (input.voucherId) {
    const [voucher] = await db
      .select()
      .from(vouchers)
      .where(and(eq(vouchers.id, input.voucherId), eq(vouchers.memberId, input.memberId)))
      .limit(1);

    if (!voucher) throw Object.assign(new Error('Voucher not found or does not belong to member'), { statusCode: 404 });
    if (voucher.status !== 'issued') throw Object.assign(new Error(`Voucher is not in Issued status (current: ${voucher.status})`), { statusCode: 409 });

    assertValidTransition('issued', 'pending');
    await db.update(vouchers).set({ status: 'pending' }).where(eq(vouchers.id, input.voucherId));
  }

  const [booking] = await db
    .insert(customBookings)
    .values({
      memberId: input.memberId,
      destination: input.destination,
      hotelName: input.hotelName ?? null,
      googleLink: input.googleLink ?? null,
      checkIn: input.checkIn,
      checkOut: input.checkOut,
      adults: input.adults,
      kids: input.kids,
      kidAges: input.kidAges ? JSON.stringify(input.kidAges) : null,
      voucherId: input.voucherId ?? null,
      notes: input.notes ?? null,
      status: 'new_request',
    })
    .returning();

  return booking;
}

export async function getMemberCustomBookings(memberId: string) {
  return db
    .select()
    .from(customBookings)
    .where(eq(customBookings.memberId, memberId))
    .orderBy(desc(customBookings.createdAt));
}

export async function getAllCustomBookings() {
  const rows = await db
    .select({
      id: customBookings.id,
      destination: customBookings.destination,
      hotelName: customBookings.hotelName,
      googleLink: customBookings.googleLink,
      checkIn: customBookings.checkIn,
      checkOut: customBookings.checkOut,
      adults: customBookings.adults,
      kids: customBookings.kids,
      kidAges: customBookings.kidAges,
      voucherId: customBookings.voucherId,
      status: customBookings.status,
      notes: customBookings.notes,
      createdAt: customBookings.createdAt,
      updatedAt: customBookings.updatedAt,
      memberId: users.id,
      memberName: users.name,
      memberEmail: users.email,
    })
    .from(customBookings)
    .innerJoin(users, eq(customBookings.memberId, users.id))
    .orderBy(desc(customBookings.createdAt));

  return rows;
}

export async function updateCustomBookingStatus(bookingId: string, newStatus: BookingStatus) {
  const [booking] = await db
    .select()
    .from(customBookings)
    .where(eq(customBookings.id, bookingId))
    .limit(1);

  if (!booking) throw Object.assign(new Error('Custom booking not found'), { statusCode: 404 });

  const TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
    new_request: ['in_review'],
    in_review: ['confirmed', 'cancelled'],
    confirmed: [],
    cancelled: [],
  };

  const allowed = TRANSITIONS[booking.status as BookingStatus] ?? [];
  if (!allowed.includes(newStatus)) {
    throw Object.assign(
      new Error(`Invalid transition: ${booking.status} → ${newStatus}. Allowed: ${allowed.join(', ') || 'none'}`),
      { statusCode: 422, currentStatus: booking.status, allowedTransitions: allowed }
    );
  }

  if (booking.voucherId) {
    if (newStatus === 'confirmed') {
      assertValidTransition('pending', 'redeemed');
      await db.update(vouchers).set({ status: 'redeemed', redeemedAt: new Date() }).where(eq(vouchers.id, booking.voucherId));
    } else if (newStatus === 'cancelled') {
      assertValidTransition('pending', 'issued');
      await db.update(vouchers).set({ status: 'issued' }).where(eq(vouchers.id, booking.voucherId));
    }
  }

  const [updated] = await db
    .update(customBookings)
    .set({ status: newStatus, updatedAt: new Date() })
    .where(eq(customBookings.id, bookingId))
    .returning();

  return updated;
}

// ── Comments ──────────────────────────────────────────────────────────────────

export async function addComment(
  bookingId: string,
  bookingType: 'package' | 'custom',
  authorId: string,
  authorRole: string,
  message: string
) {
  const [comment] = await db
    .insert(bookingComments)
    .values({ bookingId, bookingType, authorId, authorRole, message })
    .returning();
  return comment;
}

export async function getComments(bookingId: string, bookingType: 'package' | 'custom') {
  const rows = await db
    .select({
      id: bookingComments.id,
      message: bookingComments.message,
      authorRole: bookingComments.authorRole,
      createdAt: bookingComments.createdAt,
      authorName: users.name,
    })
    .from(bookingComments)
    .innerJoin(users, eq(bookingComments.authorId, users.id))
    .where(and(eq(bookingComments.bookingId, bookingId), eq(bookingComments.bookingType, bookingType)))
    .orderBy(bookingComments.createdAt);

  return rows;
}
