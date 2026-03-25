import React from 'react';
import { NavLink, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ProfilePage from '../pages/member/ProfilePage';
import SpecialDaysPage from '../pages/member/SpecialDaysPage';
import VoucherWalletPage from '../pages/member/VoucherWalletPage';
import PackagesPage from '../pages/member/PackagesPage';
import WishlistPage from '../pages/member/WishlistPage';
import BookingsPage from '../pages/member/BookingsPage';

const navItems = [
  { to: '/member/profile', label: 'Profile' },
  { to: '/member/special-days', label: 'Special Days' },
  { to: '/member/vouchers', label: 'Vouchers' },
  { to: '/member/packages', label: 'Packages' },
  { to: '/member/wishlist', label: 'Wishlist' },
  { to: '/member/bookings', label: 'Bookings' },
];

export default function MemberLayout() {
  const { user, logout } = useAuth();

  return (
    <div className="page-wrapper">
      <nav className="navbar">
        <span className="navbar-brand">
          DNA<span className="brand-dot">.</span>Holidays
        </span>
        <span className="navbar-portal-label">Member</span>
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
          <Route path="profile" element={<ProfilePage />} />
          <Route path="special-days" element={<SpecialDaysPage />} />
          <Route path="vouchers" element={<VoucherWalletPage />} />
          <Route path="packages" element={<PackagesPage />} />
          <Route path="wishlist" element={<WishlistPage />} />
          <Route path="bookings" element={<BookingsPage />} />
          <Route index element={<Navigate to="profile" replace />} />
        </Routes>
      </main>
    </div>
  );
}
