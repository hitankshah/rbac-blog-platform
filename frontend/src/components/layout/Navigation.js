import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext'; // Updated import

const Navigation = () => {
  // Use the useAuth hook instead of useContext(AuthContext)
  const { currentUser, logout, isAdmin } = useAuth();

  return (
    <nav className="main-nav">
      <div className="nav-container">
        <Link to="/" className="nav-logo">RBAC Blog</Link>
        
        <ul className="nav-links">
          <li><Link to="/blog">Blog</Link></li>
          
          {currentUser ? (
            <>
              {isAdmin && (
                <li className="dropdown">
                  <span className="dropdown-toggle">Admin</span>
                  <div className="dropdown-menu">
                    <Link to="/admin/dashboard">Dashboard</Link>
                    <Link to="/admin/posts">Manage Posts</Link>
                    <Link to="/admin/users">Manage Users</Link>
                  </div>
                </li>
              )}
              
              <li className="dropdown">
                <span className="dropdown-toggle">
                  {currentUser.name || 'Account'}
                </span>
                <div className="dropdown-menu">
                  <Link to="/profile">My Profile</Link>
                  <button onClick={logout} className="logout-button">
                    Logout
                  </button>
                </div>
              </li>
            </>
          ) : (
            <>
              <li><Link to="/login">Login</Link></li>
              <li><Link to="/register">Register</Link></li>
            </>
          )}
        </ul>
      </div>
    </nav>
  );
};

export default Navigation;
