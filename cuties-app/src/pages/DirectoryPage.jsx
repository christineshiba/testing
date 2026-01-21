import { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { useNavigate, Link } from 'react-router-dom';
import './DirectoryPage.css';

const COMMUNITIES = [
  'Crypto', 'Farcaster', 'Fractal', 'FuturePARTS', 'Outdoor climbing',
  'SF Commons', 'Solarpunk', 'Vibecamp', 'Vitapets', 'Megavn'
];

const DirectoryPage = () => {
  const { users, isAuthenticated, currentUser } = useApp();
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState('newest');
  const [filters, setFilters] = useState({
    search: '',
    community: '',
    interests: '',
    location: '',
    gender: '',
    hereFor: '',
    ageMin: 18,
    ageMax: 50,
    sexuality: '',
    relationship: '',
    nomadic: '',
    kids: '',
  });
  const [showAgeSlider, setShowAgeSlider] = useState(false);
  const [ageFilterActive, setAgeFilterActive] = useState(false);
  const navigate = useNavigate();

  if (!isAuthenticated) {
    navigate('/login');
    return null;
  }

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const resetFilters = () => {
    setFilters({
      search: '',
      community: '',
      interests: '',
      location: '',
      gender: '',
      hereFor: '',
      ageMin: 18,
      ageMax: 50,
      sexuality: '',
      relationship: '',
      nomadic: '',
      kids: '',
    });
    setAgeFilterActive(false);
  };

  const filteredUsers = useMemo(() => {
    // Include current user in the directory
    const allUsers = currentUser ? [currentUser, ...users.filter(u => u.id !== currentUser.id)] : users;
    let result = [...allUsers];

    // Search filter
    if (filters.search) {
      const search = filters.search.toLowerCase();
      result = result.filter(u =>
        u.name.toLowerCase().includes(search) ||
        u.bio.toLowerCase().includes(search) ||
        u.interests?.some(i => i.toLowerCase().includes(search))
      );
    }

    // Community filter
    if (filters.community) {
      result = result.filter(u =>
        u.communities?.includes(filters.community)
      );
    }

    // Interests filter
    if (filters.interests) {
      const interest = filters.interests.toLowerCase();
      result = result.filter(u =>
        u.interests?.some(i => i.toLowerCase().includes(interest))
      );
    }

    // Location filter
    if (filters.location) {
      const location = filters.location.toLowerCase();
      result = result.filter(u =>
        u.location.toLowerCase().includes(location)
      );
    }

    // Gender filter
    if (filters.gender) {
      result = result.filter(u =>
        u.gender?.toLowerCase().includes(filters.gender.toLowerCase())
      );
    }

    // Here for filter
    if (filters.hereFor) {
      result = result.filter(u =>
        u.hereFor?.includes(filters.hereFor)
      );
    }

    // Age filter (only apply if age filter is active)
    if (ageFilterActive) {
      result = result.filter(u => u.age >= filters.ageMin && u.age <= filters.ageMax);
    }

    // Sexuality filter
    if (filters.sexuality) {
      result = result.filter(u => u.sexuality === filters.sexuality);
    }

    // Relationship style filter
    if (filters.relationship) {
      result = result.filter(u => u.relationship === filters.relationship);
    }

    // Nomadic filter
    if (filters.nomadic) {
      result = result.filter(u => u.nomadic === filters.nomadic);
    }

    // Kids filter
    if (filters.kids) {
      result = result.filter(u => u.kids === filters.kids);
    }

    // Sorting
    switch (sortBy) {
      case 'newest':
        result = result.sort((a, b) => b.id - a.id);
        break;
      case 'active':
        result = result.sort((a, b) => (b.projects?.length || 0) - (a.projects?.length || 0));
        break;
      case 'nearby':
        result = result.sort((a, b) => a.distance - b.distance);
        break;
      default:
        break;
    }

    return result;
  }, [users, currentUser, filters, sortBy, ageFilterActive]);

  return (
    <div className="directory-page">
      <div className="directory-container">
        <h1 className="directory-title">cuties! directory</h1>
        <p className="directory-subtitle">
          Make IRL connections faster. Find the others within your existing community.
        </p>

        {/* Quick Filter Pills */}
        <div className="filter-pills">
          <select
            className={`filter-pill ${filters.gender ? 'active' : ''}`}
            value={filters.gender}
            onChange={(e) => handleFilterChange('gender', e.target.value)}
          >
            <option value="">Gender</option>
            <option value="She / Her">She / Her</option>
            <option value="He / Him">He / Him</option>
            <option value="They / Them">They / Them</option>
          </select>

          <select
            className={`filter-pill ${filters.location ? 'active' : ''}`}
            value={filters.location}
            onChange={(e) => handleFilterChange('location', e.target.value)}
          >
            <option value="">Location</option>
            <option value="San Francisco">San Francisco</option>
            <option value="Oakland">Oakland</option>
            <option value="Berkeley">Berkeley</option>
            <option value="Palo Alto">Palo Alto</option>
            <option value="Santa Cruz">Santa Cruz</option>
          </select>

          <select
            className={`filter-pill ${filters.hereFor ? 'active' : ''}`}
            value={filters.hereFor}
            onChange={(e) => handleFilterChange('hereFor', e.target.value)}
          >
            <option value="">Here for</option>
            <option value="Love">Love</option>
            <option value="Friends">Friends</option>
            <option value="Collaboration">Collaboration</option>
          </select>

          <div className="age-filter-wrapper">
            <button
              className={`filter-pill ${ageFilterActive ? 'active' : ''}`}
              onClick={() => setShowAgeSlider(!showAgeSlider)}
            >
              {ageFilterActive ? `${filters.ageMin} - ${filters.ageMax}` : 'Age'}
            </button>
            {showAgeSlider && (
              <div className="age-slider-dropdown">
                <div className="age-slider-header">
                  <span>Age Range</span>
                  <span className="age-range-value">{filters.ageMin} - {filters.ageMax}</span>
                </div>
                <div className="age-slider-container">
                  <input
                    type="range"
                    min="18"
                    max="65"
                    value={filters.ageMin}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      if (val < filters.ageMax) {
                        handleFilterChange('ageMin', val);
                      }
                    }}
                    className="age-slider age-slider-min"
                  />
                  <input
                    type="range"
                    min="18"
                    max="65"
                    value={filters.ageMax}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      if (val > filters.ageMin) {
                        handleFilterChange('ageMax', val);
                      }
                    }}
                    className="age-slider age-slider-max"
                  />
                  <div
                    className="age-slider-track"
                    style={{
                      left: `${((filters.ageMin - 18) / 47) * 100}%`,
                      width: `${((filters.ageMax - filters.ageMin) / 47) * 100}%`
                    }}
                  />
                </div>
                <div className="age-slider-labels">
                  <span>18</span>
                  <span>65+</span>
                </div>
                <div className="age-slider-actions">
                  <button
                    className="age-clear-btn"
                    onClick={() => {
                      setAgeFilterActive(false);
                      setShowAgeSlider(false);
                    }}
                  >
                    Clear
                  </button>
                  <button
                    className="age-apply-btn"
                    onClick={() => {
                      setAgeFilterActive(true);
                      setShowAgeSlider(false);
                    }}
                  >
                    Apply
                  </button>
                </div>
              </div>
            )}
          </div>

          <button
            className="filter-pill more-filters"
            onClick={() => setShowFilters(true)}
          >
            More filters
          </button>

          {(filters.gender || filters.location || filters.hereFor || ageFilterActive || filters.search || filters.community || filters.interests || filters.sexuality || filters.relationship || filters.nomadic || filters.kids) && (
            <button className="clear-filters" onClick={resetFilters}>
              Clear all
            </button>
          )}
        </div>

        <div className="directory-grid">
          {filteredUsers.map((user) => (
            <Link
              key={user.id}
              to={user.id === currentUser?.id ? '/profile' : `/user/${user.id}`}
              className="directory-card"
            >
              <div className="profile-image">
                <img src={user.photos[0]} alt={user.name} />
              </div>
              <div className="profile-content">
                <h3 className="profile-name">{user.name}</h3>
                <p className="profile-bio">{user.bio}</p>

                <div className="profile-badges">
                  {user.hereFor?.includes('Love') && <span className="badge love">Love</span>}
                  {user.hereFor?.includes('Friends') && <span className="badge friends">Friends</span>}
                  {user.hereFor?.includes('Collaboration') && <span className="badge collab">Collab</span>}
                </div>

                <div className="profile-meta">
                  <p>{user.age} • {user.gender} • {user.location}</p>
                  {user.interests && (
                    <p className="profile-interests">
                      {user.interests.slice(0, 3).join(', ')}
                    </p>
                  )}
                </div>

                {user.communities && (
                  <div className="profile-communities">
                    {user.communities.slice(0, 2).map((c, idx) => (
                      <span key={idx} className="community-tag">{c}</span>
                    ))}
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>

        {filteredUsers.length === 0 && (
          <div className="no-results">
            <p>No profiles match your filters. Try adjusting your search.</p>
            <button onClick={resetFilters}>Reset Filters</button>
          </div>
        )}
      </div>

      {showFilters && (
        <div className="filters-modal-overlay" onClick={() => setShowFilters(false)}>
          <div className="filters-modal" onClick={(e) => e.stopPropagation()}>
            <div className="filters-header">
              <h2>Advanced Filters</h2>
              <button onClick={() => setShowFilters(false)}>×</button>
            </div>

            <div className="filter-group">
              <label>Search</label>
              <input
                type="text"
                placeholder="Search names, bios, interests..."
                className="filter-input"
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
              />
            </div>

            <div className="filter-group">
              <label>Community</label>
              <select
                className="filter-input"
                value={filters.community}
                onChange={(e) => handleFilterChange('community', e.target.value)}
              >
                <option value="">All Communities</option>
                {COMMUNITIES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label>Interests</label>
              <input
                type="text"
                placeholder="e.g. Music, Art, Tech..."
                className="filter-input"
                value={filters.interests}
                onChange={(e) => handleFilterChange('interests', e.target.value)}
              />
            </div>

            <button className="apply-filters-btn" onClick={() => setShowFilters(false)}>
              Apply Filters
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DirectoryPage;
