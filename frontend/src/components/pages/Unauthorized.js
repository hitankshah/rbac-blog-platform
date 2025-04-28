import React from 'react';
import { Link } from 'react-router-dom';

const Unauthorized = () => {
  return (
    <div className="unauthorized-container">
      <div className="unauthorized-content">
        <h1>Access Denied</h1>
        <div className="unauthorized-icon">
          <span>🔒</span>
        </div>
        <p>You don't have permission to access this page.</p>
        <p>Please contact an administrator if you believe this is an error.</p>
        <div className="unauthorized-actions">
          <Link to="/" className="btn-primary">Return to Home</Link>
        </div>
      </div>
    </div>
  );
};

export default Unauthorized;
