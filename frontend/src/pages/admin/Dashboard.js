import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import './Dashboard.css';

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalPosts: 0,
    newUsersThisWeek: 0,
    newPostsThisWeek: 0
  });
  const [recentUsers, setRecentUsers] = useState([]);
  const [recentPosts, setRecentPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAdminData = async () => {
      try {
        // Get admin stats
        const statsResponse = await api.get('/admin/stats');
        setStats(statsResponse.data);
        
        // Get recent users
        const usersResponse = await api.get('/admin/users?limit=5');
        setRecentUsers(usersResponse.data);
        
        // Get recent posts
        const postsResponse = await api.get('/blog?limit=5');
        setRecentPosts(postsResponse.data.posts);
        
        setLoading(false);
      } catch (err) {
        setError('Failed to load admin dashboard data');
        setLoading(false);
      }
    };
    
    fetchAdminData();
  });

  if (loading) return <div className="loading">Loading dashboard...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="admin-dashboard">
      <h1>Admin Dashboard</h1>
      
      <div className="stats-grid">
        <div className="stat-card">
          <h3>Total Users</h3>
          <div className="stat-number">{stats.totalUsers}</div>
          <div className="stat-change">
            +{stats.newUsersThisWeek} this week
          </div>
        </div>
        
        <div className="stat-card">
          <h3>Total Blog Posts</h3>
          <div className="stat-number">{stats.totalPosts}</div>
          <div className="stat-change">
            +{stats.newPostsThisWeek} this week
          </div>
        </div>
      </div>
      
      <div className="admin-actions">
        <Link to="/admin/posts" className="btn primary">Create New Post</Link>
        <Link to="/admin/users" className="btn secondary">Manage Users</Link>
        <Link to="/admin/blogs" className="btn secondary">Manage Blog Posts</Link>
      </div>
      
      <div className="dashboard-sections">
        <div className="recent-section">
          <h2>Recent Users</h2>
          <div className="user-list">
            {recentUsers.length > 0 ? (
              recentUsers.map(user => (
                <div key={user.id} className="user-item">
                  <div className="user-details">
                    <h4>{user.name}</h4>
                    <p>{user.email}</p>
                    <span className={`role-badge ${user.role}`}>{user.role}</span>
                  </div>
                  <div className="user-actions">
                    <Link to={`/admin/users/${user.id}`}>View</Link>
                  </div>
                </div>
              ))
            ) : (
              <p>No users found</p>
            )}
          </div>
          <Link to="/admin/users" className="view-all">View All Users</Link>
        </div>
        
        <div className="recent-section">
          <h2>Recent Posts</h2>
          <div className="post-list">
            {recentPosts.length > 0 ? (
              recentPosts.map(post => (
                <div key={post.id} className="post-item">
                  <div className="post-details">
                    <h4>{post.title}</h4>
                    <p>By: {post.author.name}</p>
                    <span className="date">{new Date(post.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="post-actions">
                    <Link to={`/admin/blogs/edit/${post.id}`}>Edit</Link>
                    <Link to={`/blog/${post.id}`}>View</Link>
                  </div>
                </div>
              ))
            ) : (
              <p>No posts found</p>
            )}
          </div>
          <Link to="/admin/blogs" className="view-all">View All Posts</Link>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
