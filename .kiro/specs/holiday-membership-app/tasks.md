# Implementation Plan: Holiday Membership Application

## Overview

Incremental implementation of the Holiday Membership Application as a modular monolith using Node.js/TypeScript (Express), PostgreSQL with Drizzle ORM, React/TypeScript (Vite) frontend, JWT auth with httpOnly cookie refresh tokens, and a node-cron background worker.

## Tasks

- [x] 1. Project scaffolding and shared infrastructure
  - Initialise monorepo structure: `server/` (Express/TS) and `client/` (Vite/React/TS)
  - Configure TypeScript, ESLint, and path aliases for both workspaces
  - Set up Drizzle ORM with PostgreSQL connection and `drizzle.config.ts`
  - Create `.env.example` with all required environment variables (DATABASE_URL, JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, PORT)
  - Set up `vitest` and `fast-check` in the server workspace
  - _Requirements: 11.1, 11.2_

- [x] 2. Database schema and migrations
  - [x] 2.1 Define Drizzle schema for all tables: `users`, `tiers`, `special_days`, `voucher_templates`, `vouchers`, `packages`, `bookings`, `wishlist`, `worker_logs`
    - Use UUIDs as primary keys throughout
    - Define all enums: `role` (member, operations, admin), `user_status` (active, inactive), `voucher_value_type` (cashback, seasonal, tier_locked, free_night), `voucher_status` (issued, pending, redeemed, expired), `booking_status` (new_request, in_review, confirmed, cancelled)
    - _Requirements: 2.1, 5.1, 5.5, 8.8, 11.1_
  - [x] 2.2 Seed the three default tiers (Silver, Gold, Platinum) with non-null discount multipliers
    - _Requirements: 3.2_
  - [ ]* 2.3 Write unit test: verify three default tiers exist with non-null discount multipliers
    - _Requirements: 3.2_

- [x] 3. Auth module — backend
  - [x] 3.1 Implement `POST /auth/login`: validate credentials, issue short-lived JWT access token + httpOnly cookie refresh token; store bcrypt hash only
    - _Requirements: 1.1, 11.1, 11.2_
  - [x] 3.2 Implement `POST /auth/refresh`: validate refresh token cookie, issue new access token
    - _Requirements: 1.4_
  - [x] 3.3 Implement `POST /auth/logout`: clear refresh token cookie
    - _Requirements: 1.4_
  - [x] 3.4 Implement `requireAuth(roles: Role[])` Express middleware: validate JWT, attach `{ id, role }` to request context; return 401 for invalid/expired token, 403 for wrong role
    - _Requirements: 1.2, 1.3, 1.4, 1.5_
  - [ ]* 3.5 Write property test for Property 1: valid login returns role-scoped token
    - **Property 1: Valid login returns role-scoped token**
    - **Validates: Requirements 1.1**
  - [ ]* 3.6 Write property test for Property 2: unauthorized role access returns 403
    - **Property 2: Unauthorized role access returns 403**
    - **Validates: Requirements 1.2, 1.3**
  - [ ]* 3.7 Write property test for Property 3: invalid or expired token returns 401
    - **Property 3: Invalid or expired token returns 401**
    - **Validates: Requirements 1.5**
  - [ ]* 3.8 Write unit test: verify passwords are stored as bcrypt hashes (never plaintext)
    - _Requirements: 11.1, 11.2_

- [x] 4. Checkpoint — auth baseline
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Membership module — backend
  - [x] 5.1 Implement `POST /members` (Ops): create member with Active status; provision and return temporary credentials; reject duplicate email with 409
    - _Requirements: 2.1, 2.2, 2.5_
  - [x] 5.2 Implement `GET /members/:id` (Ops/Admin) and `GET /members/me` (Member): return tier name, expiry date, account status, and computed `expiring_soon` flag
    - _Requirements: 3.1, 3.3_
  - [x] 5.3 Implement `PATCH /members/:id` (Ops): update membership duration, tier, and status; record `updated_at`
    - _Requirements: 2.3, 2.4_
  - [ ]* 5.4 Write property test for Property 4: member creation round-trip
    - **Property 4: Member creation round-trip**
    - **Validates: Requirements 2.1, 2.2**
  - [ ]* 5.5 Write property test for Property 5: duplicate email rejected
    - **Property 5: Duplicate email rejected**
    - **Validates: Requirements 2.5**
  - [ ]* 5.6 Write property test for Property 6: member update round-trip
    - **Property 6: Member update round-trip**
    - **Validates: Requirements 2.3, 2.4**
  - [ ]* 5.7 Write property test for Property 7: profile response completeness
    - **Property 7: Profile response completeness**
    - **Validates: Requirements 3.1**
  - [ ]* 5.8 Write property test for Property 8: expiry-soon flag correctness
    - **Property 8: Expiry-soon flag correctness**
    - **Validates: Requirements 3.3**

