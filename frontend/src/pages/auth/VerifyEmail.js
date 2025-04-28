import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './Auth.css';

const VerifyEmail = () => {
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [verified, setVerified] = useState(false);
  const { verifyEmail } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleVerify = useCallback(async (verificationToken = token) => {
    if (!verificationToken) {
      return setError('Please enter the verification token');
    }
    
    try {
      setLoading(true);
      await verifyEmail(verificationToken);
      setVerified(true);
    } catch (err) {
      setError(err.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  }, [token, verifyEmail]);

  useEffect(() => {
    // Check for token in the URL query parameters
    const queryParams = new URLSearchParams(location.search);
    const tokenFromUrl = queryParams.get('token');
    
    if (tokenFromUrl) {
      setToken(tokenFromUrl);
      handleVerify(tokenFromUrl);
    }
  }, [location.search, handleVerify]);

  const handleChange = (e) => {
    setToken(e.target.value);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    handleVerify();
  };

  if (verified) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <h2>Email Verified!</h2>
          <p>Your account has been successfully verified.</p>
          <button 
            onClick={() => navigate('/login')} 
            className="auth-button"
          >
            Proceed to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Verify Your Email</h2>
        <p>Please enter the verification code sent to your email</p>
        
        {error && <div className="auth-error">{error}</div>}
        
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="token">Verification Token</label>
            <input
              type="text"
              id="token"
              value={token}
              onChange={handleChange}
              placeholder="Enter verification token"
              required
            />
          </div>
          
          <button 
            type="submit" 
            className="auth-button" 
            disabled={loading}
          >
            {loading ? 'Verifying...' : 'Verify Email'}
          </button>
        </form>
        
        <div className="auth-links">
          <Link to="/login">Back to Login</Link>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;
