import React from 'react';
import { Link, useLocation, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Dashboard.css';

const AdminLayout = () => {
  const { currentUser, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path) => {
    return location.pathname.includes(path) ? 'active' : '';
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <div className="admin-layout">
      <div className="admin-sidebar">
        <div className="admin-logo">
          <h2>RBAC<span>Admin</span></h2>
        </div>
        <div className="admin-user-info">
          <div className="user-avatar">
            <i className="fas fa-user-circle"></i>
          </div>
          <div className="user-details">
            <span className="user-name">{currentUser?.name}</span>
            <span className="user-role">Administrator</span>
          </div>
        </div>
        <nav className="admin-nav">
          <Link to="/admin/dashboard" className={`nav-item ${isActive('/admin/dashboard')}`}>
            <i className="fas fa-tachometer-alt"></i> Dashboard
          </Link>
          <Link to="/admin/posts" className={`nav-item ${isActive('/admin/posts')}`}>
            <i className="fas fa-edit"></i> Create Post
          </Link>
          <Link to="/admin/users" className={`nav-item ${isActive('/admin/users')}`}>
            <i className="fas fa-users"></i> Manage Users
          </Link>
          <Link to="/" className="nav-item">
            <i className="fas fa-eye"></i> View Blog
          </Link>
        </nav>
        <div className="admin-logout">
          <button className="logout-btn" onClick={handleLogout}>
            <i className="fas fa-sign-out-alt"></i> Logout
          </button>
        </div>
      </div>
      <main className="admin-content">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
