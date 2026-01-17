import { useApp } from '../context/AppContext';
import { useNavigate, Link } from 'react-router-dom';
import './MatchesPage.css';

const MatchesPage = () => {
  const { getMatchedUsers, isAuthenticated } = useApp();
  const navigate = useNavigate();

  if (!isAuthenticated) {
    navigate('/login');
    return null;
  }

  const matchedUsers = getMatchedUsers();

  return (
    <div className="matches-page">
      <div className="matches-container">
        <h1 className="matches-title">Your Matches</h1>

        {matchedUsers.length === 0 ? (
          <div className="no-matches">
            <div className="no-matches-icon">💕</div>
            <h2>No matches yet</h2>
            <p>Start swiping to find your community!</p>
            <Link to="/discover" className="discover-link">
              Go to Discover
            </Link>
          </div>
        ) : (
          <div className="matches-grid">
            {matchedUsers.map((user) => (
              <Link
                key={user.id}
                to={`/chat/${user.id}`}
                className="match-card"
              >
                <div className="match-image">
                  <img src={user.photos[0]} alt={user.name} />
                  <div className="match-overlay">
                    <span className="chat-icon">💬</span>
                  </div>
                </div>
                <div className="match-info">
                  <h3>{user.name}</h3>
                  <p>{user.distance} km away</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MatchesPage;
