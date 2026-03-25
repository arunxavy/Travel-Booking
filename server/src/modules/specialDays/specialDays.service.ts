import { eq, and, count } from 'drizzle-orm';
import { db } from '../../db/connection.js';
import { specialDays } from '../../db/schema.js';

export interface CreateSpecialDayInput {
  userId: string;
  label: string;
  eventDate: string;
}

export interface UpdateSpecialDayInput {
  label?: string;
  eventDate?: string;
}

const MAX_SPECIAL_DAYS = 4;

export async function getSpecialDays(userId: string) {
  return db
    .select({
      id: specialDays.id,
      label: specialDays.label,
      eventDate: specialDays.eventDate,
      createdAt: specialDays.createdAt,
    })
    .from(specialDays)
    .where(eq(specialDays.userId, userId));
}

export async function createSpecialDay(input: CreateSpecialDayInput) {
  const [{ total }] = await db
    .select({ total: count() })
    .from(specialDays)
    .where(eq(specialDays.userId, input.userId));

  if (total >= MAX_SPECIAL_DAYS) {
    const err = Object.assign(
      new Error('Maximum of 4 Special Days allowed per member'),
      { statusCode: 422 }
    );
    throw err;
  }

  const [created] = await db
    .insert(specialDays)
    .values({
      userId: input.userId,
      label: input.label,
      eventDate: input.eventDate,
    })
    .returning({
      id: specialDays.id,
      label: specialDays.label,
      eventDate: specialDays.eventDate,
      createdAt: specialDays.createdAt,
    });

  return created;
}

export async function updateSpecialDay(id: string, userId: string, input: UpdateSpecialDayInput) {
  const [existing] = await db
    .select({ id: specialDays.id })
    .from(specialDays)
    .where(and(eq(specialDays.id, id), eq(specialDays.userId, userId)))
    .limit(1);

  if (!existing) {
    const err = Object.assign(new Error('Special day not found'), { statusCode: 404 });
    throw err;
  }

  const updateValues: Record<string, unknown> = {};
  if (input.label !== undefined) updateValues.label = input.label;
  if (input.eventDate !== undefined) updateValues.eventDate = input.eventDate;

  const [updated] = await db
    .update(specialDays)
    .set(updateValues)
    .where(and(eq(specialDays.id, id), eq(specialDays.userId, userId)))
    .returning({
      id: specialDays.id,
      label: specialDays.label,
      eventDate: specialDays.eventDate,
      createdAt: specialDays.createdAt,
    });

  return updated;
}

export async function deleteSpecialDay(id: string, userId: string) {
  const [existing] = await db
    .select({ id: specialDays.id })
    .from(specialDays)
    .where(and(eq(specialDays.id, id), eq(specialDays.userId, userId)))
    .limit(1);

  if (!existing) {
    const err = Object.assign(new Error('Special day not found'), { statusCode: 404 });
    throw err;
  }

  await db
    .delete(specialDays)
    .where(and(eq(specialDays.id, id), eq(specialDays.userId, userId)));
}
