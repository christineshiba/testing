import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import './Header.css';

const Header = () => {
  const { isAuthenticated, currentUser, logout } = useApp();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="header">
      <div className="header-content">
        <Link to="/" className="logo">
          cuties!
        </Link>

        <nav className="nav">
          {isAuthenticated ? (
            <>
              <Link to="/invite" className="nav-link">
                🎁 Invite friends
              </Link>
              <Link to="/directory" className="nav-link">
                Directory
              </Link>
              <Link to="/profile" className="nav-link">
                My Profile
              </Link>
              <Link to="/matches" className="nav-link">
                Matches
                <span className="notification-dot"></span>
              </Link>
              <Link to="/premium" className="nav-link">
                Premium
              </Link>
              <button onClick={handleLogout} className="nav-link">
                Log out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="nav-link">
                Login
              </Link>
              <Link to="/signup" className="nav-link">
                Sign Up
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Header;