- [x] 6. Special Days — backend
  - [x] 6.1 Implement `GET /members/me/special-days`, `POST /members/me/special-days`, `PATCH /members/me/special-days/:id`, `DELETE /members/me/special-days/:id` (Member)
    - Enforce maximum of 4 Special Days per member; reject 5th with 422
    - _Requirements: 4.1, 4.2, 4.3_
  - [ ]* 6.2 Write property test for Property 9: special days count invariant
    - **Property 9: Special days count invariant**
    - **Validates: Requirements 4.1, 4.3**
  - [ ]* 6.3 Write property test for Property 10: special day addition round-trip
    - **Property 10: Special day addition round-trip**
    - **Validates: Requirements 4.2**

- [x] 7. Voucher module — backend
  - [x] 7.1 Implement `POST /voucher-templates` (Admin): create template with value type, discount value, optional tier restriction, flash flag, and flash_hours
    - _Requirements: 5.1, 5.2_
  - [x] 7.2 Implement `POST /vouchers/assign` (Ops): create voucher instance with status Issued for a single member
    - _Requirements: 5.3_
  - [x] 7.3 Implement `POST /vouchers/bulk-assign` (Ops/Admin): create one Issued voucher instance per member in the specified tier
    - _Requirements: 5.4_
  - [x] 7.4 Implement `GET /vouchers/me` (Member): return all voucher instances grouped by status (Available, Pending, Used, Flash, Expired)
    - _Requirements: 5.8_
  - [x] 7.5 Implement voucher state machine helper: enforce valid transitions (Issued→Pending, Pending→Redeemed, Pending→Issued, Issued→Expired); reject invalid transitions with 422
    - _Requirements: 5.5_
  - [x] 7.6 Implement Flash Voucher expiry: set `expires_at = issued_at + flash_hours` on issuance
    - _Requirements: 5.7_
  - [x] 7.7 Implement Tier-Locked voucher redemption guard: reject redemption if member tier does not match voucher tier restriction with 403
    - _Requirements: 5.9_
  - [ ]* 7.8 Write property test for Property 14: voucher template creation round-trip
    - **Property 14: Voucher template creation round-trip**
    - **Validates: Requirements 5.2**
  - [ ]* 7.9 Write property test for Property 15: voucher assignment creates Issued instance
    - **Property 15: Voucher assignment creates Issued instance**
    - **Validates: Requirements 5.3**
  - [ ]* 7.10 Write property test for Property 16: bulk assignment count invariant
    - **Property 16: Bulk assignment count invariant**
    - **Validates: Requirements 5.4**
  - [ ]* 7.11 Write property test for Property 17: voucher lifecycle state machine
    - **Property 17: Voucher lifecycle state machine**
    - **Validates: Requirements 5.5, 8.3, 8.5, 8.6**
  - [ ]* 7.12 Write property test for Property 19: flash voucher expiry calculation
    - **Property 19: Flash voucher expiry calculation**
    - **Validates: Requirements 5.7**
  - [ ]* 7.13 Write property test for Property 20: wallet groups vouchers by status
    - **Property 20: Wallet groups vouchers by status**
    - **Validates: Requirements 5.8**
  - [ ]* 7.14 Write property test for Property 21: tier-locked voucher redemption restriction
    - **Property 21: Tier-locked voucher redemption restriction**
    - **Validates: Requirements 5.9**
  - [ ]* 7.15 Write unit test: verify all four voucher value types can be created
    - _Requirements: 5.1_

- [x] 8. Checkpoint — core domain
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Package module — backend
  - [x] 9.1 Implement `GET /packages` (Member/Ops): search with optional filters (location, category, price); return featured packages first, then non-featured
    - _Requirements: 6.1, 6.2, 6.3_
  - [x] 9.2 Implement `POST /packages` (Admin): create package with title, location, category, price, and featured flag
    - _Requirements: 6.1_
  - [x] 9.3 Implement `PATCH /packages/:id` (Admin): update package fields including featured flag; pin/unpin from top of listings
    - _Requirements: 6.4, 6.5_
  - [ ]* 9.4 Write property test for Property 22: search filter correctness
    - **Property 22: Search filter correctness**
    - **Validates: Requirements 6.2**
  - [ ]* 9.5 Write property test for Property 23: featured packages ordering invariant
    - **Property 23: Featured packages ordering invariant**
    - **Validates: Requirements 6.3, 6.4, 6.5**

