import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { blogService } from '../../services/api';
import './HomePage.css';

const HomePage = () => {
  const [featuredPosts, setFeaturedPosts] = useState([]);
  const [recentPosts, setRecentPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        setLoading(true);
        const response = await blogService.getPosts(1, 6);
        
        if (response.data && response.data.posts) {
          // Featured posts (first 3)
          setFeaturedPosts(response.data.posts.slice(0, 3));
          // Recent posts (next 3)
          setRecentPosts(response.data.posts.slice(3, 6));
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching posts:', err);
        setError('Failed to load blog posts');
        setLoading(false);
      }
    };

    fetchPosts();
  }, []);

  if (loading) {
    return <div className="loading-container">Loading...</div>;
  }

  if (error) {
    return <div className="error-container">{error}</div>;
  }

  return (
    <div className="home-page">
      {/* Hero Banner */}
      <section className="hero-banner">
        <div className="container">
          <div className="hero-content">
            <h1>Welcome to RBAC Blog</h1>
            <p>A place for insightful articles and meaningful discussions</p>
            <div className="hero-buttons">
              <Link to="/blog" className="btn btn-primary">Explore Articles</Link>
              <Link to="/about" className="btn btn-secondary">Learn More</Link>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Posts */}
      <section className="featured-posts">
        <div className="container">
          <div className="section-header">
            <h2>Featured Articles</h2>
            <Link to="/blog" className="view-all">View All</Link>
          </div>
          
          <div className="posts-grid">
            {featuredPosts.length > 0 ? (
              featuredPosts.map(post => (
                <div key={post.id} className="post-card featured">
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
                    <h3><Link to={`/blog/${post.id}`}>{post.title}</Link></h3>
                    <p className="post-excerpt">
                      {post.content.length > 120
                        ? `${post.content.substring(0, 120)}...`
                        : post.content}
                    </p>
                    <div className="post-meta">
                      <span className="post-author">
                        By {post.author?.name || 'Anonymous'}
                      </span>
                      <span className="post-date">
                        {new Date(post.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <Link to={`/blog/${post.id}`} className="read-more">
                      Read More
                    </Link>
                  </div>
                </div>
              ))
            ) : (
              <p className="no-posts">No featured posts available.</p>
            )}
          </div>
        </div>
      </section>

      {/* Recent Posts */}
      <section className="recent-posts">
        <div className="container">
          <div className="section-header">
            <h2>Latest Articles</h2>
          </div>
          
          <div className="posts-list">
            {recentPosts.length > 0 ? (
              recentPosts.map(post => (
                <div key={post.id} className="post-item">
                  <div className="post-content">
                    <h3><Link to={`/blog/${post.id}`}>{post.title}</Link></h3>
                    <p className="post-excerpt">
                      {post.content.length > 100
                        ? `${post.content.substring(0, 100)}...`
                        : post.content}
                    </p>
                    <div className="post-meta">
                      <span className="post-author">
                        By {post.author?.name || 'Anonymous'}
                      </span>
                      <span className="post-date">
                        {new Date(post.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="post-thumbnail">
                    {post.images && post.images.length > 0 ? (
                      <img src={post.images[0].url} alt={post.title} />
                    ) : (
                      <div className="placeholder-thumbnail">
                        <i className="fas fa-image"></i>
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="no-posts">No recent posts available.</p>
            )}
          </div>
        </div>
      </section>

      {/* Call to action */}
      <section className="cta-section">
        <div className="container">
          <div className="cta-content">
            <h2>Ready to Start Writing?</h2>
            <p>Share your thoughts and ideas with our community</p>
            <Link to="/register" className="btn btn-cta">
              Join Today
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
