import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { blogService } from '../../services/api';
import './BlogForm.css';

const CreateBlogPost = () => {
  const [formData, setFormData] = useState({
    title: '',
    content: ''
  });
  const [images, setImages] = useState([]);
  const [previewImages, setPreviewImages] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    setImages(prev => [...prev, ...files]);
    
    // Create preview URLs for the images
    const newPreviewImages = files.map(file => ({
      id: Math.random().toString(36).substring(2),
      url: URL.createObjectURL(file),
      name: file.name,
      size: file.size
    }));
    
    setPreviewImages(prev => [...prev, ...newPreviewImages]);
  };

  const removeImage = (id) => {
    const imageIndex = previewImages.findIndex(img => img.id === id);
    if (imageIndex === -1) return;
    
    // Release the object URL to avoid memory leaks
    URL.revokeObjectURL(previewImages[imageIndex].url);
    
    // Remove from preview and file arrays
    setPreviewImages(previewImages.filter(img => img.id !== id));
    setImages(prevImages => {
      const newImages = [...prevImages];
      newImages.splice(imageIndex, 1);
      return newImages;
    });
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
      
      // Create FormData for multipart/form-data request
      const formDataObj = new FormData();
      formDataObj.append('title', title);
      formDataObj.append('content', content);
      
      // Add images if any
      images.forEach(image => {
        formDataObj.append('images', image);
      });
      
      // Use blogService instead of direct api call
      const response = await blogService.createPost(formDataObj);
      
      // Navigate to the new post
      navigate(`/blog/${response.data.id}`);
    } catch (err) {
      console.error('Error creating post:', err);
      setError(err.response?.data?.message || 'Failed to create blog post');
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
        
        <div className="form-group">
          <label>Images</label>
          <div className="image-upload-container">
            <input
              type="file"
              id="images"
              name="images"
              onChange={handleImageChange}
              multiple
              accept="image/*"
              ref={fileInputRef}
              style={{ display: 'none' }}
            />
            <button
              type="button"
              className="upload-btn"
              onClick={() => fileInputRef.current.click()}
            >
              <i className="fas fa-cloud-upload-alt"></i> Add Images
            </button>
            
            {previewImages.length > 0 && (
              <div className="image-preview-container">
                {previewImages.map((img) => (
                  <div key={img.id} className="image-preview">
                    <img src={img.url} alt={img.name} />
                    <div className="image-info">
                      <div className="image-name">{img.name}</div>
                      <div className="image-size">{(img.size / 1024).toFixed(1)} KB</div>
                    </div>
                    <button
                      type="button"
                      className="remove-image-btn"
                      onClick={() => removeImage(img.id)}
                    >
                      <i className="fas fa-times"></i>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
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
            {loading ? (
              <><i className="fas fa-spinner fa-spin"></i> Creating...</>
            ) : (
              <>Create Post</>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateBlogPost;
