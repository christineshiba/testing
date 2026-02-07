import { useState, useMemo, useEffect, useRef, memo } from 'react';
import { useApp } from '../context/AppContext';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { fetchVouchersForUsers, fetchAllCommunities } from '../lib/supabase';
import { initPlacesAutocomplete } from '../lib/geo';
import { MagnifyingGlass, X, Sliders } from '@phosphor-icons/react';
import { PageLoading, SkeletonCard, Spinner } from '../components/Loading';
import './DirectoryPage.css';

// Calculate distance between two coordinates (Haversine formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 3959; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

const DirectoryPage = () => {
  const { users, isAuthenticated, currentUser, usersLoading, hasMore, loadMoreUsers, searchUsers, refreshUsers, loading } = useApp();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState('newest');
  const [filters, setFilters] = useState({
    search: '',
    community: '',
    interests: searchParams.get('interest') || '',
    location: '',
    locationRadius: 25,
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
  const [showLocationFilter, setShowLocationFilter] = useState(false);
  const [locationFilterActive, setLocationFilterActive] = useState(false);
  const [tempLocation, setTempLocation] = useState('');
  const [tempRadius, setTempRadius] = useState(25);
  const [selectedCoords, setSelectedCoords] = useState(null);
  const [tempCoords, setTempCoords] = useState(null);
  const [mapsReady, setMapsReady] = useState(false);
  const [userCoords, setUserCoords] = useState({});
  const locationInputRef = useRef(null);
  const [userVouchers, setUserVouchers] = useState({});
  const [communities, setCommunities] = useState([]);
  const navigate = useNavigate();
  const searchTimeoutRef = useRef(null);
  const lastSearchRef = useRef('');
  const initialLoadDone = useRef(false);

  // Fetch all communities from database on mount
  useEffect(() => {
    const loadCommunities = async () => {
      const allCommunities = await fetchAllCommunities();
      setCommunities(allCommunities);
    };
    loadCommunities();
  }, []);

  // Debounced search - triggers API call when user stops typing
  // Combines text search and interests filter for server-side searching
  useEffect(() => {
    const searchTerm = filters.search || filters.interests;

    // Skip if search hasn't actually changed
    if (searchTerm === lastSearchRef.current && initialLoadDone.current) {
      return;
    }

    // Clear any existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // If search is empty and we had a previous search, refresh to get default users
    if (!searchTerm) {
      if (lastSearchRef.current !== '' || !initialLoadDone.current) {
        lastSearchRef.current = '';
        initialLoadDone.current = true;
        refreshUsers();
      }
      return;
    }

    // Debounce the search by 300ms
    searchTimeoutRef.current = setTimeout(() => {
      lastSearchRef.current = searchTerm;
      searchUsers(searchTerm);
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [filters.search, filters.interests, searchUsers, refreshUsers]);

  // Fetch vouchers for displayed users
  useEffect(() => {
    const loadVouchers = async () => {
      if (users.length === 0) return;
      const userIds = users.map(u => u.id);
      if (currentUser) userIds.push(currentUser.id);
      const vouchers = await fetchVouchersForUsers(userIds);
      setUserVouchers(vouchers);
    };
    loadVouchers();
  }, [users, currentUser]);

  // Check if Google Maps is ready
  useEffect(() => {
    if (window.googleMapsReady) {
      setMapsReady(true);
    } else {
      const handleMapsReady = () => setMapsReady(true);
      window.addEventListener('google-maps-ready', handleMapsReady);
      return () => window.removeEventListener('google-maps-ready', handleMapsReady);
    }
  }, []);

  // Track autocomplete instance
  const autocompleteRef = useRef(null);

  // Initialize Places Autocomplete when location filter opens
  useEffect(() => {
    if (showLocationFilter && locationInputRef.current && mapsReady) {
      locationInputRef.current.value = tempLocation || '';
      locationInputRef.current.focus();

      // Initialize autocomplete if not already done
      if (!autocompleteRef.current) {
        autocompleteRef.current = initPlacesAutocomplete(
          locationInputRef.current,
          (place) => {
            setTempLocation(place.formattedAddress || place.name);
            setTempCoords({ lat: place.lat, lng: place.lng });
          }
        );
      }
    }
  }, [showLocationFilter, mapsReady]);

  // Geocode user locations for distance filtering
  const geocodedUsers = useRef(new Set());
  const geocodingBatch = useRef(null);

  // Clear geocoding cache when location filter changes
  useEffect(() => {
    if (!locationFilterActive) {
      geocodedUsers.current.clear();
      setUserCoords({});
    }
  }, [locationFilterActive]);

  useEffect(() => {
    if (!locationFilterActive || !selectedCoords || !mapsReady || !window.google?.maps) return;

    const geocoder = new window.google.maps.Geocoder();
    const usersToGeocode = users.filter(u =>
      u.location && !geocodedUsers.current.has(u.id)
    );

    if (usersToGeocode.length === 0) return;

    // Cancel any pending batch
    if (geocodingBatch.current) {
      clearTimeout(geocodingBatch.current);
    }

    // Debounce the geocoding
    geocodingBatch.current = setTimeout(() => {
      const results = {};
      let completed = 0;
      const batch = usersToGeocode.slice(0, 20);

      // Mark all as being processed
      batch.forEach(u => geocodedUsers.current.add(u.id));

      batch.forEach((user, index) => {
        setTimeout(() => {
          geocoder.geocode({ address: user.location }, (geoResults, status) => {
            if (status === 'OK' && geoResults[0]) {
              results[user.id] = {
                lat: geoResults[0].geometry.location.lat(),
                lng: geoResults[0].geometry.location.lng(),
              };
            } else {
              results[user.id] = null;
            }

            completed++;

            // Update state once all in batch are done
            if (completed === batch.length) {
              setUserCoords(prev => ({ ...prev, ...results }));
            }
          });
        }, index * 100);
      });
    }, 300);

    return () => {
      if (geocodingBatch.current) {
        clearTimeout(geocodingBatch.current);
      }
    };
  }, [users, locationFilterActive, selectedCoords, mapsReady]);

  // Wait for session check to complete
  if (loading) {
    return (
      <div className="directory-page">
        <PageLoading message="Loading directory..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    navigate('/login');
    return null;
  }

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    // Update URL params for interest filter
    if (field === 'interests') {
      if (value) {
        setSearchParams({ interest: value });
      } else {
        setSearchParams({});
      }
    }
  };

  const resetFilters = () => {
    setFilters({
      search: '',
      community: '',
      interests: '',
      location: '',
      locationRadius: 25,
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
    setLocationFilterActive(false);
    setTempLocation('');
    setTempRadius(25);
    setSelectedCoords(null);
    setTempCoords(null);
    setSearchParams({});
  };

  const filteredUsers = useMemo(() => {
    // Include current user in the directory (only if not searching)
    // Use a Map to ensure unique users by ID (handles string/number type mismatches)
    const userMap = new Map();

    // Add current user first if logged in and not searching
    if (currentUser && !filters.search) {
      userMap.set(String(currentUser.id), currentUser);
    }

    // Add all other users, ensuring no duplicates
    users.forEach(u => {
      const id = String(u.id);
      if (!userMap.has(id)) {
        userMap.set(id, u);
      }
    });

    let result = Array.from(userMap.values());

    // Note: Search is handled server-side via searchUsers(), not filtered here

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

    // Location filter with distance calculation
    if (locationFilterActive && filters.location) {
      const searchLocation = filters.location.toLowerCase();

      if (selectedCoords) {
        // Use distance-based filtering when we have coordinates
        result = result.filter(u => {
          // If we have geocoded coords for this user
          if (userCoords[u.id]) {
            const distance = calculateDistance(
              selectedCoords.lat,
              selectedCoords.lng,
              userCoords[u.id].lat,
              userCoords[u.id].lng
            );
            return distance <= filters.locationRadius;
          }
          // If geocoding failed (null), use text matching
          if (userCoords[u.id] === null) {
            return u.location?.toLowerCase().includes(searchLocation);
          }
          // If not yet geocoded, include them (will be filtered once geocoded)
          return u.location?.toLowerCase().includes(searchLocation);
        });
      } else {
        // Text matching fallback when no coordinates
        result = result.filter(u =>
          u.location?.toLowerCase().includes(searchLocation)
        );
      }
    }

    // Gender filter - normalize by removing spaces for flexible matching
    if (filters.gender) {
      const normalizedFilter = filters.gender.toLowerCase().replace(/\s+/g, '');
      result = result.filter(u => {
        const normalizedGender = u.gender?.toLowerCase().replace(/\s+/g, '') || '';
        return normalizedGender.includes(normalizedFilter) || normalizedFilter.includes(normalizedGender);
      });
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
      result = result.filter(u => u.monoPoly === filters.relationship);
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
      case 'alphabetical':
        result = result.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
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
  }, [users, currentUser, filters, sortBy, ageFilterActive, locationFilterActive, selectedCoords, userCoords]);

  return (
    <div className="directory-page">
      <div className="directory-container">
        {/* Search, Sort, and Filters - All on one line */}
        <div className="filters-row">
          <div className="search-bar-container">
            <MagnifyingGlass className="search-icon" size={20} weight="bold" />
            <input
              type="text"
              placeholder="Search..."
              className="search-bar"
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
            />
            {filters.search && (
              <button className="search-clear" onClick={() => handleFilterChange('search', '')}><X size={14} weight="bold" /></button>
            )}
          </div>

          <select
            className={`filter-pill ${filters.gender ? 'active' : ''}`}
            value={filters.gender}
            onChange={(e) => handleFilterChange('gender', e.target.value)}
          >
            <option value="">Gender</option>
            <option value="she/her">She/Her</option>
            <option value="he/him">He/Him</option>
            <option value="they/them">They/Them</option>
          </select>

          <div className="location-filter-wrapper">
            <button
              className={`filter-pill ${locationFilterActive ? 'active' : ''}`}
              onClick={() => {
                const opening = !showLocationFilter;
                setShowLocationFilter(opening);
                if (opening) {
                  setTempLocation(filters.location);
                  setTempRadius(filters.locationRadius);
                  setTempCoords(selectedCoords);
                }
              }}
            >
              {locationFilterActive ? `${filters.location} (${filters.locationRadius}mi)` : 'Location'}
            </button>
            {showLocationFilter && (
              <div className="location-filter-dropdown">
                <div className="location-filter-header">
                  <span>Location</span>
                </div>
                <div className="location-input-group">
                  <input
                    ref={locationInputRef}
                    type="text"
                    placeholder="Search for a city..."
                    className="location-input"
                    autoComplete="off"
                    onChange={(e) => {
                      setTempLocation(e.target.value);
                      setTempCoords(null);
                    }}
                  />
                </div>
                <div className="radius-slider-section">
                  <div className="radius-slider-header">
                    <span>Distance</span>
                    <span className="radius-value">{tempRadius} miles</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="100"
                    step="5"
                    value={tempRadius}
                    onChange={(e) => setTempRadius(parseInt(e.target.value))}
                    className="radius-slider"
                  />
                  <div className="radius-slider-labels">
                    <span>5 mi</span>
                    <span>100 mi</span>
                  </div>
                </div>
                <div className="location-filter-actions">
                  <button
                    className="location-clear-btn"
                    onClick={() => {
                      setLocationFilterActive(false);
                      setTempLocation('');
                      setTempRadius(25);
                      setTempCoords(null);
                      setSelectedCoords(null);
                      handleFilterChange('location', '');
                      handleFilterChange('locationRadius', 25);
                      setShowLocationFilter(false);
                    }}
                  >
                    Clear
                  </button>
                  <button
                    className="location-apply-btn"
                    onClick={async () => {
                      const locationValue = tempLocation.trim();
                      if (locationValue) {
                        setLocationFilterActive(true);
                        handleFilterChange('location', locationValue);
                        handleFilterChange('locationRadius', tempRadius);

                        // Use coords from autocomplete or try to geocode
                        if (tempCoords) {
                          setSelectedCoords(tempCoords);
                        } else if (mapsReady && window.google?.maps) {
                          // Try to geocode the typed location
                          const geocoder = new window.google.maps.Geocoder();
                          geocoder.geocode({ address: locationValue }, (results, status) => {
                            if (status === 'OK' && results[0]) {
                              setSelectedCoords({
                                lat: results[0].geometry.location.lat(),
                                lng: results[0].geometry.location.lng(),
                              });
                            }
                          });
                        }
                      }
                      setShowLocationFilter(false);
                    }}
                  >
                    Apply
                  </button>
                </div>
              </div>
            )}
          </div>

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
            <Sliders size={16} /> More filters
          </button>

          <div className="sort-container">
            <select
              className="sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="newest">Recent</option>
              <option value="alphabetical">A-Z</option>
            </select>
          </div>
        </div>

        {/* Active Filters */}
        {(filters.gender || locationFilterActive || filters.hereFor || ageFilterActive || filters.search || filters.community || filters.interests) && (
          <div className="active-filters">
            {filters.search && (
              <span className="active-filter-pill">
                "{filters.search}"
                <button onClick={() => handleFilterChange('search', '')}><X size={12} weight="bold" /></button>
              </span>
            )}
            {filters.gender && (
              <span className="active-filter-pill">
                {filters.gender}
                <button onClick={() => handleFilterChange('gender', '')}><X size={12} weight="bold" /></button>
              </span>
            )}
            {locationFilterActive && filters.location && (
              <span className="active-filter-pill">
                {filters.location} ({filters.locationRadius}mi)
                <button onClick={() => {
                  setLocationFilterActive(false);
                  handleFilterChange('location', '');
                }}><X size={12} weight="bold" /></button>
              </span>
            )}
            {filters.hereFor && (
              <span className="active-filter-pill">
                {filters.hereFor}
                <button onClick={() => handleFilterChange('hereFor', '')}><X size={12} weight="bold" /></button>
              </span>
            )}
            {ageFilterActive && (
              <span className="active-filter-pill">
                Age: {filters.ageMin} - {filters.ageMax}
                <button onClick={() => setAgeFilterActive(false)}><X size={12} weight="bold" /></button>
              </span>
            )}
            {filters.community && (
              <span className="active-filter-pill">
                {filters.community}
                <button onClick={() => handleFilterChange('community', '')}><X size={12} weight="bold" /></button>
              </span>
            )}
            {filters.interests && (
              <span className="active-filter-pill">
                {filters.interests}
                <button onClick={() => handleFilterChange('interests', '')}><X size={12} weight="bold" /></button>
              </span>
            )}
            <button className="clear-all-filters" onClick={resetFilters}>
              Clear all
            </button>
          </div>
        )}

        <div className="directory-grid">
          {filteredUsers.map((user) => (
            <Link
              key={user.id}
              to={user.id === currentUser?.id ? '/profile' : `/user/${user.id}`}
              className="directory-card"
            >
              <div className="profile-image">
                <img
                  src={user.mainPhoto || user.photos?.[0] || 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%22 height=%22100%22%3E%3Crect fill=%22%23e0e0e0%22 width=%22100%22 height=%22100%22/%3E%3C/svg%3E'}
                  alt={user.name}
                  loading="lazy"
                  decoding="async"
                  onError={(e) => {
                    // Prevent infinite error loops
                    if (e.target.dataset.fallbackAttempted) {
                      e.target.src = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%22 height=%22100%22%3E%3Crect fill=%22%23e0e0e0%22 width=%22100%22 height=%22100%22/%3E%3C/svg%3E';
                      return;
                    }
                    e.target.dataset.fallbackAttempted = 'true';

                    // Try fallback photos if main photo fails (e.g., HEIC format)
                    const fallbacks = (user.photos || []).filter(p =>
                      p && (p.toLowerCase().endsWith('.jpg') || p.toLowerCase().endsWith('.jpeg') || p.toLowerCase().endsWith('.png') || p.toLowerCase().endsWith('.webp'))
                    );
                    if (fallbacks.length > 0) {
                      e.target.src = fallbacks[0].startsWith('//') ? 'https:' + fallbacks[0] : fallbacks[0];
                    } else {
                      e.target.src = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%22 height=%22100%22%3E%3Crect fill=%22%23e0e0e0%22 width=%22100%22 height=%22100%22/%3E%3C/svg%3E';
                    }
                  }}
                />
              </div>
              <div className="profile-content">
                <h3 className="profile-name">{user.name}</h3>
                <p className="profile-bio">{user.quickBio || user.bio}</p>

                <div className="profile-badges">
                  {user.hereFor?.includes('Love') && <span className="badge love">Love</span>}
                  {user.hereFor?.includes('Friends') && <span className="badge friends">Friends</span>}
                  {user.hereFor?.includes('Collaboration') && <span className="badge collab">Collab</span>}
                </div>

                <div className="profile-meta">
                  <p>{[user.age, user.gender, user.location].filter(Boolean).join(' • ')}</p>
                  {user.interests && user.interests.length > 0 && (
                    <p className="profile-interests">
                      {user.interests.slice(0, 3).join(', ')}
                    </p>
                  )}
                </div>

                {user.communities && user.communities.length > 0 && (
                  <div className="profile-communities">
                    {user.communities.slice(0, 2).join(', ')}
                  </div>
                )}

                {/* Voucher avatars */}
                {userVouchers[user.id] && userVouchers[user.id].length > 0 && (
                  <div className="card-vouchers">
                    {userVouchers[user.id].slice(0, 4).map((voucher, idx) => (
                      <img
                        key={idx}
                        src={voucher.photo || 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%22 height=%22100%22%3E%3Crect fill=%22%23e0e0e0%22 width=%22100%22 height=%22100%22/%3E%3C/svg%3E'}
                        alt={voucher.name}
                        className="card-voucher-avatar"
                        title={`Vouched by ${voucher.name}`}
                      />
                    ))}
                    {userVouchers[user.id].length > 4 && (
                      <span className="card-voucher-more">+{userVouchers[user.id].length - 4}</span>
                    )}
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>

        {usersLoading && (
          <div className="loading-indicator">
            <Spinner />
            <p>Loading profiles...</p>
          </div>
        )}

        {!usersLoading && hasMore && filteredUsers.length > 0 && (
          <div className="load-more-container">
            <button className="btn btn-primary btn-lg" onClick={loadMoreUsers}>
              Load More
            </button>
          </div>
        )}

        {!usersLoading && filteredUsers.length === 0 && (
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
              <button onClick={() => setShowFilters(false)}><X size={20} weight="bold" /></button>
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
                {communities.map(c => (
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
