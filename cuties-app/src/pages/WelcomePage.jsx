import { useSearchParams, Link } from 'react-router-dom';
import { Heart, Sparkle, UsersThree } from '@phosphor-icons/react';
import './WelcomePage.css';

const WelcomePage = () => {
  const [searchParams] = useSearchParams();
  const inviterName = searchParams.get('from') || 'A friend';
  const community = searchParams.get('community');

  return (
    <div className="welcome-page">
      <div className="welcome-container">
        <div className="welcome-sparkles">
          <Sparkle size={24} weight="fill" className="sparkle sparkle-1" />
          <Sparkle size={20} weight="fill" className="sparkle sparkle-2" />
          <Sparkle size={16} weight="fill" className="sparkle sparkle-3" />
        </div>

        <div className="welcome-card">
          <div className="welcome-icon">
            {community ? (
              <UsersThree size={48} weight="duotone" />
            ) : (
              <Heart size={48} weight="duotone" />
            )}
          </div>

          <h1 className="welcome-title">
            {community ? (
              <>Welcome to {community}!</>
            ) : (
              <>Welcome to cuties!</>
            )}
          </h1>

          <p className="welcome-invite-text">
            <strong>{inviterName}</strong> invited you to join
            {community ? (
              <> the <strong>{community}</strong> community on cuties</>
            ) : (
              <> cuties</>
            )}
          </p>

          <div className="welcome-description">
            {community ? (
              <p>
                cuties is where interesting people connect. Join the {community} community
                to meet like-minded folks and make meaningful connections.
              </p>
            ) : (
              <p>
                cuties is a community-driven platform where interesting people connect.
                Browse profiles, find your people, and make meaningful connections.
              </p>
            )}
          </div>

          <div className="welcome-features">
            <div className="feature">
              <span className="feature-icon">1</span>
              <span>Create your profile</span>
            </div>
            <div className="feature">
              <span className="feature-icon">2</span>
              <span>Browse the directory</span>
            </div>
            <div className="feature">
              <span className="feature-icon">3</span>
              <span>Connect with your community</span>
            </div>
          </div>

          <Link to="/signup" className="welcome-cta">
            Join cuties
          </Link>

          <p className="welcome-login-link">
            Already have an account? <Link to="/login">Log in</Link>
          </p>
        </div>

        <div className="welcome-footer">
          <p>cuties - where interesting people meet</p>
        </div>
      </div>
    </div>
  );
};

export default WelcomePage;
