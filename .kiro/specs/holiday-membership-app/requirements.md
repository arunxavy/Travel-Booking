# Requirements Document

## Introduction

The Holiday Membership Application is a private, high-engagement platform for managing exclusive memberships, vouchers, and luxury travel bookings. The system serves three roles — Members, Operations staff, and Admins — and is designed to evolve from a manual administrative tool into an automated marketing engine focused on user retention and high-margin package conversions.

The platform supports a full lifecycle: member onboarding, tier-based access, voucher issuance and redemption, tour package discovery, booking management, and anniversary-triggered marketing automation.

## Glossary

- **System**: The Holiday Membership Application as a whole.
- **Auth_Service**: The component responsible for authentication, session management, and RBAC enforcement.
- **Member**: A registered end-user with a private login, assigned a membership tier.
- **Operations**: Staff users responsible for onboarding, voucher management, and booking fulfillment.
- **Admin**: Management users with full system control, including configuration and business intelligence.
- **Membership_Service**: The component managing membership profiles, tiers, and expiry logic.
- **Tier**: A membership level (e.g., Silver, Gold, Platinum) that determines benefits and access.
- **Voucher_Service**: The component managing voucher templates, issuance, lifecycle, and redemption.
- **Flash_Voucher**: A voucher with a short-term expiry window designed to create urgency.
- **Booking_Service**: The component managing booking requests and state transitions.
- **Package_Service**: The component managing tour package inventory, search, and featured listings.
- **Wishlist_Service**: The component tracking packages saved by Members.
- **Special_Day**: A user-defined date (e.g., birthday, anniversary) used as a marketing trigger.
- **Alert_Worker**: A background process that runs every 24 hours to evaluate upcoming Special Days and membership expiries.
- **BI_Dashboard**: The Admin-facing business intelligence dashboard.
- **Lookahead_Dashboard**: The Operations-facing dashboard showing members with Special Days within the next 30 days.

---

## Requirements

### Requirement 1: Role-Based Authentication & Access Control

**User Story:** As a platform operator, I want strict role-based access control, so that Members, Operations, and Admin users can only access features appropriate to their role.

#### Acceptance Criteria

1. WHEN a user submits valid credentials, THE Auth_Service SHALL authenticate the user and establish a session scoped to their assigned role (Member, Operations, or Admin).
2. WHEN a user attempts to access a resource outside their role's permissions, THE Auth_Service SHALL deny the request and return an HTTP 403 response.
3. THE Auth_Service SHALL enforce distinct permission boundaries such that a Member cannot access Operations or Admin endpoints, and an Operations user cannot access Admin-only endpoints.
4. WHILE a user session is active, THE Auth_Service SHALL validate the session token on every protected request.
5. IF a session token is expired or invalid, THEN THE Auth_Service SHALL reject the request and return an HTTP 401 response.
6. THE System SHALL be designed with a modular authentication architecture to support future addition of public sign-up flows and OAuth social login providers without rewriting core access control logic.

---

### Requirement 2: Member Account Management

**User Story:** As an Operations user, I want to manually create and manage Member accounts, so that new members can be onboarded and their profiles kept up to date.

#### Acceptance Criteria

1. WHEN an Operations user submits a new member's details (email, name, assigned Tier, membership expiry date), THE Membership_Service SHALL create a new Member account with a status of Active.
2. WHEN a new Member account is created, THE System SHALL provision login credentials and make them available to the Operations user for delivery to the Member.
3. WHEN an Operations user submits updated membership metadata for an existing Member, THE Membership_Service SHALL apply the changes and record the modification timestamp.
4. THE Membership_Service SHALL allow Operations users to update a Member's membership duration, Tier assignment, and account status.
5. IF an Operations user attempts to create a Member account with an email address already registered in the System, THEN THE Membership_Service SHALL reject the request and return a descriptive error message.

---

### Requirement 3: Membership Profile & Tier Display

**User Story:** As a Member, I want to view my membership profile and tier details, so that I understand my current benefits and membership status.

#### Acceptance Criteria

