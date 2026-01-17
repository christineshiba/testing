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
          <span className="logo-text">cuties</span>
          <span className="logo-emoji">💕</span>
        </Link>

        <nav className="nav">
          {isAuthenticated ? (
            <>
              <Link to="/discover" className="nav-link">
                Discover
              </Link>
              <Link to="/matches" className="nav-link">
                Matches
              </Link>
              <Link to="/profile" className="nav-link">
                Profile
              </Link>
              <button onClick={handleLogout} className="nav-link logout-btn">
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="nav-link">
                Login
              </Link>
              <Link to="/signup" className="btn-primary">
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
