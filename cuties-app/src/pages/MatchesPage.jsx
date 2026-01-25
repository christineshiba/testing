import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useNavigate, Link } from 'react-router-dom';
import { fetchUsersByNames, fetchVouchersForUsers, fetchPairingsFor, fetchMessages } from '../lib/supabase';
import { EyeSlash, ThumbsUp, Sparkle, Eye, Heart, Handshake } from '@phosphor-icons/react';
import './MatchesPage.css';

const UserCard = ({ user, vouchers, messages, currentUserId, compact = false, showActions = false }) => {
  const fallbackPhoto = (e) => {
    const fallbacks = (user.photos || []).filter(p =>
      p && (p.toLowerCase().endsWith('.jpg') || p.toLowerCase().endsWith('.jpeg') || p.toLowerCase().endsWith('.png'))
    );
    if (fallbacks.length > 0 && e.target.src !== fallbacks[0]) {
      e.target.src = fallbacks[0].startsWith('//') ? 'https:' + fallbacks[0] : fallbacks[0];
    } else {
      e.target.src = 'https://via.placeholder.com/200?text=No+Photo';
    }
  };

  // Format date for messages
  const formatDate = (date) => {
    if (!date) return '';
    const d = new Date(date);
    return `${d.getMonth() + 1}/${d.getDate()}/${String(d.getFullYear()).slice(-2)}`;
  };

  if (compact) {
    return (
      <Link to={`/user/${user.id}`} className="user-card-compact">
        <img
          src={user.mainPhoto || user.photos?.[0] || 'https://via.placeholder.com/50?text=?'}
          alt={user.name}
          onError={fallbackPhoto}
        />
        <div className="compact-info">
          <span className="compact-name">{user.name}</span>
          {user.quickBio && <span className="compact-bio">{user.quickBio}</span>}
        </div>
      </Link>
    );
  }

  // Get the last message from the other person (not from "me")
  const lastReceivedMessage = messages?.slice().reverse().find(m => m.sender !== 'me');

  return (
    <div className="user-card-wrapper">
      <div className="user-card">
        <Link to={`/user/${user.id}`} className="user-card-link">
          <div className="user-card-image">
            <img
              src={user.mainPhoto || user.photos?.[0] || 'https://via.placeholder.com/200?text=No+Photo'}
              alt={user.name}
              onError={fallbackPhoto}
            />
          </div>
          <div className="user-card-content">
            <h3 className="user-card-name">{user.name}</h3>
            {user.quickBio && <p className="user-card-bio">{user.quickBio}</p>}
            <div className="user-card-meta">
              {[user.age, user.gender, user.location].filter(Boolean).join('  ')}
            </div>
            {user.communities && user.communities.length > 0 && (
              <div className="user-card-communities">
                {user.communities.slice(0, 4).join(', ')}
              </div>
            )}
            {vouchers && vouchers.length > 0 && (
              <div className="user-card-vouchers">
                {vouchers.slice(0, 5).map((v, i) => (
                  <img key={i} src={v.photo || 'https://via.placeholder.com/24?text=?'} alt={v.name} title={v.name} />
                ))}
                {vouchers.length > 5 && <span className="voucher-count">+{vouchers.length - 5}</span>}
              </div>
            )}
          </div>
        </Link>
      </div>

      {/* Message bubble section - shown below the card */}
      {lastReceivedMessage && (
        <div className="message-section">
          <div className="message-sender-name">{user.name}</div>
          <div className="message-bubble">
            <p className="message-text">{lastReceivedMessage.text}</p>
            <span className="message-date">{formatDate(lastReceivedMessage.timestamp)}</span>
          </div>
        </div>
      )}

      {/* Action buttons */}
      {showActions && (
        <div className="card-actions">
          <button className="card-action-btn">
            <EyeSlash size={16} className="action-icon" /> Hide
          </button>
          <button className="card-action-btn">
            <Eye size={16} className="action-icon" /> Mark as seen
          </button>
          <button className="card-action-btn primary">
            <ThumbsUp size={16} className="action-icon" /> We've met/talked!
          </button>
        </div>
      )}
    </div>
  );
};

