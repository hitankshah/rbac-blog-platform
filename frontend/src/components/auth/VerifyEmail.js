import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../services/api';  // Use this import instead if needed
import './Auth.css';

const VerifyEmail = () => {
  const [status, setStatus] = useState('verifying'); // 'verifying', 'success', 'error'
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const handleVerification = async () => {
      // Get hash from URL (Supabase adds hash parameters when redirecting back)
      const hash = window.location.hash;
      
      if (!hash) {
        setStatus('error');
        setMessage('No verification parameters found');
        return;
      }

      try {
        // Process the hash parameters that Supabase includes in the verification URL
        setStatus('verifying');
        setMessage('Confirming your email...');
        
        // The hash will automatically be processed by Supabase Auth
        const { error } = await authService.auth.refreshSession();
        
        if (error) {
          console.error('Verification error:', error);
          setStatus('error');
          setMessage(error.message || 'Verification failed. Invalid or expired link.');
          return;
        }

        setStatus('success');
        setMessage('Email verified successfully! You can now login.');
        
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      } catch (err) {
        console.error('Error during verification:', err);
        setStatus('error');
        setMessage('Verification failed. Please try again.');
      }
    };

    handleVerification();
  }, [navigate]);

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2 className="auth-title">Email Verification</h2>
        
        {status === 'verifying' && (
          <div className="verification-status">
            <p>{message || 'Verifying your email address...'}</p>
            <div className="loader"></div>
          </div>
        )}
        
        {status === 'success' && (
          <div className="verification-status success">
            <p>{message}</p>
            <button onClick={() => navigate('/login')} className="auth-button">
              Proceed to Login
            </button>
          </div>
        )}
        
        {status === 'error' && (
          <div className="verification-status error">
            <p>{message}</p>
            <button onClick={() => navigate('/login')} className="auth-button">
              Back to Login
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default VerifyEmail;
