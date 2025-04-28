import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { blogService } from '../../services/api';
import './BlogList.css';

const BlogList = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1
  });

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        // Changed from getAllPosts to getPosts to match the API service function
        const response = await blogService.getPosts(pagination.page, pagination.limit);
        
        setPosts(response.data.posts || []);
        
        if (response.data.pagination) {
          setPagination(prev => ({
            ...prev,
            total: response.data.pagination.total || 0,
            totalPages: response.data.pagination.totalPages || 1
          }));
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching posts:', err);
        setError('Failed to load blog posts');
        setLoading(false);
      }
    };

    fetchPosts();
  }, [pagination.page, pagination.limit]);

  const handlePageChange = (newPage) => {
    setPagination(prev => ({
      ...prev,
      page: newPage
    }));
    // Scroll to top when changing pages
    window.scrollTo(0, 0);
  };

  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  if (loading) {
    return <div className="loading-container">Loading posts...</div>;
  }

  if (error) {
    return <div className="error-container">{error}</div>;
  }

  return (
    <div className="blog-list-container">
      <div className="blog-header">
        <h1>Blog Posts</h1>
        <p>Read our latest articles and updates</p>
      </div>

      {posts.length === 0 ? (
        <div className="no-posts">
          <p>No posts found.</p>
        </div>
      ) : (
        <>
          <div className="posts-grid">
            {posts.map(post => (
              <div key={post.id} className="post-card">
                <div className="post-image">
                  {post.images && post.images.length > 0 ? (
                    <img src={post.images[0].url} alt={post.title} />
                  ) : (
                    <div className="placeholder-image">
                      <i className="fas fa-image"></i>
                    </div>
                  )}
                </div>
                <div className="post-content">
                  <h2><Link to={`/blog/${post.id}`}>{post.title}</Link></h2>
                  <div className="post-meta">
                    <span className="post-author">By {post.author?.name || 'Anonymous'}</span>
                    <span className="post-date">{formatDate(post.created_at)}</span>
                  </div>
                  <p className="post-excerpt">
                    {post.content && post.content.length > 150 
                      ? `${post.content.substring(0, 150)}...` 
                      : post.content}
                  </p>
                  <Link to={`/blog/${post.id}`} className="read-more">
                    Read More <i className="fas fa-arrow-right"></i>
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {pagination.totalPages > 1 && (
            <div className="pagination">
              <button 
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="pagination-btn prev"
              >
                <i className="fas fa-chevron-left"></i> Previous
              </button>
              
              <div className="pagination-numbers">
                {[...Array(pagination.totalPages).keys()].map(num => (
                  <button
                    key={num + 1}
                    onClick={() => handlePageChange(num + 1)}
                    className={pagination.page === num + 1 ? 'active' : ''}
                  >
                    {num + 1}
                  </button>
                ))}
              </div>
              
              <button 
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page === pagination.totalPages}
                className="pagination-btn next"
              >
                Next <i className="fas fa-chevron-right"></i>
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default BlogList;
