import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabaseClient';

export default function AuthCallback() {
  const [message, setMessage] = useState('Processing verification...');
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Handle the OAuth or email confirmation redirect
    const handleEmailConfirmation = async () => {
      try {
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');

        if (accessToken && refreshToken) {
          // Set the tokens in Supabase
          await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          });

          setMessage('Email verified successfully!');
          
          // Redirect after a short delay
          setTimeout(() => {
            navigate('/login?verified=true');
          }, 2000);
        } else {
          setError('No verification tokens found in URL');
        }
      } catch (err) {
        console.error('Verification error:', err);
        setError(`Verification failed: ${err.message}`);
      }
    };

    handleEmailConfirmation();
  }, [navigate]);

  return (
    <div className="auth-callback-container">
      <div className="auth-callback-box">
        {error ? (
          <div className="error-message">{error}</div>
        ) : (
          <div className="success-message">{message}</div>
        )}
      </div>
    </div>
  );
}
