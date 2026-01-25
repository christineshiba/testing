import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { getCommunityBySlug } from '../data/communities';
import { fetchUsersByCommunity, fetchVouchersForUsers } from '../lib/supabase';
import { MagnifyingGlass, X } from '@phosphor-icons/react';
import './CommunityPage.css';

const CommunityPage = () => {
  const { communityId } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, currentUser, loading } = useApp();
  const [activeTab, setActiveTab] = useState('directory');
  const [members, setMembers] = useState([]);
  const [memberCount, setMemberCount] = useState(0);
  const [membersLoading, setMembersLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [userVouchers, setUserVouchers] = useState({});
  const searchTimeoutRef = useRef(null);

  const community = getCommunityBySlug(communityId);

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate('/login');
    }
  }, [loading, isAuthenticated, navigate]);

  // Load members on mount and when search changes
  useEffect(() => {
    if (!community) return;

    // Clear any existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Debounce the search by 300ms
    searchTimeoutRef.current = setTimeout(() => {
      loadMembers(true);
    }, search ? 300 : 0);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [community, search]);

  const loadMembers = async (reset = false) => {
    if (!community) return;

    setMembersLoading(true);
    const currentPage = reset ? 0 : page;
    const results = await fetchUsersByCommunity(community.name, {
      page: currentPage,
      limit: 20,
      search,
    });

    if (reset) {
      setMembers(results);
      setPage(0);
    } else {
      setMembers(prev => [...prev, ...results]);
    }

    // If we got fewer than 20 results, there's no more to load
    setHasMore(results.length === 20);
    setMembersLoading(false);

    // Update member count
    if (reset && !search) {
      setMemberCount(results.length + (results.length === 20 ? '+' : ''));
    }
  };

  // Fetch vouchers for displayed members
  useEffect(() => {
    const loadVouchers = async () => {
      if (members.length === 0) return;
      const userIds = members.map(u => u.id);
      const vouchers = await fetchVouchersForUsers(userIds);
      setUserVouchers(vouchers);
    };
    loadVouchers();
  }, [members]);

  const handleLoadMore = () => {
    setPage(prev => prev + 1);
    loadMembers(false);
  };

  // Show loading state
  if (loading) {
    return (
      <div className="community-page">
        <div className="loading-indicator">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  // Handle invalid community
  if (!community) {
    return (
      <div className="community-page">
        <div className="community-not-found">
          <h2>Community not found</h2>
          <p>The community you're looking for doesn't exist.</p>
          <Link to="/" className="back-link">Back to Home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="community-page">
      {/* Community Header */}
      <header className="community-header">
        <div className="community-header-content">
          <div className="community-header-text">
            <h1 className="community-title">{community.name}</h1>
            <p className="community-desc">{community.description}</p>
            <span className="community-members">
              {memberCount || members.length} members
            </span>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <nav className="community-tabs">
        <button
          className={`community-tab ${activeTab === 'directory' ? 'active' : ''}`}
          onClick={() => setActiveTab('directory')}
        >
          Directory
        </button>
        <button
          className={`community-tab ${activeTab === 'feed' ? 'active' : ''}`}
          onClick={() => setActiveTab('feed')}
        >
          Feed
        </button>
      </nav>

      {/* Directory Tab Content */}
      {activeTab === 'directory' && (
        <div className="community-directory">
          {/* Search Bar */}
          <div className="community-search-container">
            <div className="community-search-bar">
              <MagnifyingGlass className="search-icon" size={20} weight="bold" />
              <input
                type="text"
                placeholder="Search members..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button className="search-clear" onClick={() => setSearch('')}>
                  <X size={14} weight="bold" />
                </button>
              )}
            </div>
          </div>

          {/* Members Grid */}
          <div className="community-members-grid">
            {members.map((user) => (
              <Link
                key={user.id}
                to={user.id === currentUser?.id ? '/profile' : `/user/${user.id}`}
                className="member-card"
              >
                <div className="member-image">
                  <img
                    src={user.mainPhoto || user.photos?.[0] || 'https://via.placeholder.com/400x400?text=No+Photo'}
                    alt={user.name}
                    onError={(e) => {
                      e.target.src = 'https://via.placeholder.com/400x400?text=No+Photo';
                    }}
                  />
                </div>
                <div className="member-content">
                  <h3 className="member-name">{user.name}</h3>
                  <p className="member-bio">{user.quickBio || user.bio}</p>

                  <div className="member-badges">
                    {user.hereFor?.includes('Love') && <span className="badge love">Love</span>}
                    {user.hereFor?.includes('Friends') && <span className="badge friends">Friends</span>}
                    {user.hereFor?.includes('Collaboration') && <span className="badge collab">Collab</span>}
                  </div>

                  <div className="member-meta">
                    <p>{[user.age, user.gender, user.location].filter(Boolean).join(' \u2022 ')}</p>
                  </div>

                  {user.communities && user.communities.length > 0 && (
                    <div className="member-communities">
                      {user.communities.slice(0, 2).join(', ')}
                    </div>
                  )}

                  {/* Voucher avatars */}
                  {userVouchers[user.id] && userVouchers[user.id].length > 0 && (
                    <div className="member-vouchers">
                      {userVouchers[user.id].slice(0, 4).map((voucher, idx) => (
                        <img
                          key={idx}
                          src={voucher.photo || 'https://via.placeholder.com/28?text=?'}
                          alt={voucher.name}
                          className="voucher-avatar"
                          title={`Vouched by ${voucher.name}`}
                        />
                      ))}
                      {userVouchers[user.id].length > 4 && (
                        <span className="voucher-more">+{userVouchers[user.id].length - 4}</span>
                      )}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>

          {membersLoading && (
            <div className="loading-indicator">
              <p>Loading members...</p>
            </div>
          )}

          {!membersLoading && hasMore && members.length > 0 && (
            <div className="load-more-container">
              <button className="load-more-btn" onClick={handleLoadMore}>
                Load More
              </button>
            </div>
          )}

          {!membersLoading && members.length === 0 && (
            <div className="no-results">
              <p>No members found{search ? ` matching "${search}"` : ' in this community'}.</p>
              {search && (
                <button onClick={() => setSearch('')}>Clear Search</button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Feed Tab Content */}
      {activeTab === 'feed' && (
        <div className="community-feed">
          <div className="feed-placeholder">
            <div className="feed-placeholder-icon">
              <span>Coming Soon</span>
            </div>
            <h3>Community Feed</h3>
            <p>Stay tuned! We're working on a feed where community members can share updates and connect.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default CommunityPage;
