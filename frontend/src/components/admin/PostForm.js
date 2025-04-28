import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { blogService } from '../../services/api';
import './Dashboard.css';

const PostForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;
  
  const [posts, setPosts] = useState([]);
  const [pagination, setPagination] = useState({ 
    page: 1, 
    limit: 5,
    total: 0,
    totalPages: 1
  });
  const [loadingPosts, setLoadingPosts] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    images: []
  });
  const [previewImages, setPreviewImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(null);

  // Fetch existing posts for listing
  useEffect(() => {
    const fetchPosts = async () => {
      setLoadingPosts(true);
      try {
        const response = await blogService.getPosts(pagination.page, pagination.limit);
        setPosts(response.data.posts || []);
        
        // Update pagination info if available
        if (response.data.pagination) {
          setPagination(prev => ({
            ...prev,
            total: response.data.pagination.total || 0,
            totalPages: response.data.pagination.totalPages || 1
          }));
        }
        
        setLoadingPosts(false);
      } catch (err) {
        console.error('Error fetching posts:', err);
        setLoadingPosts(false);
      }
    };
    
    fetchPosts();
  }, [pagination.page, pagination.limit, success]);

  // Add pagination handlers
  const handleNextPage = () => {
    if (pagination.page < pagination.totalPages) {
      setPagination(prev => ({ ...prev, page: prev.page + 1 }));
    }
  };

  const handlePrevPage = () => {
    if (pagination.page > 1) {
      setPagination(prev => ({ ...prev, page: prev.page - 1 }));
    }
  };

  // Fetch specific post if editing
  useEffect(() => {
    if (isEditing) {
      const fetchPost = async () => {
        try {
          setLoading(true);
          const response = await blogService.getPost(id);
          const post = response.data;
          
          setFormData({
            title: post.title || '',
            content: post.content || '',
            images: []
          });
          
          if (post.images && post.images.length > 0) {
            setPreviewImages(post.images.map(img => ({
              id: img.id,
              url: img.url,
              isExisting: true
            })));
          }
          
          setLoading(false);
        } catch (err) {
          console.error('Error fetching post:', err);
          setError('Failed to load post data');
          setLoading(false);
        }
      };
      
      fetchPost();
    }
  }, [id, isEditing]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    
    // Update form data with selected files
    setFormData(prev => ({
      ...prev,
      images: [...prev.images, ...files]
    }));
    
    // Create preview URLs for selected files
    const newPreviewImages = files.map(file => ({
      id: Date.now() + Math.random().toString(36).substring(2, 9),
      url: URL.createObjectURL(file),
      file: file,
      isExisting: false
    }));
    
    setPreviewImages(prev => [...prev, ...newPreviewImages]);
  };

  const removeImage = (id) => {
    const imageToRemove = previewImages.find(img => img.id === id);
    
    // Revoke object URL to avoid memory leaks
    if (imageToRemove && !imageToRemove.isExisting) {
      URL.revokeObjectURL(imageToRemove.url);
    }
    
    // Remove from previewImages
    setPreviewImages(prev => prev.filter(img => img.id !== id));
    
    // Remove from formData.images if it's a new file
    if (imageToRemove && !imageToRemove.isExisting) {
      setFormData(prev => ({
        ...prev,
        images: prev.images.filter(file => 
          file !== imageToRemove.file
        )
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    
    try {
      const formPayload = new FormData();
      formPayload.append('title', formData.title);
      formPayload.append('content', formData.content);
      
      // Add image files to form data
      formData.images.forEach(file => {
        formPayload.append('images', file);
      });
      
      if (isEditing) {
        await blogService.updatePost(id, formPayload);
        setSuccess(`Post "${formData.title}" updated successfully!`);
      } else {
        await blogService.createPost(formPayload);
        setSuccess(`Post "${formData.title}" created successfully!`);
        // Reset form
        setFormData({ title: '', content: '', images: [] });
        setPreviewImages([]);
      }
    } catch (err) {
      console.error('Error submitting post:', err);
      setError(err.response?.data?.message || `Failed to ${isEditing ? 'update' : 'create'} post`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteClick = (postId) => {
    setShowDeleteModal(postId);
  };

  const handleDeleteConfirm = async () => {
    if (!showDeleteModal) return;
    
    try {
      await blogService.deletePost(showDeleteModal);
      setSuccess('Post deleted successfully!');
      setShowDeleteModal(null);
    } catch (err) {
      console.error('Error deleting post:', err);
      setError(err.response?.data?.message || 'Failed to delete post');
    }
  };

  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };
  
  if (loading) {
    return <div className="loading">Loading post data...</div>;
  }

  return (
    <div>
      <div className="dashboard-header">
        <h1>{isEditing ? 'Edit Blog Post' : 'Manage Blog Posts'}</h1>
      </div>
      
      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}
      
      <div className="blog-management">
        <form className="admin-form" onSubmit={handleSubmit}>
          <h2>{isEditing ? 'Edit Post' : 'Create New Post'}</h2>
          
          <div className="form-group">
            <label htmlFor="title">Post Title</label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="Enter post title"
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="content">Post Content</label>
            <textarea
              id="content"
              name="content"
              value={formData.content}
              onChange={handleChange}
              placeholder="Write your blog post content here..."
              required
            ></textarea>
          </div>
          
          <div className="form-group">
            <label>Images</label>
            <p className="form-help">Upload images for your blog post (optional)</p>
            
            <input
              type="file"
              id="images"
              name="images"
              onChange={handleFileChange}
              multiple
              accept="image/*"
              className="file-upload"
            />
            
            {previewImages.length > 0 && (
              <div className="preview-images">
                {previewImages.map(image => (
                  <div key={image.id} className="preview-image">
                    <img src={image.url} alt="Preview" />
                    <button 
                      type="button" 
                      className="remove-btn"
                      onClick={() => removeImage(image.id)}
                    >
                      <i className="fas fa-times"></i>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="form-buttons">
            {isEditing && (
              <button 
                type="button" 
                className="btn btn-cancel"
                onClick={() => navigate('/admin/posts')}
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              className="btn btn-submit"
              disabled={submitting}
            >
              {submitting 
                ? (isEditing ? 'Updating...' : 'Creating...') 
                : (isEditing ? 'Update Post' : 'Create Post')
              }
            </button>
          </div>
        </form>
        
        {!isEditing && (
          <div className="recent-posts-section">
            <h2>Recent Posts</h2>
            {loadingPosts ? (
              <div className="loading">Loading posts...</div>
            ) : posts.length === 0 ? (
              <div className="no-results">No posts found.</div>
            ) : (
              <>
                <div className="admin-table-container">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Title</th>
                        <th>Date</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {posts.map(post => (
                        <tr key={post.id}>
                          <td>{post.title}</td>
                          <td>{formatDate(post.created_at)}</td>
                          <td>
                            <div className="table-actions">
                              <Link to={`/blog/${post.id}`} className="action-view" title="View Post">
                                <i className="fas fa-eye"></i>
                              </Link>
                              <Link to={`/admin/posts/${post.id}`} className="action-edit" title="Edit Post">
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
                
                {/* Add pagination controls */}
                {pagination.totalPages > 1 && (
                  <div className="pagination">
                    <button 
                      className="btn btn-pagination" 
                      onClick={handlePrevPage}
                      disabled={pagination.page === 1}
                    >
                      <i className="fas fa-chevron-left"></i> Previous
                    </button>
                    <span className="pagination-info">
                      Page {pagination.page} of {pagination.totalPages}
                    </span>
                    <button 
                      className="btn btn-pagination" 
                      onClick={handleNextPage}
                      disabled={pagination.page === pagination.totalPages}
                    >
                      Next <i className="fas fa-chevron-right"></i>
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
      
      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
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
                onClick={() => setShowDeleteModal(null)}
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

export default PostForm;
