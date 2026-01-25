import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, transformUser } from '../lib/supabase';
import { useApp } from '../context/AppContext';
import './AuthPages.css';

const AuthCallback = () => {
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { } = useApp(); // Just to trigger re-render when auth state changes

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get the session from the URL hash
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          throw sessionError;
        }

        if (!session?.user) {
          setError('No session found. Please try logging in again.');
          return;
        }

        const authUser = session.user;

        // Check if user profile exists with this auth_id
        let { data: existingProfile } = await supabase
          .from('users')
          .select('*')
          .eq('auth_id', authUser.id)
          .single();

        if (existingProfile) {
          // Already linked, go to directory
          navigate('/directory');
          return;
        }

        // Check if user profile exists with this email (existing user logging in)
        let { data: emailProfile } = await supabase
          .from('users')
          .select('*')
          .eq('email', authUser.email)
          .single();

        if (emailProfile) {
          // Link the auth_id to existing profile
          await supabase
            .from('users')
            .update({ auth_id: authUser.id })
            .eq('id', emailProfile.id);

          navigate('/directory');
          return;
        }

        // New user - check for pending signup data
        const pendingSignup = localStorage.getItem('pendingSignup');

        if (pendingSignup) {
          const { name } = JSON.parse(pendingSignup);
          localStorage.removeItem('pendingSignup');

          // Create new user profile
          const { error: insertError } = await supabase
            .from('users')
            .insert({
              name: name,
              username: name,
              email: authUser.email,
              auth_id: authUser.id,
            });

          if (insertError) {
            throw insertError;
          }

          // Go to edit profile for new users
          navigate('/profile/edit');
          return;
        }

        // No pending signup and no existing profile - create minimal profile
        const { error: insertError } = await supabase
          .from('users')
          .insert({
            name: authUser.email.split('@')[0],
            email: authUser.email,
            auth_id: authUser.id,
          });

        if (insertError) {
          throw insertError;
        }

        navigate('/profile/edit');
      } catch (err) {
        console.error('Auth callback error:', err);
        setError(err.message || 'An error occurred during login.');
      }
    };

    handleCallback();
  }, [navigate]);

  if (error) {
    return (
      <div className="auth-page">
        <div className="auth-container">
          <div className="auth-card">
            <h1 className="auth-title">Login Error</h1>
            <div className="auth-error">{error}</div>
            <button
              className="auth-submit"
              onClick={() => navigate('/login')}
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-card">
          <h1 className="auth-title">Logging you in...</h1>
          <p className="auth-message">Please wait while we complete your login.</p>
        </div>
      </div>
    </div>
  );
};

export default AuthCallback;
