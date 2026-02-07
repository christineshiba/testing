import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase, joinMainCommunity } from '../lib/supabase';
import { useApp } from '../context/AppContext';
import { Eye, EyeSlash } from '@phosphor-icons/react';
import './AuthPages.css';

const AuthCallback = () => {
  const [error, setError] = useState('');
  const [isRecovery, setIsRecovery] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [passwordUpdated, setPasswordUpdated] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const _appContext = useApp(); // Just to trigger re-render when auth state changes

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Check if this is a password recovery flow
        const type = searchParams.get('type');

        // Get the session from the URL hash
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (type === 'recovery' && session) {
          setIsRecovery(true);
          return;
        }

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
          const { data: newUser, error: insertError } = await supabase
            .from('users')
            .insert({
              name: name,
              username: name,
              email: authUser.email,
              auth_id: authUser.id,
            })
            .select()
            .single();

          if (insertError) {
            throw insertError;
          }

          // Auto-join the main community
          if (newUser) {
            await joinMainCommunity(newUser.id);
          }

          // Go to edit profile for new users
          navigate('/profile/edit');
          return;
        }

        // No pending signup and no existing profile - create minimal profile
        const { data: newUser, error: insertError } = await supabase
          .from('users')
          .insert({
            name: authUser.email.split('@')[0],
            email: authUser.email,
            auth_id: authUser.id,
          })
          .select()
          .single();

        if (insertError) {
          throw insertError;
        }

        // Auto-join the main community
        if (newUser) {
          await joinMainCommunity(newUser.id);
        }

        navigate('/profile/edit');
      } catch (err) {
        console.error('Auth callback error:', err);
        setError(err.message || 'An error occurred during login.');
      }
    };

    handleCallback();
  }, [navigate, searchParams]);

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        throw updateError;
      }

      setPasswordUpdated(true);
    } catch (err) {
      setError(err.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  // Password updated successfully
  if (passwordUpdated) {
    return (
      <div className="auth-page">
        <div className="auth-container">
          <div className="auth-card">
            <h1 className="auth-title">Password updated</h1>
            <p className="auth-message">Your password has been successfully updated.</p>
            <button
              className="auth-submit"
              onClick={() => navigate('/directory')}
            >
              Continue to app
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Password recovery form
  if (isRecovery) {
    return (
      <div className="auth-page">
        <div className="auth-container">
          <div className="auth-card">
            <h1 className="auth-title">Set new password</h1>
            <p className="auth-subtitle">Enter your new password below</p>

            {error && <div className="auth-error">{error}</div>}

            <form onSubmit={handlePasswordUpdate} className="auth-form">
              <div className="form-group">
                <label htmlFor="newPassword">New password</label>
                <div className="password-input-wrapper">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="newPassword"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeSlash size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="confirmPassword">Confirm password</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  required
                />
              </div>

              <button type="submit" className="auth-submit" disabled={loading}>
                {loading ? 'Updating...' : 'Update password'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

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
