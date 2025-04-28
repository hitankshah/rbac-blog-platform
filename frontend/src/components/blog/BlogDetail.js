import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom'; // Fixed: Added Link import
import { blogService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import './Blog.css';

const BlogDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser, isAdmin } = useAuth();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPost = async () => {
      try {
        setLoading(true);
        const response = await blogService.getPost(id);
        setPost(response.data);
      } catch (err) {
        setError('Failed to load blog post');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [id]);

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this post?')) {
      try {
        await blogService.deletePost(id);
        navigate('/blog');
      } catch (err) {
        setError('Failed to delete post');
        console.error(err);
      }
    }
  };

  if (loading) return <div className="blog-loading">Loading post...</div>;
  if (error) return <div className="blog-error">{error}</div>;
  if (!post) return <div className="blog-error">Post not found</div>;

  const isAuthorOrAdmin = 
    currentUser && (currentUser.id === post.author?.id || isAdmin);

  return (
    <div className="blog-detail-container">
      <Link to="/blog" className="back-link">← Back to all posts</Link>
      
      <article className="blog-post">
        <h1 className="blog-post-title">{post.title}</h1>
        
        <div className="blog-post-meta">
          <span>By: {post.author?.name || 'Unknown'}</span>
          <span className="blog-date">
            {new Date(post.created_at).toLocaleDateString()}
          </span>
        </div>
        
        <div className="blog-post-content">
          {post.content.split('\n').map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
        </div>
      </article>

      {isAuthorOrAdmin && (
        <div className="blog-actions">
          <Link to={`/blog/edit/${post.id}`} className="edit-button">
            Edit Post
          </Link>
          <button onClick={handleDelete} className="delete-button">
            Delete Post
          </button>
        </div>
      )}
    </div>
  );
};

export default BlogDetail;