const MatchesPage = () => {
  const { currentUser, isAuthenticated, loading } = useApp();
  const navigate = useNavigate();

  const [interestedInUsers, setInterestedInUsers] = useState([]);
  const [suitorsUsers, setSuitorsUsers] = useState([]);
  const [matchesUsers, setMatchesUsers] = useState([]);
  const [metUpUsers, setMetUpUsers] = useState([]);
  const [pairings, setPairings] = useState([]);
  const [vouchers, setVouchers] = useState({});
  const [userMessages, setUserMessages] = useState({});
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    const loadRelationshipData = async () => {
      if (!currentUser) return;

      setDataLoading(true);

      try {
        // Fetch all relationship users and pairings in parallel
        const [interested, suitors, matches, metUp, userPairings] = await Promise.all([
          fetchUsersByNames(currentUser.interestedIn || []),
          fetchUsersByNames(currentUser.suitors || []),
          fetchUsersByNames(currentUser.mutualMatches || []),
          fetchUsersByNames(currentUser.metUpWith || []),
          fetchPairingsFor(currentUser.id),
        ]);

        setInterestedInUsers(interested);
        setSuitorsUsers(suitors);
        setMatchesUsers(matches);
        setMetUpUsers(metUp);
        setPairings(userPairings);

        // Fetch vouchers for all users
        const allUserIds = [
          ...interested,
          ...suitors,
          ...matches,
          ...metUp,
          ...userPairings.filter(p => p.user).map(p => p.user)
        ].map(u => u.id).filter(Boolean);

        if (allUserIds.length > 0) {
          const voucherData = await fetchVouchersForUsers([...new Set(allUserIds)]);
          setVouchers(voucherData);
        }

        // Fetch messages for suitors, matches, and met-up users
        const usersWithMessages = [...suitors, ...matches, ...metUp];
        if (usersWithMessages.length > 0 && currentUser) {
          const messagesData = {};
          await Promise.all(
            usersWithMessages.map(async (user) => {
              const msgs = await fetchMessages(currentUser.id, user.id);
              if (msgs.length > 0) {
                messagesData[user.id] = msgs;
              }
            })
          );
          setUserMessages(messagesData);
        }
      } catch (error) {
        console.error('Error loading relationship data:', error);
      } finally {
        setDataLoading(false);
      }
    };

    if (isAuthenticated && currentUser) {
      loadRelationshipData();
    }
  }, [currentUser, isAuthenticated]);

  // Wait for session check to complete
  if (loading) {
    return (
      <div className="matches-page">
        <div className="matches-container">
          <p style={{ textAlign: 'center', padding: '3rem' }}>Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    navigate('/login');
    return null;
  }

  const hasAnyData = interestedInUsers.length > 0 || suitorsUsers.length > 0 ||
                     matchesUsers.length > 0 || metUpUsers.length > 0 || pairings.length > 0;

  return (
    <div className="matches-page">
      <div className="matches-layout">
        {/* Main Content */}
        <div className="matches-main">
          {/* Suggested Pairings - user-generated introductions */}
          {pairings.length > 0 && (
            <section className="matches-section">
              <h2 className="section-title">
                Suggested Pairings <Sparkle size={20} weight="fill" className="section-icon" />
                <span className="section-subtitle">People in your community think you should meet</span>
              </h2>
              <div className="pairings-list">
                {pairings.map(pairing => (
                  pairing.user ? (
                    <div key={pairing.id} className="pairing-card">
                      <UserCard user={pairing.user} vouchers={vouchers[pairing.user.id]} />
                      {pairing.description && (
                        <div className="pairing-reason">
                          <p>"{pairing.description}"</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div key={pairing.id} className="pairing-card pairing-external">
                      <div className="external-match">
                        <div className="external-avatar">?</div>
                        <div className="external-info">
                          <h3>{pairing.userName}</h3>
                          {pairing.description && <p className="external-desc">"{pairing.description}"</p>}
                          {pairing.contactInfo && <p className="external-contact">{pairing.contactInfo}</p>}
                        </div>
                      </div>
                    </div>
                  )
                ))}
              </div>
            </section>
          )}

          {/* Interested in You */}
          {suitorsUsers.length > 0 && (
            <section className="matches-section">
              <h2 className="section-title">
                Interested in you <Eye size={20} weight="fill" className="section-icon" />
                <span className="section-subtitle">These people liked you or are checking out your profile in the sorting phase. Your response helps inform their spot in the directory</span>
              </h2>
              <div className="users-grid">
                {suitorsUsers.map(user => (
                  <UserCard
                    key={user.id}
                    user={user}
                    vouchers={vouchers[user.id]}
                    messages={userMessages[user.id]}
                    showActions={true}
                  />
                ))}
              </div>
              {suitorsUsers.length > 12 && (
                <button className="show-more-btn">Show more ({suitorsUsers.length - 12} more)</button>
              )}
            </section>
          )}

          {/* Matches */}
          {matchesUsers.length > 0 && (
            <section className="matches-section">
              <h2 className="section-title">
                Matches <Heart size={20} weight="fill" className="section-icon" />
                <span className="section-subtitle">You both liked each other!</span>
              </h2>
              <div className="users-grid">
                {matchesUsers.map(user => (
                  <UserCard
                    key={user.id}
                    user={user}
                    vouchers={vouchers[user.id]}
                    messages={userMessages[user.id]}
                    currentUserId={currentUser?.id}
                  />
                ))}
              </div>
            </section>
          )}

          {/* People you met up with */}
          {metUpUsers.length > 0 && (
            <section className="matches-section">
              <h2 className="section-title">
                People you met up with <Handshake size={20} weight="fill" className="section-icon" />
              </h2>
              <div className="users-grid">
                {metUpUsers.map(user => (
                  <UserCard
                    key={user.id}
                    user={user}
                    vouchers={vouchers[user.id]}
                    messages={userMessages[user.id]}
                    currentUserId={currentUser?.id}
                  />
                ))}
              </div>
            </section>
          )}

          {/* No data state */}
          {!dataLoading && !hasAnyData && (
            <div className="no-matches">
              <div className="no-matches-icon"><Heart size={48} weight="light" /></div>
              <h2>No matches yet</h2>
              <p>Browse the directory to find your community!</p>
              <Link to="/directory" className="discover-link">
                Go to Directory
              </Link>
            </div>
          )}

          {dataLoading && (
            <div className="loading-state">
              <p>Loading your connections...</p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <aside className="matches-sidebar">
          <section className="sidebar-section">
            <h3 className="sidebar-title">People you liked</h3>
            <p className="sidebar-subtitle">Your likes are hidden from others until they like you back</p>
            {interestedInUsers.length > 0 ? (
              <div className="sidebar-list">
                {interestedInUsers.map(user => (
                  <UserCard key={user.id} user={user} compact />
                ))}
              </div>
            ) : (
              <p className="sidebar-empty">No likes yet. Browse the directory to find people you connect with!</p>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
};

export default MatchesPage;
