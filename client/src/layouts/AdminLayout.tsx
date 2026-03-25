import React from 'react';
import { NavLink, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import VoucherTemplatePage from '../pages/admin/VoucherTemplatePage';
import PackageManagementPage from '../pages/admin/PackageManagementPage';
import BIDashboardPage from '../pages/admin/BIDashboardPage';

import OpsUsersPage from '../pages/admin/OpsUsersPage';

const navItems = [
  { to: '/admin/voucher-templates', label: 'Voucher Templates' },
  { to: '/admin/packages', label: 'Packages' },
  { to: '/admin/ops-users', label: 'Ops Users' },
  { to: '/admin/bi', label: 'BI Dashboard' },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();

  return (
    <div className="page-wrapper">
      <nav className="navbar">
        <span className="navbar-brand">
          DNA<span className="brand-dot">.</span>Holidays
        </span>
        <span className="navbar-portal-label">Admin</span>
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
          <Route path="voucher-templates" element={<VoucherTemplatePage />} />
          <Route path="packages" element={<PackageManagementPage />} />
          <Route path="ops-users" element={<OpsUsersPage />} />
          <Route path="bi" element={<BIDashboardPage />} />
          <Route index element={<Navigate to="bi" replace />} />
        </Routes>
      </main>
    </div>
  );
}
