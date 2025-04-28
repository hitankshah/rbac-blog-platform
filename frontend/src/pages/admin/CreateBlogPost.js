import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import './BlogForm.css';

const CreateBlogPost = () => {
  const [formData, setFormData] = useState({
    title: '',
    content: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

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
      setLoading(true);
      const response = await api.post('/blog', { title, content });
      navigate(`/blog/${response.id}`);
    } catch (err) {
      setError(err.message || 'Failed to create blog post');
      setLoading(false);
    }
  };

  return (
    <div className="blog-form-container">
      <h1>Create New Blog Post</h1>
      
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
            disabled={loading}
            className="btn primary"
          >
            {loading ? 'Creating...' : 'Create Post'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateBlogPost;