1. WHEN a Member accesses their profile, THE Membership_Service SHALL return the Member's current Tier name, membership expiry date, and account status.
2. THE System SHALL support at least three Tier levels (Silver, Gold, Platinum), each with a configurable discount multiplier.
3. WHEN a Member's membership expiry date is within 60 days of the current date, THE Membership_Service SHALL flag the membership as "Expiring Soon."
4. THE Alert_Worker SHALL generate a list of all memberships flagged as "Expiring Soon" every 24 hours and make it available to the BI_Dashboard.

---

### Requirement 4: Special Days Management

**User Story:** As a Member, I want to record up to 4 personal Special Days, so that the platform can deliver timely, personalized offers around my important dates.

#### Acceptance Criteria

1. THE Membership_Service SHALL allow a Member to add, edit, or delete Special Days up to a maximum of 4 entries per Member account.
2. WHEN a Member submits a new Special Day with a label and date, THE Membership_Service SHALL store the entry and associate it with the Member's account.
3. IF a Member attempts to add a fifth Special Day when 4 already exist, THEN THE Membership_Service SHALL reject the request and return an error indicating the maximum limit has been reached.
4. THE Alert_Worker SHALL evaluate all stored Special Days every 24 hours and identify Members whose Special Day falls within the next 30 days.
5. WHEN the Alert_Worker identifies a Member with a Special Day within 30 days, THE Voucher_Service SHALL automatically issue a Gift Voucher to that Member's wallet.
6. WHEN the Alert_Worker identifies a Member with a Special Day within 30 days, THE Lookahead_Dashboard SHALL display that Member's details as a prioritized alert for Operations staff.

---

### Requirement 5: Voucher System

**User Story:** As an Admin, I want to create voucher templates and issue vouchers to members, so that I can run targeted promotions and reward loyalty.

#### Acceptance Criteria

1. THE Voucher_Service SHALL support the following voucher value types: Cashback, Seasonal, Tier-Locked, and Free-Night.
2. WHEN an Admin creates a new voucher template, THE Voucher_Service SHALL store the template with its value type, discount value, and any Tier restrictions.
3. WHEN an Operations user assigns a voucher to a Member account, THE Voucher_Service SHALL create a voucher instance with a status of Issued and associate it with that Member.
4. THE Voucher_Service SHALL support bulk assignment of a voucher template to all Members belonging to a specified Tier.
5. THE Voucher_Service SHALL track each voucher instance through the following lifecycle states: Issued → Pending → Redeemed or Expired.
6. WHEN a voucher's expiry date passes and its status is not Redeemed, THE Voucher_Service SHALL update the voucher status to Expired.
7. WHERE a voucher is designated as a Flash_Voucher, THE Voucher_Service SHALL enforce a configurable short-term expiry window (in hours) from the time of issuance.
8. WHEN a Member views their Voucher Wallet, THE Voucher_Service SHALL return all voucher instances associated with that Member, grouped by status (Available, Pending, Used, Flash, Expired).
9. WHERE a voucher is Tier-Locked, THE Voucher_Service SHALL only permit redemption by Members whose current Tier matches the voucher's Tier restriction.

---

### Requirement 6: Tour Package Inventory & Discovery

**User Story:** As a Member, I want to search and browse tour packages, so that I can discover travel options that match my interests.

#### Acceptance Criteria

1. THE Package_Service SHALL maintain a searchable inventory of tour packages, each with a title, location, category, price point, and featured status.
2. WHEN a Member submits a search query with one or more filters (location, category, price point), THE Package_Service SHALL return matching packages within 2 seconds.
3. THE Package_Service SHALL return featured packages (IsFeatured = true) at the top of all search and browse results, ordered before non-featured packages.
4. WHEN an Admin sets a package's featured status to true, THE Package_Service SHALL pin that package to the top of Member-facing listings.
5. WHEN an Admin sets a package's featured status to false, THE Package_Service SHALL remove the package from the pinned position and return it to standard ordering.

---

### Requirement 7: Wishlist

**User Story:** As a Member, I want to save tour packages to a wishlist, so that I can revisit packages I'm interested in and use them when making a booking.

#### Acceptance Criteria

