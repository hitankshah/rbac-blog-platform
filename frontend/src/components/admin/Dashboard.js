import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { adminService } from '../../services/api';
import './Dashboard.css';

// Cache for stats to prevent duplicate requests
let statsCache = null;
let lastFetchTime = 0;
const CACHE_DURATION = 60000; // 1 minute cache

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Debounced fetch function
  const fetchStats = useCallback(async () => {
    // Use cache if available and not expired
    const currentTime = Date.now();
    if (statsCache && currentTime - lastFetchTime < CACHE_DURATION) {
      setStats(statsCache);
      setLoading(false);
      return;
    }

    try {
      const response = await adminService.getStats();
      const data = response.data;
      
      // Update cache
      statsCache = data;
      lastFetchTime = currentTime;
      
      setStats(data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching admin stats:', err);
      setError('Failed to load dashboard statistics');
      setLoading(false);
    }
  }, []);

  // Use effect with cleanup to prevent memory leaks
  useEffect(() => {
    let mounted = true;
    
    const loadStats = async () => {
      await fetchStats();
      if (!mounted) return;
    };
    
    loadStats();
    
    // Cleanup function
    return () => {
      mounted = false;
    };
  }, [fetchStats]);

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner"></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-error">
        <i className="fas fa-exclamation-triangle"></i>
        <p>{error}</p>
        <button onClick={fetchStats} className="btn-retry">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="dashboard-header">
        <h1>Admin Dashboard</h1>
        <p className="welcome-message">Welcome back, admin! Here's what's happening with your blog.</p>
      </div>

      <div className="stats-container">
        <div className="stat-card">
          <h3>Total Users</h3>
          <p className="stat-number">{stats?.totalUsers || 0}</p>
        </div>
        <div className="stat-card">
          <h3>Total Posts</h3>
          <p className="stat-number">{stats?.totalPosts || 0}</p>
        </div>
        <div className="stat-card">
          <h3>Total Images</h3>
          <p className="stat-number">{stats?.totalImages || 0}</p>
        </div>
        <div className="stat-card">
          <h3>New Users This Week</h3>
          <p className="stat-number">{stats?.newUsersThisWeek || 0}</p>
        </div>
        <div className="stat-card">
          <h3>New Posts This Week</h3>
          <p className="stat-number">{stats?.newPostsThisWeek || 0}</p>
        </div>
      </div>

      <div className="admin-actions">
        <h2>Quick Actions</h2>
        <div className="action-buttons">
          <Link to="/admin/posts" className="action-button">
            <i className="fas fa-edit"></i> Create New Post
          </Link>
          <Link to="/admin/users" className="action-button">
            <i className="fas fa-users"></i> Manage Users
          </Link>
          <Link to="/" className="action-button" target="_blank" rel="noopener noreferrer">
            <i className="fas fa-external-link-alt"></i> View Blog
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
