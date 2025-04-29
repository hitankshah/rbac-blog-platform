import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { adminService } from '../../services/api';
import api from '../../services/api';
import './Dashboard.css';

// Cache for stats to prevent duplicate requests
let statsCache = null;
let lastFetchTime = 0;
const CACHE_DURATION = 60000; // 1 minute cache

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [recentPosts, setRecentPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [postDeleteLoading, setPostDeleteLoading] = useState(false);

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

  // Fetch recent posts
  const fetchRecentPosts = useCallback(async () => {
    try {
      const response = await api.get('/blog?page=1&limit=5');
      setRecentPosts(response.data.posts);
    } catch (err) {
      console.error('Error fetching recent posts:', err);
    }
  }, []);

  const handleDeletePost = async (postId) => {
    if (!window.confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
      return;
    }
    
    try {
      setPostDeleteLoading(true);
      await api.delete(`/blog/${postId}`);
      
      // Remove the deleted post from the list
      setRecentPosts(prevPosts => prevPosts.filter(post => post.id !== postId));
      
      // Refresh stats as post count changed
      fetchStats();
    } catch (err) {
      console.error('Error deleting post:', err);
      alert('Failed to delete post. Please try again.');
    } finally {
      setPostDeleteLoading(false);
    }
  };

  // Use effect with cleanup to prevent memory leaks
  useEffect(() => {
    let mounted = true;
    
    const loadDashboardData = async () => {
      await fetchStats();
      await fetchRecentPosts();
      if (!mounted) return;
    };
    
    loadDashboardData();
    
    // Cleanup function
    return () => {
      mounted = false;
    };
  }, [fetchStats, fetchRecentPosts]);

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
          <Link to="/admin/blogs/create" className="action-button">
            <i className="fas fa-edit"></i> Create New Post
          </Link>
          <Link to="/admin/blogs" className="action-button">
            <i className="fas fa-list"></i> Manage All Posts
          </Link>
          <Link to="/admin/users" className="action-button">
            <i className="fas fa-users"></i> Manage Users
          </Link>
          <Link to="/" className="action-button" target="_blank" rel="noopener noreferrer">
            <i className="fas fa-external-link-alt"></i> View Blog
          </Link>
        </div>
      </div>
      
      {/* Recent Posts Section */}
      <div className="recent-posts-section">
        <div className="section-header">
          <h2>Recent Blog Posts</h2>
          <Link to="/admin/blogs" className="view-all-link">
            View All Posts <i className="fas fa-arrow-right"></i>
          </Link>
        </div>
        
        {recentPosts.length > 0 ? (
          <div className="recent-posts-table">
            <table>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Author</th>
                  <th>Date</th>
                  <th>Images</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {recentPosts.map(post => (
                  <tr key={post.id}>
                    <td className="post-title-cell">
                      <div className="post-title-with-excerpt">
                        <div className="post-title">{post.title}</div>
                        <div className="post-excerpt">{post.content.substring(0, 60)}...</div>
                      </div>
                    </td>
                    <td>{post.users?.name || 'Unknown'}</td>
                    <td>{new Date(post.created_at).toLocaleDateString()}</td>
                    <td>
                      {post.images && post.images.length > 0 ? (
                        <span className="image-count">
                          <i className="fas fa-image"></i> {post.images.length}
                        </span>
                      ) : (
                        <span className="no-images">None</span>
                      )}
                    </td>
                    <td className="post-actions">
                      <Link to={`/blog/${post.id}`} className="action-btn view" title="View Post">
                        <i className="fas fa-eye"></i>
                      </Link>
                      <Link to={`/admin/blogs/edit/${post.id}`} className="action-btn edit" title="Edit Post">
                        <i className="fas fa-pencil-alt"></i>
                      </Link>
                      <button 
                        className="action-btn delete" 
                        title="Delete Post"
                        onClick={() => handleDeletePost(post.id)}
                        disabled={postDeleteLoading}
                      >
                        <i className="fas fa-trash"></i>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="no-posts-message">
            <i className="fas fa-file-alt"></i>
            <p>No blog posts found. Create your first post!</p>
            <Link to="/admin/blogs/create" className="btn-create-post">
              Create Post
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;