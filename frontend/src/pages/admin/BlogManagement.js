import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import './BlogManagement.css';

const BlogManagement = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
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
      const response = await api.get(`/blog?page=${pagination.page}&limit=${pagination.limit}`);
      setPosts(response.data.posts);
      setPagination(response.data.pagination);
      setError(null);
    } catch (err) {
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
      await api.delete(`/blog/${postId}`);
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
      setError('Failed to delete post');
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage > 0 && newPage <= pagination.totalPages) {
      setPagination(prev => ({ ...prev, page: newPage }));
    }
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
        <Link to="/admin/blogs/create" className="btn primary">Create New Post</Link>
      </div>
      
      {error && <div className="error-message">{error}</div>}
      
      <div className="search-box">
        <input
          type="text"
          placeholder="Search posts..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      
      <div className="posts-table">
        <table>
          <thead>
            <tr>
              <th>Title</th>
              <th>Author</th>
              <th>Created</th>
              <th>Updated</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredPosts.length > 0 ? (
              filteredPosts.map(post => (
                <tr key={post.id}>
                  <td>{post.title}</td>
                  <td>{post.author.name}</td>
                  <td>{new Date(post.created_at).toLocaleDateString()}</td>
                  <td>{new Date(post.updated_at).toLocaleDateString()}</td>
                  <td className="post-actions">
                    <Link to={`/blog/${post.id}`} className="btn view">View</Link>
                    <Link to={`/admin/blogs/edit/${post.id}`} className="btn edit">Edit</Link>
                    <button 
                      onClick={() => handleDelete(post.id)} 
                      className="btn delete"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" className="no-results">No posts found</td>
              </tr>
            )}
          </tbody>
        </table>
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

export default BlogManagement;
