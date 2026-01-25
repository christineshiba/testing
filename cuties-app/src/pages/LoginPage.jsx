import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Eye, EyeSlash } from '@phosphor-icons/react';
import './AuthPages.css';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showMagicLink, setShowMagicLink] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const navigate = useNavigate();

  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        throw authError;
      }

      // Successful login - redirect to directory
      navigate('/directory');
    } catch (err) {
      if (err.message.includes('Invalid login credentials')) {
        setError('Invalid email or password. Please try again.');
      } else {
        setError(err.message || 'An error occurred. Please try again.');
      }
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleMagicLinkLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { error: authError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: window.location.origin + '/auth/callback',
        },
      });

      if (authError) {
        throw authError;
      }

      setMagicLinkSent(true);
    } catch (err) {
      setError(err.message || 'An error occurred. Please try again.');
      console.error('Magic link error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (magicLinkSent) {
    return (
      <div className="auth-page">
        <div className="auth-container">
          <div className="auth-card">
            <h1 className="auth-title">Check your email</h1>
            <p className="auth-message">
              We sent a magic link to <strong>{email}</strong>
            </p>
            <p className="auth-message">
              Click the link in your email to log in. You can close this tab.
            </p>
            <button
              className="auth-secondary-btn"
              onClick={() => {
                setMagicLinkSent(false);
                setShowMagicLink(false);
              }}
            >
              Use a different email
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Magic link form
  if (showMagicLink) {
    return (
      <div className="auth-page">
        <div className="auth-container">
          <div className="auth-card">
            <h1 className="auth-title">Magic link login</h1>
            <p className="auth-subtitle">We'll send you a link to log in instantly</p>

            {error && <div className="auth-error">{error}</div>}

            <form onSubmit={handleMagicLinkLogin} className="auth-form">
              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                />
              </div>

              <button type="submit" className="auth-submit" disabled={loading}>
                {loading ? 'Sending...' : 'Send magic link'}
              </button>
            </form>

            <button
              className="auth-secondary-btn"
              onClick={() => setShowMagicLink(false)}
            >
              Back to password login
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Password login form (default)
  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-card">
          <h1 className="auth-title">Welcome back!</h1>
          <p className="auth-subtitle">Log in to your account</p>

          {error && <div className="auth-error">{error}</div>}

          <form onSubmit={handlePasswordLogin} className="auth-form">
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <div className="password-input-wrapper">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Your password"
                  required
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

            <button type="submit" className="auth-submit" disabled={loading}>
              {loading ? 'Logging in...' : 'Log in'}
            </button>
          </form>

          <button
            className="auth-link-btn"
            onClick={() => setShowMagicLink(true)}
          >
            Forgot password? Use magic link instead
          </button>

          <p className="auth-footer">
            New here? <Link to="/signup">Create a profile</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
