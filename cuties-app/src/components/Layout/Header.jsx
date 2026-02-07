import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { getUnreadNotificationCount } from '../../lib/supabase';
import { Gift, Bell, Compass, Gear } from '@phosphor-icons/react';
import './Header.css';

const Header = () => {
  const { isAuthenticated, currentUser } = useApp();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const fetchUnreadCount = async () => {
      if (currentUser) {
        const count = await getUnreadNotificationCount(currentUser.id);
        setUnreadCount(count);
      }
    };

    fetchUnreadCount();

    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [currentUser]);

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
                <Gift size={16} weight="fill" className="nav-icon" /> Invite
              </Link>
              <Link to="/explore" className="nav-link">
                <Compass size={16} weight="duotone" className="nav-icon" /> Explore
              </Link>
              <Link to="/my-communities" className="nav-link">
                My Spaces
              </Link>
              <Link to="/profile" className="nav-link">
                My Profile
              </Link>
              <Link to="/matches" className="nav-link">
                Matches
              </Link>
              <Link to="/messages" className="nav-link">
                Messages
              </Link>
              <Link to="/notifications" className="nav-link nav-link-with-badge">
                <Bell size={16} weight="regular" className="nav-icon" />
                Notifs
                {unreadCount > 0 && (
                  <span className="notification-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
                )}
              </Link>
              <Link to="/settings" className="nav-link">
                <Gear size={16} weight="regular" className="nav-icon" />
                Settings
              </Link>
            </>
          ) : (
            <>
              <Link to="/explore" className="nav-link">
                <Compass size={16} weight="duotone" className="nav-icon" /> Explore
              </Link>
              <Link to="/signup" className="nav-link signup-btn">
                Sign up
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Header;