- [x] 10. Wishlist module — backend
  - [x] 10.1 Implement `POST /wishlist/:packageId` (Member): add package to wishlist; return `already_saved: true` without duplicate if already present
    - _Requirements: 7.1, 7.4_
  - [x] 10.2 Implement `DELETE /wishlist/:packageId` (Member): remove package from wishlist
    - _Requirements: 7.2_
  - [x] 10.3 Implement `GET /wishlist` (Member): return all saved packages for the member
    - _Requirements: 7.3_
  - [ ]* 10.4 Write property test for Property 24: wishlist add and remove round-trip
    - **Property 24: Wishlist add and remove round-trip**
    - **Validates: Requirements 7.1, 7.2, 7.3**
  - [ ]* 10.5 Write property test for Property 25: wishlist add idempotence
    - **Property 25: Wishlist add idempotence**
    - **Validates: Requirements 7.4**

- [x] 11. Booking module — backend
  - [x] 11.1 Implement `POST /bookings` (Member): create booking with status New Request; validate voucher is Issued and belongs to member if applied; transition voucher to Pending
    - _Requirements: 8.1, 8.2, 8.3_
  - [x] 11.2 Implement `GET /bookings/me` (Member): return booking history with package details, voucher applied, and current status
    - _Requirements: 8.7_
  - [x] 11.3 Implement `PATCH /bookings/:id/status` (Ops): enforce state machine (New Request→In Review→Confirmed/Cancelled); on Confirmed transition voucher to Redeemed; on Cancelled revert voucher to Issued; record `updated_at`
    - _Requirements: 8.4, 8.5, 8.6, 8.8_
  - [ ]* 11.4 Write property test for Property 27: booking creation round-trip
    - **Property 27: Booking creation round-trip**
    - **Validates: Requirements 8.1, 8.7**
  - [ ]* 11.5 Write property test for Property 28: voucher validation on booking
    - **Property 28: Voucher validation on booking**
    - **Validates: Requirements 8.2**
  - [ ]* 11.6 Write property test for Property 29: booking status update round-trip
    - **Property 29: Booking status update round-trip**
    - **Validates: Requirements 8.4**
  - [ ]* 11.7 Write property test for Property 30: booking state machine
    - **Property 30: Booking state machine**
    - **Validates: Requirements 8.8**

- [x] 12. Checkpoint — booking and voucher integration
  - Ensure all tests pass, ask the user if questions arise.

- [x] 13. Alert Worker
  - [x] 13.1 Implement the `node-cron` worker scheduled at `0 2 * * *`: Special Day Scan queries members with a Special Day in the next 30 days and calls the Voucher service to issue a Gift Voucher if not already issued this cycle; Expiry Scan is computed on read (no separate flag update needed)
    - _Requirements: 4.4, 4.5, 3.4_
  - [x] 13.2 Implement worker error handling: catch all exceptions, write `{ timestamp, error, cycle }` to `worker_logs` table, schedule retry via `setTimeout` after 5 minutes; worker failures must not crash the main server process
    - _Requirements: 11.3, 11.4_
  - [ ]* 13.3 Write property test for Property 11: worker issues gift voucher for upcoming special days
    - **Property 11: Worker issues gift voucher for upcoming special days**
    - **Validates: Requirements 4.5**
  - [ ]* 13.4 Write property test for Property 18: expired voucher status update
    - **Property 18: Expired voucher status update**
    - **Validates: Requirements 5.6**
  - [ ]* 13.5 Write unit test: simulate worker failure and verify log entry written to `worker_logs` with timestamp
    - _Requirements: 11.4_