1. WHEN a Member adds a package to their wishlist, THE Wishlist_Service SHALL store the association between the Member and the Package.
2. WHEN a Member removes a package from their wishlist, THE Wishlist_Service SHALL delete the association.
3. WHEN a Member views their wishlist, THE Wishlist_Service SHALL return all packages currently saved by that Member.
4. IF a Member attempts to add a package that is already in their wishlist, THEN THE Wishlist_Service SHALL return a response indicating the package is already saved, without creating a duplicate entry.
5. THE BI_Dashboard SHALL display an aggregated count of wishlist saves per package, allowing Admins to identify high-demand packages.

---

### Requirement 8: Booking Request Workflow

**User Story:** As a Member, I want to submit booking requests for tour packages, so that Operations can review and confirm my travel arrangements.

#### Acceptance Criteria

1. WHEN a Member submits a booking request for a package, THE Booking_Service SHALL create a booking record with a status of New Request and associate it with the Member's account and the selected Package.
2. WHERE a Member applies a voucher to a booking request, THE Booking_Service SHALL validate the voucher is in Issued status and belongs to the requesting Member before applying it.
3. WHEN a voucher is applied to a booking, THE Voucher_Service SHALL update the voucher status to Pending.
4. WHEN an Operations user updates a booking status to Confirmed or Cancelled, THE Booking_Service SHALL record the status change and the timestamp of the update.
5. WHEN a booking is Confirmed and a voucher was applied, THE Voucher_Service SHALL update the associated voucher status to Redeemed.
6. WHEN a booking is Cancelled and a voucher was applied, THE Voucher_Service SHALL revert the associated voucher status to Issued.
7. WHEN a Member views their booking history, THE Booking_Service SHALL return all bookings associated with that Member, including package details, voucher applied (if any), and current status.
8. THE Booking_Service SHALL support the following state transitions only: New Request → In Review → Confirmed, and New Request → In Review → Cancelled.

---

### Requirement 9: Operations Lookahead Dashboard

**User Story:** As an Operations user, I want a 30-day anniversary lookahead dashboard, so that I can proactively reach out to members before their Special Days.

#### Acceptance Criteria

1. WHEN an Operations user accesses the Lookahead_Dashboard, THE System SHALL display all Members with a Special Day occurring within the next 30 days, sorted by date ascending.
2. THE Lookahead_Dashboard SHALL display each entry with the Member's name, the Special Day label, the date of the Special Day, and the number of days remaining.
3. WHEN the Alert_Worker runs its daily evaluation, THE Lookahead_Dashboard data SHALL be refreshed to reflect the current 30-day window.

---

### Requirement 10: Admin Business Intelligence Dashboard

**User Story:** As an Admin, I want a business intelligence dashboard, so that I can monitor revenue, retention, and engagement metrics to make informed business decisions.

#### Acceptance Criteria

1. WHEN an Admin accesses the BI_Dashboard, THE System SHALL display total confirmed booking counts summarized by month and by year.
2. THE BI_Dashboard SHALL display a list of all Members whose membership expiry date falls within the next 60 days, sorted by expiry date ascending.
3. THE BI_Dashboard SHALL display the top 10 most wishlisted packages, ranked by total wishlist save count in descending order.
4. THE BI_Dashboard SHALL display voucher redemption rates, calculated as the percentage of Issued vouchers that have reached Redeemed status, grouped by voucher value type.
5. WHEN an Admin accesses the BI_Dashboard, THE System SHALL return all dashboard data within 2 seconds.

---

### Requirement 11: System Reliability & Security

**User Story:** As a platform operator, I want the system to be reliable and secure, so that member data is protected and automated processes run consistently.

#### Acceptance Criteria

1. THE System SHALL encrypt all sensitive user data (passwords, personal details) at rest using an industry-standard encryption algorithm.
2. THE Auth_Service SHALL use secure, time-limited session tokens and SHALL NOT store plaintext passwords.
3. THE Alert_Worker SHALL execute its evaluation cycle every 24 hours with a tolerance of ±5 minutes.
4. IF the Alert_Worker fails during an evaluation cycle, THEN THE System SHALL log the failure with a timestamp and retry the cycle within 5 minutes.
5. THE System SHALL be structured with modular service boundaries to allow a Payment Gateway to be integrated in a future phase without modifying existing Booking_Service or Voucher_Service core logic.
