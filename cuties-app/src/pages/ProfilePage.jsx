import { useApp } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';
import './ProfilePage.css';

const ProfilePage = () => {
  const { currentUser, isAuthenticated } = useApp();
  const navigate = useNavigate();

  if (!isAuthenticated || !currentUser) {
    navigate('/login');
    return null;
  }

  return (
    <div className="profile-page">
      <div className="profile-container">
        <h1 className="profile-title">Your Profile</h1>

        <div className="profile-card">
          <div className="profile-header">
            <img
              src={currentUser.photos[0]}
              alt={currentUser.name}
              className="profile-photo"
            />
            <div className="profile-basic-info">
              <h2>{currentUser.name}, {currentUser.age}</h2>
              <p className="profile-location">📍 {currentUser.location}</p>
            </div>
          </div>

          <div className="profile-section">
            <h3>About Me</h3>
            <p className="profile-bio">{currentUser.bio}</p>
          </div>

          <div className="profile-section">
            <h3>Interests</h3>
            <div className="profile-interests">
              {currentUser.interests.map((interest, idx) => (
                <span key={idx} className="profile-interest-tag">
                  {interest}
                </span>
              ))}
            </div>
          </div>

          <div className="profile-section">
            <h3>Settings</h3>
            <div className="settings-list">
              <div className="setting-item">
                <span>Discovery Radius</span>
                <span className="setting-value">10 km</span>
              </div>
              <div className="setting-item">
                <span>Age Range</span>
                <span className="setting-value">18-35</span>
              </div>
              <div className="setting-item">
                <span>Show me</span>
                <span className="setting-value">Everyone</span>
              </div>
            </div>
          </div>

          <button className="edit-profile-btn">Edit Profile</button>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