- [x] 14. Dashboard module — backend
  - [x] 14.1 Implement `GET /dashboard/lookahead` (Ops): query members with a Special Day in the next 30 days, sorted by date ascending; return name, Special Day label, date, and days remaining
    - _Requirements: 9.1, 9.2, 9.3_
  - [x] 14.2 Implement `GET /dashboard/bi` (Admin): return confirmed booking counts by month and year, members expiring within 60 days sorted by expiry date, top 10 most wishlisted packages, and voucher redemption rates by value type; all within 2 seconds
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_
  - [ ]* 14.3 Write property test for Property 12: worker populates lookahead dashboard
    - **Property 12: Worker populates lookahead dashboard**
    - **Validates: Requirements 4.6, 9.1**
  - [ ]* 14.4 Write property test for Property 13: lookahead response shape completeness
    - **Property 13: Lookahead response shape completeness**
    - **Validates: Requirements 9.2**
  - [ ]* 14.5 Write property test for Property 26: wishlist count aggregation
    - **Property 26: Wishlist count aggregation**
    - **Validates: Requirements 7.5, 10.3**
  - [ ]* 14.6 Write property test for Property 31: BI booking count aggregation
    - **Property 31: BI booking count aggregation**
    - **Validates: Requirements 10.1**
  - [ ]* 14.7 Write property test for Property 32: voucher redemption rate calculation
    - **Property 32: Voucher redemption rate calculation**
    - **Validates: Requirements 10.4**

- [x] 15. Checkpoint — backend complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 16. React frontend — auth and routing
  - [x] 16.1 Set up React Router with protected routes gated by role; implement login page that calls `POST /auth/login`, stores access token in memory, and handles refresh via `POST /auth/refresh`
    - _Requirements: 1.1, 1.2, 1.3_
  - [x] 16.2 Implement axios/fetch interceptor that attaches the access token to every request and transparently refreshes on 401 `token_expired` responses
    - _Requirements: 1.4, 1.5_

- [x] 17. React frontend — Member views
  - [x] 17.1 Implement Member profile page: display tier name, expiry date, account status, and "Expiring Soon" badge when flagged
    - _Requirements: 3.1, 3.3_
  - [x] 17.2 Implement Special Days management UI: list, add, edit, delete; enforce 4-entry limit with inline error
    - _Requirements: 4.1, 4.2, 4.3_
  - [x] 17.3 Implement Voucher Wallet page: display vouchers grouped by status tabs (Available, Pending, Used, Flash, Expired)
    - _Requirements: 5.8_
  - [x] 17.4 Implement Package search/browse page: search bar with location, category, price filters; featured packages pinned at top
    - _Requirements: 6.1, 6.2, 6.3_
  - [x] 17.5 Implement Wishlist page: add/remove packages; show "Already saved" feedback on duplicate add
    - _Requirements: 7.1, 7.2, 7.3, 7.4_
  - [x] 17.6 Implement Booking request form: select package, optionally apply voucher from wallet; submit booking; display booking history with status and voucher applied
    - _Requirements: 8.1, 8.2, 8.7_

- [x] 18. React frontend — Operations views
  - [x] 18.1 Implement Member onboarding form: create member with email, name, tier, expiry date; display provisioned credentials on success
    - _Requirements: 2.1, 2.2_
  - [x] 18.2 Implement Member management view: search/view member profiles, edit tier, duration, and status
    - _Requirements: 2.3, 2.4_
  - [x] 18.3 Implement Voucher assignment UI: assign a voucher template to a single member or bulk-assign to a tier
    - _Requirements: 5.3, 5.4_
  - [x] 18.4 Implement Booking management view: list all bookings, update status through the state machine (New Request → In Review → Confirmed/Cancelled)
    - _Requirements: 8.4, 8.8_
  - [x] 18.5 Implement Lookahead Dashboard page: table of members with Special Days in the next 30 days, sorted by date, showing name, label, date, and days remaining
    - _Requirements: 9.1, 9.2_

- [ ] 19. React frontend — Admin views
  - [x] 19.1 Implement voucher template management UI: create templates with value type, discount, tier restriction, flash settings
    - _Requirements: 5.1, 5.2_
  - [x] 19.2 Implement Package management UI: create and edit packages, toggle featured flag
    - _Requirements: 6.1, 6.4, 6.5_
  - [x] 19.3 Implement BI Dashboard page: confirmed booking counts by month/year, members expiring within 60 days, top 10 wishlisted packages, voucher redemption rates by type
    - _Requirements: 10.1, 10.2, 10.3, 10.4_

- [ ] 20. Final checkpoint — full integration
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Property tests use `fast-check` with `{ numRuns: 100 }` and must include the tag comment: `Feature: holiday-membership-app, Property {N}: {title}`
- The Alert Worker runs in the same server process; worker failures must not crash the main process
- All state machines (booking, voucher) are enforced server-side; the frontend reflects state but does not enforce it
