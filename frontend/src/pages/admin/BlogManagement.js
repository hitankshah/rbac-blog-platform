import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api, { blogService } from '../../services/api';
import './BlogManagement.css';

const BlogManagement = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('table'); 
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });

  useEffect(() => {
    fetchPosts();
  }, [pagination.page]);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const response = await blogService.getPosts(pagination.page, pagination.limit, searchTerm);
      setPosts(response.data.posts);
      setPagination(response.data.pagination);
      setError(null);
    } catch (err) {
      console.error('Error fetching posts:', err);
      setError('Failed to load blog posts');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (postId) => {
    if (!window.confirm('Are you sure you want to delete this post?')) {
      return;
    }
    
    try {
      await blogService.deletePost(postId);
      // Remove the deleted post from the posts array
      setPosts(posts.filter(post => post.id !== postId));
      // Refetch if the current page might be empty
      if (posts.length === 1 && pagination.page > 1) {
        setPagination(prev => ({
          ...prev,
          page: prev.page - 1
        }));
      }
    } catch (err) {
      console.error('Error deleting post:', err);
      setError('Failed to delete post');
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage > 0 && newPage <= pagination.totalPages) {
      setPagination(prev => ({ ...prev, page: newPage }));
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    // Reset to first page and fetch with search term
    setPagination(prev => ({ ...prev, page: 1 }));
    fetchPosts();
  };

  const filteredPosts = posts.filter(post =>
    post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    post.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading && posts.length === 0) return <div className="loading">Loading posts...</div>;

  return (
    <div className="blog-management">
      <div className="management-header">
        <h1>Blog Management</h1>
        <div className="header-actions">
          <div className="view-toggle">
            <button 
              className={`view-btn ${viewMode === 'table' ? 'active' : ''}`}
              onClick={() => setViewMode('table')}
            >
              <i className="fas fa-list"></i> Table View
            </button>
            <button 
              className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
            >
              <i className="fas fa-th"></i> Grid View
            </button>
          </div>
          <Link to="/admin/blogs/create" className="btn primary">
            <i className="fas fa-plus"></i> Create New Post
          </Link>
        </div>
      </div>
      
      {error && <div className="error-message">{error}</div>}
      
      <div className="search-box">
        <form onSubmit={handleSearchSubmit}>
          <input
            type="text"
            placeholder="Search posts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <button type="submit" className="search-btn">
            <i className="fas fa-search"></i> Search
          </button>
        </form>
      </div>
      
      {viewMode === 'table' ? (
        <div className="posts-table">
          <table>
            <thead>
              <tr>
                <th>Title</th>
                <th>Author</th>
                <th>Images</th>
                <th>Created</th>
                <th>Updated</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPosts.length > 0 ? (
                filteredPosts.map(post => (
                  <tr key={post.id}>
                    <td className="post-title-cell">
                      <div className="post-title-wrapper">
                        <div className="post-title">{post.title}</div>
                        <div className="post-excerpt">{post.content.substring(0, 60)}...</div>
                      </div>
                    </td>
                    <td>{post.users?.name || 'Unknown'}</td>
                    <td className="post-images-cell">
                      {post.images && post.images.length > 0 ? (
                        <div className="image-count">
                          <i className="fas fa-image"></i> {post.images.length}
                          {post.images.length > 0 && (
                            <img 
                              src={post.images[0].url} 
                              alt="Thumbnail" 
                              className="mini-thumbnail"
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.style.display = 'none';
                              }} 
                            />
                          )}
                        </div>
                      ) : (
                        <span className="no-images">No images</span>
                      )}
                    </td>
                    <td>{new Date(post.created_at).toLocaleDateString()}</td>
                    <td>{new Date(post.updated_at).toLocaleDateString()}</td>
                    <td className="post-actions">
                      <Link to={`/blog/${post.id}`} className="btn view" title="View Post">
                        <i className="fas fa-eye"></i>
                      </Link>
                      <Link to={`/admin/blogs/edit/${post.id}`} className="btn edit" title="Edit Post">
                        <i className="fas fa-edit"></i>
                      </Link>
                      <button 
                        onClick={() => handleDelete(post.id)} 
                        className="btn delete"
                        title="Delete Post"
                      >
                        <i className="fas fa-trash"></i>
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="no-results">No posts found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="posts-grid">
          {filteredPosts.length > 0 ? (
            filteredPosts.map(post => (
              <div key={post.id} className="post-card">
                <div className="post-card-header">
                  {post.images && post.images.length > 0 ? (
                    <div className="post-image">
                      <img 
                        src={post.images[0].url} 
                        alt={`Featured for ${post.title}`}
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = 'https://via.placeholder.com/300x200?text=No+Image';
                        }}
                      />
                      {post.images.length > 1 && (
                        <div className="image-count-badge">+{post.images.length - 1}</div>
                      )}
                    </div>
                  ) : (
                    <div className="post-no-image">
                      <i className="fas fa-image"></i>
                      <span>No Image</span>
                    </div>
                  )}
                </div>
                <div className="post-card-body">
                  <h3 className="post-card-title">{post.title}</h3>
                  <p className="post-card-excerpt">{post.content.substring(0, 100)}...</p>
                  <div className="post-card-meta">
                    <span>By: {post.users?.name || 'Unknown'}</span>
                    <span>{new Date(post.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="post-card-actions">
                  <Link to={`/blog/${post.id}`} className="btn view" title="View Post">
                    <i className="fas fa-eye"></i> View
                  </Link>
                  <Link to={`/admin/blogs/edit/${post.id}`} className="btn edit" title="Edit Post">
                    <i className="fas fa-edit"></i> Edit
                  </Link>
                  <button 
                    onClick={() => handleDelete(post.id)} 
                    className="btn delete"
                    title="Delete Post"
                  >
                    <i className="fas fa-trash"></i> Delete
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="no-results-grid">No posts found</div>
          )}
        </div>
      )}
      
      {/* Pagination */}
      <div className="pagination">
        <button 
          onClick={() => handlePageChange(pagination.page - 1)}
          disabled={pagination.page === 1}
          className="pagination-btn"
        >
          <i className="fas fa-chevron-left"></i> Previous
        </button>
        
        <span className="page-info">
          Page {pagination.page} of {pagination.totalPages}
        </span>
        
        <button 
          onClick={() => handlePageChange(pagination.page + 1)}
          disabled={pagination.page === pagination.totalPages}
          className="pagination-btn"
        >
          Next <i className="fas fa-chevron-right"></i>
        </button>
      </div>
    </div>
  );
};

export default BlogManagement;
