import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api, { blogService } from '../../services/api';
import './BlogForm.css';

const EditBlogPost = () => {
  const { id } = useParams();
  const [formData, setFormData] = useState({
    title: '',
    content: ''
  });
  // State for handling existing images from the post
  const [existingImages, setExistingImages] = useState([]);
  // State for handling new images to upload
  const [newImages, setNewImages] = useState([]);
  const [previewImages, setPreviewImages] = useState([]);
  // State for tracking images to delete
  const [imagesToDelete, setImagesToDelete] = useState([]);
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPost = async () => {
      try {
        const response = await blogService.getPost(id);
        const post = response.data;
        
        setFormData({
          title: post.title,
          content: post.content
        });
        
        // Set existing images if they exist
        if (post.images && Array.isArray(post.images)) {
          setExistingImages(post.images);
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching post:', err);
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

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    setNewImages(prev => [...prev, ...files]);
    
    // Create preview URLs for new images
    const newPreviewImages = files.map(file => ({
      id: `new_${Math.random().toString(36).substring(2)}`,
      url: URL.createObjectURL(file),
      name: file.name,
      size: file.size,
      isNew: true
    }));
    
    setPreviewImages(prev => [...prev, ...newPreviewImages]);
  };

  const removeExistingImage = (imageId) => {
    // Mark the image for deletion on the server
    setImagesToDelete(prev => [...prev, imageId]);
    // Remove from UI
    setExistingImages(prev => prev.filter(img => img.id !== imageId));
  };

  const removeNewImage = (id) => {
    const imageIndex = previewImages.findIndex(img => img.id === id);
    if (imageIndex === -1) return;
    
    // Release the object URL to avoid memory leaks
    URL.revokeObjectURL(previewImages[imageIndex].url);
    
    // Remove from preview and file arrays
    const newPreviewImagesArray = previewImages.filter(img => img.id !== id);
    setPreviewImages(newPreviewImagesArray);
    
    // Find the index in the newImages array 
    // (Note: This assumes the order matches between previewImages and newImages)
    const fileIndex = previewImages.findIndex(img => img.id === id) - existingImages.length;
    if (fileIndex >= 0) {
      const updatedNewImages = [...newImages];
      updatedNewImages.splice(fileIndex, 1);
      setNewImages(updatedNewImages);
    }
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
      
      // Create FormData for multipart/form-data request
      const formDataObj = new FormData();
      formDataObj.append('title', title);
      formDataObj.append('content', content);
      
      // Add images to delete
      if (imagesToDelete.length > 0) {
        formDataObj.append('imagesToDelete', JSON.stringify(imagesToDelete));
      }
      
      // Add new images
      newImages.forEach(image => {
        formDataObj.append('images', image);
      });
      
      // Send the update request using blogService
      await blogService.updatePost(id, formDataObj);
      
      navigate(`/blog/${id}`);
    } catch (err) {
      console.error('Error updating post:', err);
      setError(err.response?.data?.message || 'Failed to update blog post');
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
              <i className="fas fa-cloud-upload-alt"></i> Add More Images
            </button>
            
            {/* Display existing images */}
            {existingImages.length > 0 && (
              <div className="existing-images">
                <h4>Current Images</h4>
                <div className="image-preview-container">
                  {existingImages.map((img) => (
                    <div key={img.id} className="image-preview">
                      <img 
                        src={img.url} 
                        alt={img.file_name || 'Post image'} 
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = 'https://via.placeholder.com/150x150?text=Image+Error';
                        }}
                      />
                      <div className="image-info">
                        <div className="image-name">{img.file_name || 'Image'}</div>
                      </div>
                      <button
                        type="button"
                        className="remove-image-btn"
                        onClick={() => removeExistingImage(img.id)}
                      >
                        <i className="fas fa-times"></i>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Display new images to be uploaded */}
            {previewImages.length > 0 && (
              <div className="new-images">
                <h4>New Images to Upload</h4>
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
                        onClick={() => removeNewImage(img.id)}
                      >
                        <i className="fas fa-times"></i>
                      </button>
                    </div>
                  ))}
                </div>
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
            disabled={submitting}
            className="btn primary"
          >
            {submitting ? (
              <><i className="fas fa-spinner fa-spin"></i> Saving...</>
            ) : (
              <>Update Post</>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditBlogPost;
