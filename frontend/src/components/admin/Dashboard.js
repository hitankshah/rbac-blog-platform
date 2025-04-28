import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { currentUser, isAdmin } = useAuth();
  const navigate = useNavigate();

  // Check if user is admin
  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
      return;
    }
    
    if (!isAdmin) {
      navigate('/'); // Redirect non-admin users to home page
      return;
    }
  }, [currentUser, isAdmin, navigate]);

  // Fetch admin stats
  useEffect(() => {
    const fetchStats = async () => {
      if (!isAdmin) return;
      
      try {
        setLoading(true);
        const response = await adminService.getStats();
        setStats(response.data);
      } catch (err) {
        console.error('Error fetching admin stats:', err);
        setError('Failed to load admin statistics');
      } finally {
        setLoading(false);
      }
    };

    if (isAdmin) {
      fetchStats();
    }
  }, [isAdmin]);

  if (loading) {
    return <div className="loading">Loading admin dashboard...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div className="admin-dashboard">
      <div className="dashboard-header">
        <h1>Admin Dashboard</h1>
        <p className="welcome-message">
          Welcome, <strong>{currentUser?.name}</strong>!
        </p>
      </div>

      {stats && (
        <div className="stats-container">
          <div className="stat-card">
            <h3>Total Users</h3>
            <p className="stat-number">{stats.totalUsers}</p>
          </div>
          <div className="stat-card">
            <h3>Total Posts</h3>
            <p className="stat-number">{stats.totalPosts}</p>
          </div>
          <div className="stat-card">
            <h3>Total Images</h3>
            <p className="stat-number">{stats.totalImages || 0}</p>
          </div>
          <div className="stat-card">
            <h3>New Users This Week</h3>
            <p className="stat-number">{stats.newUsersThisWeek}</p>
          </div>
          <div className="stat-card">
            <h3>New Posts This Week</h3>
            <p className="stat-number">{stats.newPostsThisWeek}</p>
          </div>
        </div>
      )}

      <div className="admin-actions">
        <h2>Quick Actions</h2>
        <div className="action-buttons">
          <button onClick={() => navigate('/admin/users')}>
            Manage Users
          </button>
          <button onClick={() => navigate('/admin/posts')}>
            Manage Blog Posts
          </button>
          <button onClick={() => navigate('/admin/create-post')}>
            Create New Post
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
