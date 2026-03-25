import React from 'react';
import { NavLink, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import OnboardMemberPage from '../pages/ops/OnboardMemberPage';
import MemberManagementPage from '../pages/ops/MemberManagementPage';
import VoucherAssignPage from '../pages/ops/VoucherAssignPage';
import BookingManagementPage from '../pages/ops/BookingManagementPage';
import LookaheadPage from '../pages/ops/LookaheadPage';

import WishlistDashboardPage from '../pages/ops/WishlistDashboardPage';

const navItems = [
  { to: '/ops/onboard', label: 'Onboard Member' },
  { to: '/ops/members', label: 'Members' },
  { to: '/ops/vouchers', label: 'Vouchers' },
  { to: '/ops/bookings', label: 'Bookings' },
  { to: '/ops/lookahead', label: 'Lookahead' },
  { to: '/ops/wishlist', label: 'Wishlist' },
];

export default function OpsLayout() {
  const { user, logout } = useAuth();

  return (
    <div className="page-wrapper">
      <nav className="navbar">
        <span className="navbar-brand">
          DNA<span className="brand-dot">.</span>Holidays
        </span>
        <span className="navbar-portal-label">Operations</span>
        <div className="navbar-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            >
              {item.label}
            </NavLink>
          ))}
        </div>
        <div className="navbar-user">
          <span className="navbar-user-info">{user?.email}</span>
          <button className="btn btn-ghost btn-sm" onClick={logout}>Logout</button>
        </div>
      </nav>
      <main className="page-content">
        <Routes>
          <Route path="onboard" element={<OnboardMemberPage />} />
          <Route path="members" element={<MemberManagementPage />} />
          <Route path="vouchers" element={<VoucherAssignPage />} />
          <Route path="bookings" element={<BookingManagementPage />} />
          <Route path="lookahead" element={<LookaheadPage />} />
          <Route path="wishlist" element={<WishlistDashboardPage />} />
          <Route index element={<Navigate to="lookahead" replace />} />
        </Routes>
      </main>
    </div>
  );
}
