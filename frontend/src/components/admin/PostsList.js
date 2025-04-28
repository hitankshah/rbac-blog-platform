import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { blogService } from '../../services/api';
import './Dashboard.css';

const PostsList = () => {
  const [posts, setPosts] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState({ text: '', type: '' });
  const [searchQuery, setSearchQuery] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // Check for success message from post creation/update
    if (location.state?.message) {
      setMessage({
        text: location.state.message,
        type: location.state.type || 'success'
      });
      
      // Clear location state
      navigate(location.pathname, { replace: true });
      
      // Auto clear message after 5 seconds
      const timer = setTimeout(() => {
        setMessage({ text: '', type: '' });
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [location.state, navigate, location.pathname]);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        setLoading(true);
        const response = await blogService.getPosts(pagination.page, pagination.limit, searchQuery);
        
        setPosts(response.data.posts || []);
        setPagination({
          page: response.data.pagination?.page || 1,
          limit: response.data.pagination?.limit || 10,
          total: response.data.pagination?.total || 0,
          totalPages: response.data.pagination?.totalPages || 1
        });
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching posts:', err);
        setError('Failed to load blog posts');
        setLoading(false);
      }
    };

    fetchPosts();
  }, [pagination.page, pagination.limit, searchQuery]);

  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const handleSearch = (e) => {
    e.preventDefault();
    // Reset to page 1 when searching
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleDeleteClick = (postId) => {
    setShowDeleteConfirm(postId);
  };

  const handleDeleteConfirm = async () => {
    if (!showDeleteConfirm) return;
    
    try {
      await blogService.deletePost(showDeleteConfirm);
      
      setPosts(prev => prev.filter(post => post.id !== showDeleteConfirm));
      setMessage({ text: 'Post deleted successfully', type: 'success' });
      
      // Auto clear message after 5 seconds
      setTimeout(() => {
        setMessage({ text: '', type: '' });
      }, 5000);
    } catch (err) {
      console.error('Error deleting post:', err);
      setMessage({ 
        text: err.response?.data?.message || 'Failed to delete post', 
        type: 'error' 
      });
    } finally {
      setShowDeleteConfirm(null);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteConfirm(null);
  };

  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const truncateContent = (content, maxLength = 100) => {
    if (!content) return '';
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  };

  if (loading && posts.length === 0) {
    return <div className="loading">Loading posts...</div>;
  }

  return (
    <div>
      <div className="dashboard-header">
        <div>
          <h1>Blog Posts</h1>
          <p>Manage your blog posts here</p>
        </div>
        <Link to="/admin/posts/new" className="btn btn-primary">
          <i className="fas fa-plus"></i> New Post
        </Link>
      </div>
      
      {message.text && (
        <div className={`alert alert-${message.type}`}>{message.text}</div>
      )}
      
      <div className="search-filters">
        <form onSubmit={handleSearch}>
          <div className="search-bar">
            <input
              type="text"
              placeholder="Search by title or content..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            <button type="submit">
              <i className="fas fa-search"></i>
            </button>
          </div>
        </form>
      </div>
      
      {error ? (
        <div className="error-message">{error}</div>
      ) : posts.length === 0 ? (
        <div className="no-results">
          <p>No posts found. {searchQuery && 'Try a different search term or'} <Link to="/admin/posts/new">create a new post</Link>.</p>
        </div>
      ) : (
        <>
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Author</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {posts.map(post => (
                  <tr key={post.id}>
                    <td>
                      <div className="post-title-cell">
                        <div className="post-title">{post.title}</div>
                        <div className="post-excerpt">{truncateContent(post.content)}</div>
                      </div>
                    </td>
                    <td>{post.author?.name || 'Unknown'}</td>
                    <td>{formatDate(post.created_at)}</td>
                    <td>
                      <div className="table-actions">
                        <Link to={`/blog/${post.id}`} className="action-view" title="View Post">
                          <i className="fas fa-eye"></i>
                        </Link>
                        <Link to={`/admin/posts/edit/${post.id}`} className="action-edit" title="Edit Post">
                          <i className="fas fa-edit"></i>
                        </Link>
                        <button 
                          className="action-delete" 
                          onClick={() => handleDeleteClick(post.id)}
                          title="Delete Post"
                        >
                          <i className="fas fa-trash-alt"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="pagination">
              <button
                className="btn btn-pagination"
                disabled={pagination.page === 1}
                onClick={() => handlePageChange(pagination.page - 1)}
              >
                <i className="fas fa-chevron-left"></i> Previous
              </button>
              <span className="pagination-info">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                className="btn btn-pagination"
                disabled={pagination.page === pagination.totalPages}
                onClick={() => handlePageChange(pagination.page + 1)}
              >
                Next <i className="fas fa-chevron-right"></i>
              </button>
            </div>
          )}
        </>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Confirm Deletion</h3>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to delete this post? This action cannot be undone.</p>
            </div>
            <div className="modal-footer">
              <button 
                className="btn btn-cancel"
                onClick={handleDeleteCancel}
              >
                Cancel
              </button>
              <button 
                className="btn btn-delete"
                onClick={handleDeleteConfirm}
              >
                Delete Post
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PostsList;
