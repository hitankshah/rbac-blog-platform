import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  // Get token and user from local storage
  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    
    if (!token || !storedUser) {
      navigate('/login');
      return;
    }
    
    try {
      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);
      
      // Redirect if not admin
      if (parsedUser.role !== 'admin') {
        navigate('/');
      }
    } catch (err) {
      console.error('Error parsing user data:', err);
      navigate('/login');
    }
  }, [navigate]);

  // Fetch admin stats
  useEffect(() => {
    const fetchStats = async () => {
      const token = localStorage.getItem('token');
      if (!token) return;
      
      setLoading(true);
      try {
        const response = await axios.get(
          `${process.env.REACT_APP_API_URL || 'https://rbac-backend.onrender.com'}/api/admin/stats`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        
        setStats(response.data);
      } catch (err) {
        console.error('Error fetching admin stats:', err);
        setError('Failed to load admin statistics');
        
        // If unauthorized, redirect to login
        if (err.response?.status === 401 || err.response?.status === 403) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          navigate('/login');
        }
      } finally {
        setLoading(false);
      }
    };

    if (user && user.role === 'admin') {
      fetchStats();
    }
  }, [user, navigate]);

  if (loading) {
    return <div className="loading">Loading dashboard...</div>;
  }

  if (error) {
    return <div className="error-container">{error}</div>;
  }

  return (
    <div className="admin-dashboard">
      <div className="dashboard-header">
        <h1>Admin Dashboard</h1>
        <p>Welcome, {user?.name || 'Admin'}</p>
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

export default AdminDashboard;
