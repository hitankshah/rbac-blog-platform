import React from 'react';
import { Link } from 'react-router-dom';

const Home = () => {
  return (
    <div className="home-container">
      <div className="hero-section">
        <h1>Welcome to RBAC Blog Platform</h1>
        <p className="lead">A secure platform with role-based access control</p>
        <div className="hero-actions">
          <Link to="/blog" className="btn-primary">Read Blog Posts</Link>
          <Link to="/register" className="btn-secondary">Join Now</Link>
        </div>
      </div>

      <div className="features-section">
        <h2>Platform Features</h2>
        <div className="feature-cards">
          <div className="feature-card">
            <h3>Role-Based Access</h3>
            <p>Secure access control with different permissions for users and admins.</p>
          </div>
          <div className="feature-card">
            <h3>Blog Management</h3>
            <p>Create, read, update, and delete blog posts with proper authorization.</p>
          </div>
          <div className="feature-card">
            <h3>User Authentication</h3>
            <p>Secure login system with email verification and profile management.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
