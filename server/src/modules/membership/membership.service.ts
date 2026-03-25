import bcrypt from 'bcryptjs';
import { eq, ilike, and } from 'drizzle-orm';
import { db } from '../../db/connection.js';
import { users, tiers } from '../../db/schema.js';

export interface CreateMemberInput {
  email: string;
  name: string;
  phone?: string;
  tierId: string;
  membershipExpiry: string;
}

export interface CreateOpsUserInput {
  email: string;
  name: string;
}

export interface UpdateMemberInput {
  membershipExpiry?: string;
  tierId?: string;
  status?: 'active' | 'inactive';
  phone?: string;
}

function generateTemporaryPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

function computeExpiringSoon(membershipExpiry: string | null): boolean {
  if (!membershipExpiry) return false;
  const expiry = new Date(membershipExpiry);
  const now = new Date();
  const diffDays = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  return diffDays >= 0 && diffDays <= 60;
}

export async function createMember(input: CreateMemberInput) {
  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, input.email)).limit(1);
  if (existing) throw Object.assign(new Error('Email already registered'), { statusCode: 409 });

  const temporaryPassword = generateTemporaryPassword();
  const passwordHash = await bcrypt.hash(temporaryPassword, 10);

  const [member] = await db
    .insert(users)
    .values({
      email: input.email,
      name: input.name,
      phone: input.phone ?? null,
      passwordHash,
      role: 'member',
      tierId: input.tierId,
      membershipExpiry: input.membershipExpiry,
      status: 'active',
    })
    .returning({ id: users.id, email: users.email, name: users.name, role: users.role, tierId: users.tierId, membershipExpiry: users.membershipExpiry, status: users.status });

  return { member, temporaryPassword };
}

export async function createOpsUser(input: CreateOpsUserInput) {
  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, input.email)).limit(1);
  if (existing) throw Object.assign(new Error('Email already registered'), { statusCode: 409 });

  const temporaryPassword = generateTemporaryPassword();
  const passwordHash = await bcrypt.hash(temporaryPassword, 10);

  const [opsUser] = await db
    .insert(users)
    .values({ email: input.email, name: input.name, passwordHash, role: 'operations', status: 'active' })
    .returning({ id: users.id, email: users.email, name: users.name, role: users.role, status: users.status });

  return { opsUser, temporaryPassword };
}

export async function getMemberById(id: string) {
  const [row] = await db
    .select({
      id: users.id, email: users.email, name: users.name, role: users.role,
      phone: users.phone, membershipExpiry: users.membershipExpiry, status: users.status,
      tierId: tiers.id, tierName: tiers.name, tierDiscountMultiplier: tiers.discountMultiplier,
    })
    .from(users)
    .leftJoin(tiers, eq(users.tierId, tiers.id))
    .where(eq(users.id, id))
    .limit(1);

  if (!row) throw Object.assign(new Error('Member not found'), { statusCode: 404 });

  return {
    id: row.id, email: row.email, name: row.name, role: row.role, phone: row.phone,
    tier: row.tierId ? { id: row.tierId, name: row.tierName, discountMultiplier: row.tierDiscountMultiplier } : null,
    membershipExpiry: row.membershipExpiry, status: row.status,
    expiringSoon: computeExpiringSoon(row.membershipExpiry),
  };
}

export async function updateMember(id: string, input: UpdateMemberInput) {
  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.id, id)).limit(1);
  if (!existing) throw Object.assign(new Error('Member not found'), { statusCode: 404 });

  const updateValues: Record<string, unknown> = { updatedAt: new Date() };
  if (input.membershipExpiry !== undefined) updateValues.membershipExpiry = input.membershipExpiry;
  if (input.tierId !== undefined) updateValues.tierId = input.tierId;
  if (input.status !== undefined) updateValues.status = input.status;
  if (input.phone !== undefined) updateValues.phone = input.phone;

  await db.update(users).set(updateValues).where(eq(users.id, id));
  return getMemberById(id);
}

export async function getAllTiers() {
  return db.select({ id: tiers.id, name: tiers.name, discountMultiplier: tiers.discountMultiplier }).from(tiers);
}

// List members only (role = 'member') — for ops
export async function listMembers(emailFilter?: string) {
  const conditions = [eq(users.role, 'member')];
  if (emailFilter) conditions.push(ilike(users.email, `%${emailFilter}%`) as any);

  const rows = await db
    .select({
      id: users.id, email: users.email, name: users.name, role: users.role,
      phone: users.phone, membershipExpiry: users.membershipExpiry, status: users.status,
      tierId: tiers.id, tierName: tiers.name,
    })
    .from(users)
    .leftJoin(tiers, eq(users.tierId, tiers.id))
    .where(and(...conditions));

  return rows.map((r) => ({
    id: r.id, email: r.email, name: r.name, role: r.role, phone: r.phone,
    membershipExpiry: r.membershipExpiry, status: r.status,
    tier: r.tierId ? { id: r.tierId, name: r.tierName } : null,
  }));
}

// List ops users — for admin
export async function listOpsUsers() {
  return db
    .select({ id: users.id, email: users.email, name: users.name, status: users.status, createdAt: users.createdAt })
    .from(users)
    .where(eq(users.role, 'operations'));
}
