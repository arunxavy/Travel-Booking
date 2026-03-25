import {
  pgTable,
  pgEnum,
  uuid,
  text,
  varchar,
  decimal,
  boolean,
  integer,
  date,
  timestamp,
} from 'drizzle-orm/pg-core';

// Enums
export const roleEnum = pgEnum('role', ['member', 'operations', 'admin']);
export const userStatusEnum = pgEnum('user_status', ['active', 'inactive']);
export const voucherValueTypeEnum = pgEnum('voucher_value_type', [
  'cashback',
  'seasonal',
  'tier_locked',
  'free_night',
  'fixed_amount',
]);
export const voucherStatusEnum = pgEnum('voucher_status', [
  'issued',
  'pending',
  'redeemed',
  'expired',
]);
export const bookingStatusEnum = pgEnum('booking_status', [
  'new_request',
  'in_review',
  'confirmed',
  'cancelled',
]);

// Tables

export const tiers = pgTable('tiers', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull(),
  discountMultiplier: decimal('discount_multiplier', { precision: 5, scale: 4 }).notNull(),
});

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 30 }),
  role: roleEnum('role').notNull().default('member'),
  tierId: uuid('tier_id').references(() => tiers.id),
  membershipExpiry: date('membership_expiry'),
  status: userStatusEnum('status').notNull().default('active'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const specialDays = pgTable('special_days', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  label: varchar('label', { length: 255 }).notNull(),
  eventDate: date('event_date').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const voucherTemplates = pgTable('voucher_templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  valueType: voucherValueTypeEnum('value_type').notNull(),
  discountValue: decimal('discount_value', { precision: 10, scale: 2 }).notNull(),
  tierRestriction: uuid('tier_restriction').references(() => tiers.id),
  isFlash: boolean('is_flash').notNull().default(false),
  flashHours: integer('flash_hours'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const vouchers = pgTable('vouchers', {
  id: uuid('id').primaryKey().defaultRandom(),
  templateId: uuid('template_id')
    .notNull()
    .references(() => voucherTemplates.id),
  memberId: uuid('member_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  status: voucherStatusEnum('status').notNull().default('issued'),
  issuedAt: timestamp('issued_at').notNull().defaultNow(),
  expiresAt: timestamp('expires_at'),
  redeemedAt: timestamp('redeemed_at'),
});

export const packages = pgTable('packages', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: varchar('title', { length: 255 }).notNull(),
  location: varchar('location', { length: 255 }).notNull(),
  category: varchar('category', { length: 100 }).notNull(),
  price: decimal('price', { precision: 10, scale: 2 }).notNull(),
  numberOfDays: integer('number_of_days'),
  itinerary: text('itinerary'),
  included: text('included'),
  excluded: text('excluded'),
  isFeatured: boolean('is_featured').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const bookings = pgTable('bookings', {
  id: uuid('id').primaryKey().defaultRandom(),
  memberId: uuid('member_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  packageId: uuid('package_id')
    .notNull()
    .references(() => packages.id),
  voucherId: uuid('voucher_id').references(() => vouchers.id),
  status: bookingStatusEnum('status').notNull().default('new_request'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const customBookings = pgTable('custom_bookings', {
  id: uuid('id').primaryKey().defaultRandom(),
  memberId: uuid('member_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  destination: varchar('destination', { length: 255 }).notNull(),
  hotelName: varchar('hotel_name', { length: 255 }),
  googleLink: text('google_link'),
  checkIn: date('check_in').notNull(),
  checkOut: date('check_out').notNull(),
  adults: integer('adults').notNull().default(1),
  kids: integer('kids').notNull().default(0),
  kidAges: text('kid_ages'),           // JSON array stored as text e.g. "[5,8]"
  voucherId: uuid('voucher_id').references(() => vouchers.id),
  status: bookingStatusEnum('status').notNull().default('new_request'),
  notes: text('notes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const bookingComments = pgTable('booking_comments', {
  id: uuid('id').primaryKey().defaultRandom(),
  bookingId: uuid('booking_id').notNull(),   // references either bookings.id or custom_bookings.id
  bookingType: varchar('booking_type', { length: 20 }).notNull(), // 'package' | 'custom'
  authorId: uuid('author_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  authorRole: varchar('author_role', { length: 20 }).notNull(), // 'member' | 'operations' | 'admin'
  message: text('message').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const wishlist = pgTable('wishlist', {
  id: uuid('id').primaryKey().defaultRandom(),
  memberId: uuid('member_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  packageId: uuid('package_id')
    .notNull()
    .references(() => packages.id, { onDelete: 'cascade' }),
  savedAt: timestamp('saved_at').notNull().defaultNow(),
});

export const workerLogs = pgTable('worker_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  timestamp: timestamp('timestamp').notNull().defaultNow(),
  error: text('error').notNull(),
  cycle: text('cycle').notNull(),
});
