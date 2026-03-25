import { eq, and } from 'drizzle-orm';
import { db } from '../../db/connection.js';
import { vouchers, voucherTemplates, users } from '../../db/schema.js';

export type VoucherValueType = 'cashback' | 'seasonal' | 'tier_locked' | 'free_night' | 'fixed_amount';
export type VoucherStatus = 'issued' | 'pending' | 'redeemed' | 'expired';

export interface CreateTemplateInput {
  valueType: VoucherValueType;
  discountValue: number;
  tierRestriction?: string;
  isFlash: boolean;
  flashHours?: number;
}

// Task 7.5: Valid state transitions
const VALID_TRANSITIONS: Record<VoucherStatus, VoucherStatus[]> = {
  issued: ['pending', 'expired'],
  pending: ['redeemed', 'issued'],
  redeemed: [],
  expired: [],
};

export function assertValidTransition(from: VoucherStatus, to: VoucherStatus): void {
  const allowed = VALID_TRANSITIONS[from] ?? [];
  if (!allowed.includes(to)) {
    const err = Object.assign(
      new Error(`Invalid voucher state transition: ${from} → ${to}. Allowed: ${allowed.join(', ') || 'none'}`),
      { statusCode: 422, currentStatus: from, allowedTransitions: allowed }
    );
    throw err;
  }
}

// Task 7.1: Create voucher template
export async function createTemplate(input: CreateTemplateInput) {
  if (!['cashback', 'seasonal', 'tier_locked', 'free_night', 'fixed_amount'].includes(input.valueType)) {
    const err = Object.assign(new Error('Invalid value type'), { statusCode: 400 });
    throw err;
  }

  const [template] = await db
    .insert(voucherTemplates)
    .values({
      valueType: input.valueType,
      discountValue: String(input.discountValue),
      tierRestriction: input.tierRestriction ?? null,
      isFlash: input.isFlash,
      flashHours: input.flashHours ?? null,
    })
    .returning();

  return template;
}

// Task 7.2: Assign voucher to a single member
export async function assignVoucher(templateId: string, memberId: string) {
  const [template] = await db
    .select()
    .from(voucherTemplates)
    .where(eq(voucherTemplates.id, templateId))
    .limit(1);

  if (!template) {
    const err = Object.assign(new Error('Voucher template not found'), { statusCode: 404 });
    throw err;
  }

  const [member] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, memberId))
    .limit(1);

  if (!member) {
    const err = Object.assign(new Error('Member not found'), { statusCode: 404 });
    throw err;
  }

  const issuedAt = new Date();
  // Task 7.6: Flash voucher expiry calculation
  const expiresAt = template.isFlash && template.flashHours
    ? new Date(issuedAt.getTime() + template.flashHours * 60 * 60 * 1000)
    : null;

  const [voucher] = await db
    .insert(vouchers)
    .values({
      templateId,
      memberId,
      status: 'issued',
      issuedAt,
      expiresAt,
    })
    .returning();

  return voucher;
}

// Task 7.3: Bulk assign voucher to all members in a tier
export async function bulkAssignVoucher(templateId: string, tierId: string) {
  const [template] = await db
    .select()
    .from(voucherTemplates)
    .where(eq(voucherTemplates.id, templateId))
    .limit(1);

  if (!template) {
    const err = Object.assign(new Error('Voucher template not found'), { statusCode: 404 });
    throw err;
  }

  const tierMembers = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.tierId, tierId), eq(users.role, 'member')));

  if (tierMembers.length === 0) {
    return { created: 0, vouchers: [] };
  }

  const issuedAt = new Date();
  const expiresAt = template.isFlash && template.flashHours
    ? new Date(issuedAt.getTime() + template.flashHours * 60 * 60 * 1000)
    : null;

  const rows = tierMembers.map((m: { id: string }) => ({
    templateId,
    memberId: m.id,
    status: 'issued' as VoucherStatus,
    issuedAt,
    expiresAt,
  }));

  const created = await db.insert(vouchers).values(rows).returning();

  return { created: created.length, vouchers: created };
}

