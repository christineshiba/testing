import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import './LandingPage.css';

const LandingPage = () => {
  const { isAuthenticated } = useApp();

  return (
    <div className="landing-page">
      <section className="hero">
        <div className="hero-content">
          <h1 className="hero-title">
            Make IRL connections
            <br />
            <span className="gradient-text">faster</span>
          </h1>
          <p className="hero-subtitle">
            Find the others within your community. Connect with people who share your interests and make real friendships.
          </p>
          <div className="hero-cta">
            {isAuthenticated ? (
              <Link to="/discover" className="cta-button cta-primary">
                Start Discovering
              </Link>
            ) : (
              <>
                <Link to="/signup" className="cta-button cta-primary">
                  Get Started
                </Link>
                <Link to="/login" className="cta-button cta-secondary">
                  Login
                </Link>
              </>
            )}
          </div>
        </div>
        <div className="hero-image">
          <div className="floating-card card-1">
            <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150" alt="User" />
            <div className="card-info">
              <h3>Alex</h3>
              <p>2 km away</p>
            </div>
          </div>
          <div className="floating-card card-2">
            <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150" alt="User" />
            <div className="card-info">
              <h3>Taylor</h3>
              <p>4 km away</p>
            </div>
          </div>
          <div className="floating-card card-3">
            <img src="https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150" alt="User" />
            <div className="card-info">
              <h3>Jordan</h3>
              <p>3 km away</p>
            </div>
          </div>
        </div>
      </section>

      <section className="features">
        <h2 className="section-title">Why Cuties?</h2>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">🎯</div>
            <h3>Location-Based</h3>
            <p>Connect with people in your area. Make plans that actually happen.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">💬</div>
            <h3>Real Conversations</h3>
            <p>Start meaningful connections with people who share your interests.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🌟</div>
            <h3>Quality Matches</h3>
            <p>Smart matching based on your interests and community.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🔒</div>
            <h3>Safe & Secure</h3>
            <p>Your privacy matters. Connect on your own terms.</p>
          </div>
        </div>
      </section>

      <section className="how-it-works">
        <h2 className="section-title">How It Works</h2>
        <div className="steps">
          <div className="step">
            <div className="step-number">1</div>
            <h3>Create Your Profile</h3>
            <p>Tell us about yourself and what you're looking for</p>
          </div>
          <div className="step">
            <div className="step-number">2</div>
            <h3>Discover People</h3>
            <p>Browse profiles of people in your community</p>
          </div>
          <div className="step">
            <div className="step-number">3</div>
            <h3>Make Connections</h3>
            <p>Match with people you like and start chatting</p>
          </div>
          <div className="step">
            <div className="step-number">4</div>
            <h3>Meet IRL</h3>
            <p>Plan to meet up and build real friendships</p>
          </div>
        </div>
      </section>

      <section className="cta-section">
        <h2>Ready to meet your community?</h2>
        <p>Join thousands of people making real connections</p>
        {!isAuthenticated && (
          <Link to="/signup" className="cta-button cta-primary">
            Start Now
          </Link>
        )}
      </section>
    </div>
  );
};

export default LandingPage;
