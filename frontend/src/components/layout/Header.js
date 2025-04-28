import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Header.css';

const Header = () => {
  const { currentUser, logout, isAdmin } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <header className="header">
      <div className="container">
        <div className="header-content">
          <div className="logo">
            <Link to="/">
              <h1>RBAC<span>Blog</span></h1>
            </Link>
          </div>
          
          <button className="mobile-menu-btn" onClick={() => setMenuOpen(!menuOpen)}>
            <i className={menuOpen ? "fas fa-times" : "fas fa-bars"}></i>
          </button>
          
          <nav className={`main-nav ${menuOpen ? 'active' : ''}`}>
            <ul>
              <li>
                <Link to="/" onClick={() => setMenuOpen(false)}>Home</Link>
              </li>
              <li>
                <Link to="/blog" onClick={() => setMenuOpen(false)}>Blog</Link>
              </li>
              <li>
                <Link to="/about" onClick={() => setMenuOpen(false)}>About</Link>
              </li>
              <li>
                <Link to="/contact" onClick={() => setMenuOpen(false)}>Contact</Link>
              </li>
            </ul>
          </nav>
          
          <div className="auth-section">
            {currentUser ? (
              <div className="user-menu">
                <div className="user-info">
                  <span className="welcome">Welcome, </span>
                  <span className="username">{currentUser.name}</span>
                  {isAdmin && <span className="role-badge admin">Admin</span>}
                </div>
                <div className="user-actions">
                  {/* Added visible logout button */}
                  <button onClick={handleLogout} className="btn btn-logout">
                    <i className="fas fa-sign-out-alt"></i> Logout
                  </button>
                  
                  <div className="dropdown">
                    <button className="dropdown-toggle">
                      <i className="fas fa-user-circle"></i>
                    </button>
                    <div className="dropdown-menu">
                      <Link to="/profile">My Profile</Link>
                      {isAdmin && (
                        <Link to="/admin/dashboard">Admin Dashboard</Link>
                      )}
                      {/* Added duplicate logout option in dropdown for consistency */}
                      <button onClick={handleLogout}>Logout</button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="auth-buttons">
                <Link to="/login" className="btn btn-login">Login</Link>
                <Link to="/register" className="btn btn-register">Register</Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
