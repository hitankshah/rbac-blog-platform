import React from 'react';
import './Pages.css';

const About = () => {
  return (
    <div className="page-container">
      <div className="page-header">
        <h1>About RBAC Blog</h1>
      </div>

      <div className="page-content">
        <section className="about-section">
          <h2>Our Mission</h2>
          <p>
            RBAC Blog is a demonstration of a role-based access control system integrated with
            a full-featured blog platform. Our goal is to showcase how different user roles
            can have different permissions within a modern web application.
          </p>
        </section>

        <section className="about-section">
          <h2>Technologies Used</h2>
          <div className="tech-stack">
            <div className="tech-item">
              <h3>Frontend</h3>
              <ul>
                <li>React</li>
                <li>React Router</li>
                <li>Context API</li>
                <li>Axios</li>
              </ul>
            </div>
            <div className="tech-item">
              <h3>Backend</h3>
              <ul>
                <li>Node.js</li>
                <li>Express</li>
                <li>Supabase</li>
              </ul>
            </div>
            <div className="tech-item">
              <h3>Database</h3>
              <ul>
                <li>PostgreSQL</li>
                <li>Supabase Auth</li>
                <li>Supabase Storage</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="about-section">
          <h2>How It Works</h2>
          <p>
            RBAC Blog implements role-based access control (RBAC) to manage user permissions:
          </p>
          <ul className="feature-list">
            <li><strong>Regular Users</strong>: Can read blog posts, leave comments, and manage their profiles</li>
            <li><strong>Admin Users</strong>: Have additional permissions to create and manage blog posts, moderate comments, and manage user accounts</li>
          </ul>
          <p>
            This separation of permissions ensures that only authorized users can perform 
            administrative actions while providing a seamless experience for regular users.
          </p>
        </section>
      </div>
    </div>
  );
};

export default About;
