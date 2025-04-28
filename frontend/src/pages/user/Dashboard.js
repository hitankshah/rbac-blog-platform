import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import './Dashboard.css';

const UserDashboard = () => {
  const { currentUser } = useAuth();
  const [userActivity, setUserActivity] = useState({
    comments: [],
    recentPosts: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        // Get recent blog posts
        const blogResponse = await api.get('/blog?limit=5');
        
        // Get user's comments (if they implemented comment feature)
        // Replace with actual endpoint when implemented
        const commentsResponse = await api.get('/users/comments');
        
        setUserActivity({
          recentPosts: blogResponse.data.posts,
          comments: commentsResponse.data || []
        });
        
        setLoading(false);
      } catch (err) {
        setError('Failed to load dashboard data');
        setLoading(false);
      }
    };
    
    fetchUserData();
  }, []);

  if (loading) return <div className="loading">Loading dashboard...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="user-dashboard">
      <h1>Welcome, {currentUser?.name}</h1>
      
      <div className="dashboard-header">
        <div className="user-info">
          <div className="user-avatar">
            {currentUser?.name?.charAt(0).toUpperCase()}
          </div>
          <div className="user-details">
            <h2>{currentUser?.name}</h2>
            <p>{currentUser?.email}</p>
            <span className={`role-badge ${currentUser?.role}`}>
              {currentUser?.role}
            </span>
          </div>
        </div>
        
        <div className="dashboard-actions">
          <Link to="/profile" className="btn secondary">Edit Profile</Link>
        </div>
      </div>
      
      <div className="dashboard-sections">
        <div className="dashboard-section">
          <h2>Recent Posts</h2>
          <div className="recent-posts">
            {userActivity.recentPosts.length > 0 ? (
              userActivity.recentPosts.map(post => (
                <div key={post.id} className="post-item">
                  <h3>{post.title}</h3>
                  <div className="post-meta">
                    <span>By: {post.author.name}</span>
                    <span>{new Date(post.created_at).toLocaleDateString()}</span>
                  </div>
                  <Link to={`/blog/${post.id}`} className="read-more">Read Post</Link>
                </div>
              ))
            ) : (
              <p>No recent blog posts</p>
            )}
          </div>
        </div>
        
        <div className="dashboard-section">
          <h2>Your Comments</h2>
          <div className="user-comments">
            {userActivity.comments.length > 0 ? (
              userActivity.comments.map(comment => (
                <div key={comment.id} className="comment-item">
                  <p>{comment.content}</p>
                  <div className="comment-meta">
                    <span>On post: {comment.post_title}</span>
                    <span>{new Date(comment.created_at).toLocaleDateString()}</span>
                  </div>
                  <Link to={`/blog/${comment.post_id}`} className="view-post">View Post</Link>
                </div>
              ))
            ) : (
              <p>You haven't commented on any posts yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserDashboard;
