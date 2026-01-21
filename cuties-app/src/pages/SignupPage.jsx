import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import './AuthPages.css';

const SignupPage = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const { login } = useApp();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Mock signup - in a real app, this would create a new account
    login({
      id: 'user-new',
      name: 'New User',
      email: formData.email,
      age: 25,
      location: 'San Francisco, CA',
      bio: 'New to cuties!',
      interests: ['Music', 'Travel'],
      photos: ['https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400'],
    });
    navigate('/directory');
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-card">
          <h1 className="auth-title">Sign up to create a profile</h1>

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="johndoe@gmail.com"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                required
              />
            </div>

            <p className="auth-terms">
              By signing up you agree to our <a href="#">terms and conditions</a> and <a href="#">privacy policy</a>.
            </p>

            <button type="submit" className="auth-submit">
              Sign Up
            </button>
          </form>

          <Link to="/login" className="auth-secondary-btn">
            I already have an account
          </Link>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;