// Task 7.4: Get member wallet grouped by status
export async function getMemberWallet(memberId: string) {
  const memberVouchers = await db
    .select({
      id: vouchers.id,
      templateId: vouchers.templateId,
      status: vouchers.status,
      issuedAt: vouchers.issuedAt,
      expiresAt: vouchers.expiresAt,
      redeemedAt: vouchers.redeemedAt,
      valueType: voucherTemplates.valueType,
      discountValue: voucherTemplates.discountValue,
      isFlash: voucherTemplates.isFlash,
      flashHours: voucherTemplates.flashHours,
      tierRestriction: voucherTemplates.tierRestriction,
    })
    .from(vouchers)
    .innerJoin(voucherTemplates, eq(vouchers.templateId, voucherTemplates.id))
    .where(eq(vouchers.memberId, memberId));

  // Group: available = issued (non-flash), flash = issued (flash), pending, used = redeemed, expired
  const wallet = {
    available: [] as typeof memberVouchers,
    flash: [] as typeof memberVouchers,
    pending: [] as typeof memberVouchers,
    used: [] as typeof memberVouchers,
    expired: [] as typeof memberVouchers,
  };

  for (const v of memberVouchers) {
    if (v.status === 'issued') {
      if (v.isFlash) {
        wallet.flash.push(v);
      } else {
        wallet.available.push(v);
      }
    } else if (v.status === 'pending') {
      wallet.pending.push(v);
    } else if (v.status === 'redeemed') {
      wallet.used.push(v);
    } else if (v.status === 'expired') {
      wallet.expired.push(v);
    }
  }

  return wallet;
}

// Task 7.7: Tier-locked redemption guard
export async function assertTierAccess(voucherId: string, memberId: string): Promise<void> {
  const [row] = await db
    .select({
      tierRestriction: voucherTemplates.tierRestriction,
      memberTierId: users.tierId,
    })
    .from(vouchers)
    .innerJoin(voucherTemplates, eq(vouchers.templateId, voucherTemplates.id))
    .innerJoin(users, eq(vouchers.memberId, users.id))
    .where(and(eq(vouchers.id, voucherId), eq(vouchers.memberId, memberId)))
    .limit(1);

  if (!row) {
    const err = Object.assign(new Error('Voucher not found'), { statusCode: 404 });
    throw err;
  }

  if (row.tierRestriction && row.tierRestriction !== row.memberTierId) {
    const err = Object.assign(
      new Error('This voucher is restricted to a different membership tier'),
      { statusCode: 403, code: 'tier_mismatch' }
    );
    throw err;
  }
}

// Transition a voucher's status with state machine enforcement
export async function transitionVoucherStatus(
  voucherId: string,
  memberId: string,
  toStatus: VoucherStatus
): Promise<typeof vouchers.$inferSelect> {
  const [voucher] = await db
    .select()
    .from(vouchers)
    .where(and(eq(vouchers.id, voucherId), eq(vouchers.memberId, memberId)))
    .limit(1);

  if (!voucher) {
    const err = Object.assign(new Error('Voucher not found'), { statusCode: 404 });
    throw err;
  }

  assertValidTransition(voucher.status as VoucherStatus, toStatus);

  // Task 7.7: Tier-lock guard on redemption
  if (toStatus === 'redeemed') {
    await assertTierAccess(voucherId, memberId);
  }

  const updateValues: Partial<typeof vouchers.$inferInsert> = { status: toStatus };
  if (toStatus === 'redeemed') {
    updateValues.redeemedAt = new Date();
  }

  const [updated] = await db
    .update(vouchers)
    .set(updateValues)
    .where(eq(vouchers.id, voucherId))
    .returning();

  return updated;
}

// List all voucher templates (for ops dropdown)
export async function listTemplates() {
  return db
    .select({
      id: voucherTemplates.id,
      valueType: voucherTemplates.valueType,
      discountValue: voucherTemplates.discountValue,
      isFlash: voucherTemplates.isFlash,
      flashHours: voucherTemplates.flashHours,
      tierRestriction: voucherTemplates.tierRestriction,
      createdAt: voucherTemplates.createdAt,
    })
    .from(voucherTemplates)
    .orderBy(voucherTemplates.createdAt);
}

// Alert Worker helper: issue a gift voucher to a member
export async function issueGiftVoucher(memberId: string): Promise<typeof vouchers.$inferSelect> {
  // Find or create a "gift" voucher template (cashback type, 0 discount, non-flash)
  let [giftTemplate] = await db
    .select()
    .from(voucherTemplates)
    .where(
      and(
        eq(voucherTemplates.valueType, 'cashback'),
        eq(voucherTemplates.isFlash, false)
      )
    )
    .limit(1);

  if (!giftTemplate) {
    [giftTemplate] = await db
      .insert(voucherTemplates)
      .values({
        valueType: 'cashback',
        discountValue: '0.00',
        isFlash: false,
        flashHours: null,
        tierRestriction: null,
      })
      .returning();
  }

  return assignVoucher(giftTemplate.id, memberId);
}
