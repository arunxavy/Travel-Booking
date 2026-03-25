import React from 'react';
import { Link } from 'react-router-dom';

export default function UnauthorizedPage() {
  return (
    <div className="unauth-page">
      <div className="unauth-card">
        <div className="unauth-icon">🔒</div>
        <h2 style={{ marginBottom: '0.5rem' }}>Access Denied</h2>
        <p className="text-muted" style={{ marginBottom: '1.5rem' }}>
          You don't have permission to view this page.
        </p>
        <Link to="/login" className="btn btn-primary">Back to Login</Link>
      </div>
    </div>
  );
}
