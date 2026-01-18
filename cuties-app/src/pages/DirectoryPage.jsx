import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useNavigate, Link } from 'react-router-dom';
import './DirectoryPage.css';

const DirectoryPage = () => {
  const { users, isAuthenticated } = useApp();
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState('newest');
  const navigate = useNavigate();

  if (!isAuthenticated) {
    navigate('/login');
    return null;
  }

  return (
    <div className="directory-page">
      <div className="directory-container">
        <h1 className="directory-title">cuties! directory</h1>
        <p className="directory-subtitle">
          Make IRL connections faster. Find the others within your existing community.
        </p>

        <div className="directory-controls">
          <button
            className="filters-button"
            onClick={() => setShowFilters(!showFilters)}
          >
            ⚙️ Filters
          </button>
          <button className="reset-button">Reset</button>
          <div className="sort-select">
            <label>Sort by</label>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="newest">Newest</option>
              <option value="active">Most Active</option>
              <option value="nearby">Nearby</option>
            </select>
          </div>
        </div>

        <div className="directory-grid">
          {users.map((user) => (
            <Link
              key={user.id}
              to={`/user/${user.id}`}
              className="profile-card"
            >
              <div className="profile-image">
                <img src={user.photos[0]} alt={user.name} />
              </div>
              <div className="profile-content">
                <h3 className="profile-name">{user.name}</h3>
                <p className="profile-bio">{user.bio}</p>

                <div className="profile-badges">
                  <span className="badge">💕 Love</span>
                  <span className="badge">👥 Friends</span>
                  <span className="badge">🤝 Collab</span>
                </div>

                <div className="profile-meta">
                  <p>{user.age} • {user.gender || 'Non-binary'} • {user.location}</p>
                  {user.interests && (
                    <p className="profile-interests">
                      {user.interests.slice(0, 3).join(', ')}
                    </p>
                  )}
                </div>

                {user.mutualFriends && (
                  <div className="mutual-friends">
                    {user.mutualFriends.map((friend, idx) => (
                      <img
                        key={idx}
                        src={friend.photo}
                        alt={friend.name}
                        className="mutual-avatar"
                      />
                    ))}
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>

      {showFilters && (
        <div className="filters-modal-overlay" onClick={() => setShowFilters(false)}>
          <div className="filters-modal" onClick={(e) => e.stopPropagation()}>
            <div className="filters-header">
              <h2>Filters</h2>
              <button onClick={() => setShowFilters(false)}>✕</button>
            </div>
            <p className="filters-note">Search filters save automatically.</p>

            <div className="filter-group">
              <input type="text" placeholder="Search..." className="filter-input" />
            </div>

            <div className="filter-group">
              <select className="filter-input">
                <option>Communities</option>
              </select>
            </div>

            <div className="filter-group">
              <input type="text" placeholder="Interests" className="filter-input" />
            </div>

            <div className="filter-group">
              <input type="text" placeholder="Location" className="filter-input" />
            </div>

            <div className="filter-group">
              <input type="text" placeholder="Gender" className="filter-input" />
            </div>

            <div className="filter-group">
              <input type="text" placeholder="Sexuality" className="filter-input" />
            </div>

            <div className="filter-group">
              <input type="text" placeholder="Mono/Poly" className="filter-input" />
            </div>

            <div className="filter-group">
              <input type="text" placeholder="Nomadic" className="filter-input" />
            </div>

            <div className="filter-group">
              <input type="text" placeholder="Kids" className="filter-input" />
            </div>

            <div className="filter-group">
              <input type="text" placeholder="Age" className="filter-input" />
            </div>

            <div className="filter-group">
              <select className="filter-input">
                <option>Here for</option>
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DirectoryPage;
