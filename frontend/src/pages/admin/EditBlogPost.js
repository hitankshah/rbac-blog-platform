import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../services/api';
import './BlogForm.css';

const EditBlogPost = () => {
  const { id } = useParams();
  const [formData, setFormData] = useState({
    title: '',
    content: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPost = async () => {
      try {
        const post = await api.get(`/blog/${id}`);
        setFormData({
          title: post.title,
          content: post.content
        });
        setLoading(false);
      } catch (err) {
        setError('Failed to load blog post');
        setLoading(false);
      }
    };
    
    fetchPost();
  }, [id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    const { title, content } = formData;
    
    // Basic validation
    if (!title.trim() || !content.trim()) {
      return setError('Title and content are required');
    }
    
    try {
      setSubmitting(true);
      await api.put(`/blog/${id}`, { title, content });
      navigate(`/blog/${id}`);
    } catch (err) {
      setError(err.message || 'Failed to update blog post');
      setSubmitting(false);
    }
  };

  if (loading) return <div className="loading">Loading post...</div>;

  return (
    <div className="blog-form-container">
      <h1>Edit Blog Post</h1>
      
      {error && <div className="error-message">{error}</div>}
      
      <form onSubmit={handleSubmit} className="blog-form">
        <div className="form-group">
          <label htmlFor="title">Title</label>
          <input
            type="text"
            id="title"
            name="title"
            value={formData.title}
            onChange={handleChange}
            placeholder="Enter blog title"
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="content">Content</label>
          <textarea
            id="content"
            name="content"
            value={formData.content}
            onChange={handleChange}
            placeholder="Enter blog content"
            rows="12"
            required
          />
        </div>
        
        <div className="form-buttons">
          <button
            type="button"
            onClick={() => navigate('/admin/blogs')}
            className="btn secondary"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="btn primary"
          >
            {submitting ? 'Saving...' : 'Update Post'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditBlogPost;
