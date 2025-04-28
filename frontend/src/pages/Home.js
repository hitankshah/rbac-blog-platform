import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import './Home.css';

const Home = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });
  const { currentUser } = useAuth();

  useEffect(() => {
    fetchPosts(pagination.page);
  }, [pagination.page]);

  const fetchPosts = async (page) => {
    try {
      setLoading(true);
      const response = await api.get(`/blog?page=${page}&limit=${pagination.limit}`);
      setPosts(response.data.posts);
      setPagination(response.data.pagination);
      setError(null);
    } catch (err) {
      setError('Failed to load blog posts');
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage > 0 && newPage <= pagination.totalPages) {
      setPagination(prev => ({ ...prev, page: newPage }));
    }
  };

  if (loading && posts.length === 0) return <div className="loading">Loading posts...</div>;

  return (
    <div className="home-container">
      <div className="hero-section">
        <h1>Welcome to RBAC Blog Platform</h1>
        <p>Discover insightful articles and share your thoughts</p>
        
        {currentUser?.role === 'admin' && (
          <Link to="/admin/blogs/create" className="btn create-post-btn">
            Create New Post
          </Link>
        )}
      </div>
      
      {error && <div className="error-message">{error}</div>}
      
      <div className="blog-posts">
        {posts.length > 0 ? (
          posts.map(post => (
            <div key={post.id} className="post-card">
              <h2 className="post-title">{post.title}</h2>
              
              <div className="post-meta">
                <span className="post-author">By: {post.author.name}</span>
                <span className="post-date">
                  {new Date(post.created_at).toLocaleDateString()}
                </span>
              </div>
              
              <div className="post-excerpt">
                {post.content.substring(0, 150)}...
              </div>
              
              <div className="post-footer">
                <Link to={`/blog/${post.id}`} className="read-more">
                  Read More
                </Link>
                
                {currentUser?.role === 'admin' && (
                  <div className="admin-actions">
                    <Link to={`/admin/blogs/edit/${post.id}`} className="edit-post">
                      Edit
                    </Link>
                  </div>
                )}
              </div>
            </div>
          ))
        ) : (
          <p className="no-posts">No blog posts found</p>
        )}
      </div>
      
      {/* Pagination */}
      <div className="pagination">
        <button 
          onClick={() => handlePageChange(pagination.page - 1)}
          disabled={pagination.page === 1}
          className="pagination-btn"
        >
          Previous
        </button>
        
        <span className="page-info">
          Page {pagination.page} of {pagination.totalPages}
        </span>
        
        <button 
          onClick={() => handlePageChange(pagination.page + 1)}
          disabled={pagination.page === pagination.totalPages}
          className="pagination-btn"
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default Home;
