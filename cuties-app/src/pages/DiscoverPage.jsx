import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';
import './DiscoverPage.css';

const DiscoverPage = () => {
  const { users, addMatch, isAuthenticated } = useApp();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [swipeDirection, setSwipeDirection] = useState(null);
  const navigate = useNavigate();

  if (!isAuthenticated) {
    navigate('/login');
    return null;
  }

  const currentUser = users[currentIndex];

  const handleSwipe = (direction) => {
    setSwipeDirection(direction);

    setTimeout(() => {
      if (direction === 'right') {
        addMatch(currentUser.id);
      }

      if (currentIndex < users.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        setCurrentIndex(0);
      }
      setSwipeDirection(null);
    }, 300);
  };

  if (!currentUser) {
    return (
      <div className="discover-page">
        <div className="no-users">
          <h2>No more users nearby</h2>
          <p>Check back later for more people to connect with!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="discover-page">
      <div className="discover-container">
        <h1 className="discover-title">Discover</h1>

        <div className={`user-card ${swipeDirection ? `swipe-${swipeDirection}` : ''}`}>
          <div className="card-image">
            <img src={currentUser.photos[0]} alt={currentUser.name} />
            <div className="card-gradient"></div>
            <div className="card-info-overlay">
              <h2>{currentUser.name}, {currentUser.age}</h2>
              <p className="location">📍 {currentUser.location}</p>
              <p className="distance">{currentUser.distance} km away</p>
            </div>
          </div>

          <div className="card-details">
            <div className="bio">
              <p>{currentUser.bio}</p>
            </div>

            <div className="interests">
              {currentUser.interests.map((interest, idx) => (
                <span key={idx} className="interest-tag">
                  {interest}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="action-buttons">
          <button
            className="action-btn dislike-btn"
            onClick={() => handleSwipe('left')}
            title="Pass"
          >
            <span className="btn-icon">✕</span>
          </button>

          <button
            className="action-btn like-btn"
            onClick={() => handleSwipe('right')}
            title="Like"
          >
            <span className="btn-icon">💕</span>
          </button>
        </div>

        <div className="card-counter">
          {currentIndex + 1} / {users.length}
        </div>
      </div>
    </div>
  );
};

export default DiscoverPage;
