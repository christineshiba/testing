import { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { useNavigate, Link, useParams } from 'react-router-dom';
import { fetchProjectsFor, fetchTestimonialsFor, fetchVouchersFor, fetchVouchedBy, checkHasVouched, addVouch, removeVouch } from '../lib/supabase';
import VouchersModal from '../components/VouchersModal';
import {
  User, Cake, MapPin, XLogo, InstagramLogo, Article, YoutubeLogo,
  HandWaving, Heart, ChatCircle, Handshake, MusicNote, Play, Check
} from '@phosphor-icons/react';
import './ProfilePage.css';

// Twitter Embed Component
const TweetEmbed = ({ tweetUrl }) => {
  const containerRef = useRef(null);
  const createdRef = useRef(false);
  const tweetId = getTweetIdFromUrl(tweetUrl);

  useEffect(() => {
    if (!tweetId || !containerRef.current) return;

    // Prevent duplicate creation
    if (createdRef.current) return;

    // Clear any existing content first
    containerRef.current.innerHTML = '';

    const createTweet = () => {
      if (window.twttr && containerRef.current && !createdRef.current) {
        createdRef.current = true;
        window.twttr.widgets.createTweet(tweetId, containerRef.current, {
          theme: 'light',
          width: 300,
        });
      }
    };

    // Load Twitter widget script if not already loaded
    if (!window.twttr) {
      const script = document.createElement('script');
      script.src = 'https://platform.twitter.com/widgets.js';
      script.async = true;
      script.onload = createTweet;
      document.body.appendChild(script);
    } else if (window.twttr.widgets) {
      // Script already loaded and ready
      createTweet();
    } else {
      // Script loaded but not ready, wait for it
      window.twttr.ready(createTweet);
    }

    return () => {
      createdRef.current = false;
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [tweetId]);

  if (!tweetId) return null;

  return <div ref={containerRef} className="tweet-embed-container" />;
};

// Helper to extract tweet ID (used by TweetEmbed)
const getTweetIdFromUrl = (url) => {
  if (!url) return null;
  const match = url.match(/(?:twitter\.com|x\.com)\/\w+\/status\/(\d+)/);
  return match ? match[1] : null;
};

// Strip leading @ symbols from social handles
const cleanHandle = (handle) => handle?.replace(/^@+/, '') || '';

// Extract Spotify embed ID from URL
const getSpotifyEmbedUrl = (url) => {
  if (!url) return null;
  // Match patterns like open.spotify.com/track/ID, /album/ID, /playlist/ID
  const match = url.match(/spotify\.com\/(track|album|playlist)\/([a-zA-Z0-9]+)/);
  if (match) {
    const [, type, id] = match;
    return `https://open.spotify.com/embed/${type}/${id}?utm_source=generator&theme=0`;
  }
  return null;
};

// Extract YouTube video ID from URL
const getYouTubeEmbedUrl = (url) => {
  if (!url) return null;
  // Match various YouTube URL formats
  const patterns = [
    /youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/,
    /youtu\.be\/([a-zA-Z0-9_-]+)/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]+)/,
    /youtube\.com\/v\/([a-zA-Z0-9_-]+)/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return `https://www.youtube.com/embed/${match[1]}`;
    }
  }
  return null;
};


const ProfilePage = () => {
  const { currentUser, isAuthenticated, users, getUserById, loading } = useApp();
  const navigate = useNavigate();
  const { userId } = useParams();
  const [isInterested, setIsInterested] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [profileUser, setProfileUser] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [userProjects, setUserProjects] = useState([]);
  const [userTestimonials, setUserTestimonials] = useState([]);
  const [vouchersFor, setVouchersFor] = useState([]);
  const [vouchedBy, setVouchedBy] = useState([]);
  const [hasVouched, setHasVouched] = useState(false);
  const [showVouchersModal, setShowVouchersModal] = useState(false);

  // Determine if viewing own profile or someone else's
  const isOwnProfile = !userId || userId === String(currentUser?.id);

  // Scroll to top when page loads or userId changes
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [userId]);

  // Fetch user data when viewing another profile
  useEffect(() => {
    const loadProfile = async () => {
      setLoadingProfile(true);

      let user;
      if (isOwnProfile) {
        user = currentUser;
      } else if (userId) {
        user = await getUserById(userId);
      }

      if (user) {
        setProfileUser(user);

        // Fetch projects, testimonials, and vouchers for this user
        const [projects, testimonials, vouchersReceived, vouchesGiven] = await Promise.all([
          fetchProjectsFor(user.id),
          fetchTestimonialsFor(user.id),
          fetchVouchersFor(user.id),
          fetchVouchedBy(user.id),
        ]);

        setUserProjects(projects);
        setUserTestimonials(testimonials);
        setVouchersFor(vouchersReceived);
        setVouchedBy(vouchesGiven);

        // Check if current user has vouched for this profile
        if (!isOwnProfile && currentUser) {
          const vouched = await checkHasVouched(currentUser.id, user.id);
          setHasVouched(vouched);
        }
      }

      setLoadingProfile(false);
    };

    if (isAuthenticated && currentUser) {
      loadProfile();
    }
  }, [userId, isOwnProfile, currentUser, isAuthenticated, getUserById]);

  // Wait for session check to complete
  if (loading) {
    return (
      <div className="profile-page">
        <div className="profile-container">
          <div className="profile-card main-card" style={{ textAlign: 'center', padding: '3rem' }}>
            <p>Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !currentUser) {
    navigate('/login');
    return null;
  }

  // Show loading while fetching profile
  if (loadingProfile) {
    return (
      <div className="profile-page">
        <div className="profile-container">
          <div className="profile-card main-card" style={{ textAlign: 'center', padding: '3rem' }}>
            <p>Loading profile...</p>
          </div>
        </div>
      </div>
    );
  }

  // If viewing another user's profile but user not found
  if (!isOwnProfile && !profileUser) {
    return (
      <div className="profile-page">
        <div className="profile-container">
          <div className="profile-card main-card" style={{ textAlign: 'center', padding: '3rem' }}>
            <h2>User not found</h2>
            <p style={{ margin: '1rem 0', color: '#666' }}>This profile doesn't exist or has been removed.</p>
            <Link to="/directory" className="edit-profile-btn">Back to Directory</Link>
          </div>
        </div>
      </div>
    );
  }

  // Handle vouch toggle
  const handleVouchToggle = async () => {
    if (!currentUser || !profileUser) return;

    if (hasVouched) {
      const success = await removeVouch(currentUser.id, profileUser.id);
      if (success) {
        setHasVouched(false);
        setVouchersFor(prev => prev.filter(v => v.userId !== currentUser.id));
      }
    } else {
      const result = await addVouch(currentUser.id, profileUser.id);
      if (result) {
        setHasVouched(true);
        setVouchersFor(prev => [...prev, {
          id: result.id,
          userId: currentUser.id,
          name: currentUser.name,
          photo: currentUser.mainPhoto,
        }]);
      }
    }
  };

  const interests = profileUser.interests || [];
  const communities = profileUser.communities || [];
  const hereFor = profileUser.hereFor || [];
  const projects = userProjects.length > 0 ? userProjects : (profileUser.projects || []);
  const tweets = profileUser.tweets || [];
  const morePhotos = profileUser.morePhotos || [];
  const testimonials = userTestimonials;

  return (
    <div className="profile-page">
      <div className="profile-container">
        {/* Main Profile Card */}
        <section className="profile-card main-card">
          {/* Name & Badge */}
          <div className="profile-header-row">
            <h1 className="profile-name">{profileUser.name}</h1>
            <span className="profile-badge">Cuties beta tester/supporter</span>
          </div>
          <p className="profile-tagline">{profileUser.quickBio || profileUser.bio}</p>

          {/* Photo + Sidebar Layout */}
          <div className="profile-layout">
            <div className="profile-photo-container">
              <img
                src={profileUser.mainPhoto || profileUser.photos?.[0] || 'https://via.placeholder.com/400?text=No+Photo'}
                alt={profileUser.name}
                className="profile-main-photo"
                onError={(e) => {
                  // Try fallback photos if main photo fails (e.g., HEIC format)
                  const fallbacks = (profileUser.morePhotos || profileUser.photos || []).filter(p =>
                    p && (p.toLowerCase().endsWith('.jpg') || p.toLowerCase().endsWith('.jpeg') || p.toLowerCase().endsWith('.png'))
                  );
                  if (fallbacks.length > 0 && e.target.src !== fallbacks[0]) {
                    e.target.src = fallbacks[0].startsWith('//') ? 'https:' + fallbacks[0] : fallbacks[0];
                  } else {
                    e.target.src = 'https://via.placeholder.com/400?text=No+Photo';
                  }
                }}
              />
            </div>

            <div className="profile-sidebar">
              <div className="sidebar-item">
                <User size={16} className="sidebar-icon" />
                <span>{profileUser.gender || 'She / Her'}</span>
              </div>
              <div className="sidebar-item">
                <Cake size={16} className="sidebar-icon" />
                <span>{profileUser.age}</span>
              </div>
              <div className="sidebar-item">
                <MapPin size={16} className="sidebar-icon" />
                <span>{profileUser.location}</span>
              </div>
              {profileUser.socials?.twitter && (
                <a href={`https://x.com/${cleanHandle(profileUser.socials.twitter)}`} target="_blank" rel="noopener noreferrer" className="sidebar-item sidebar-link">
                  <XLogo size={16} className="sidebar-icon" />
                  <span>@{cleanHandle(profileUser.socials.twitter)}</span>
                </a>
              )}
              {profileUser.socials?.instagram && (
                <a href={`https://instagram.com/${cleanHandle(profileUser.socials.instagram)}`} target="_blank" rel="noopener noreferrer" className="sidebar-item sidebar-link">
                  <InstagramLogo size={16} className="sidebar-icon" />
                  <span>@{cleanHandle(profileUser.socials.instagram)}</span>
                </a>
              )}
              {profileUser.socials?.substack && (
                <a href={`https://${cleanHandle(profileUser.socials.substack)}.substack.com`} target="_blank" rel="noopener noreferrer" className="sidebar-item sidebar-link">
                  <Article size={16} className="sidebar-icon" />
                  <span>{cleanHandle(profileUser.socials.substack)}</span>
                </a>
              )}
              {profileUser.socials?.youtube && (
                <a href={`https://youtube.com/@${cleanHandle(profileUser.socials.youtube)}`} target="_blank" rel="noopener noreferrer" className="sidebar-item sidebar-link">
                  <YoutubeLogo size={16} className="sidebar-icon" />
                  <span>@{cleanHandle(profileUser.socials.youtube)}</span>
                </a>
              )}
            </div>
          </div>

          {/* Here For */}
          <div className="here-for-section">
            <span className="here-for-label">Here for</span>
            <div className="here-for-tags">
              {hereFor.includes('Love') && <span className="tag tag-love">Love</span>}
              {hereFor.includes('Friends') && <span className="tag tag-blue">Friends</span>}
              {hereFor.includes('Collaboration') && <span className="tag tag-blue">Collab</span>}
            </div>
          </div>

          {/* Prompt Question */}
          <div className="prompt-box">
            <strong>{profileUser.name} (prompt):</strong> {profileUser.promptQuestion || 'what draws you to me?'}
          </div>

          {/* Profile Actions */}
          {isOwnProfile ? (
            <Link to="/profile/edit" className="edit-profile-btn">Edit profile</Link>
          ) : (
            <div className="profile-actions">
              <button
                className={`action-btn interest-btn ${isInterested ? 'active' : ''}`}
                onClick={() => setIsInterested(!isInterested)}
              >
                {isInterested ? <><Check size={16} weight="bold" /> Interested</> : <><HandWaving size={16} /> Indicate interest</>}
              </button>
              <button
                className={`action-btn like-btn ${isLiked ? 'active' : ''}`}
                onClick={() => setIsLiked(!isLiked)}
              >
                {isLiked ? <><Heart size={16} weight="fill" /> Liked</> : <><Heart size={16} /> Like profile</>}
              </button>
              <Link to={`/chat/${profileUser.id}`} className="action-btn message-btn">
                <ChatCircle size={16} /> Message
              </Link>
            </div>
          )}

          {/* Vouchers Row */}
          <div className="vouchers-section">
            <div
              className="vouchers-row"
              onClick={() => setShowVouchersModal(true)}
              style={{ cursor: vouchersFor.length > 0 ? 'pointer' : 'default' }}
            >
              {vouchersFor.length > 0 ? (
                <>
                  <div className="voucher-avatars">
                    {vouchersFor.slice(0, 8).map((voucher) => (
                      <img
                        key={voucher.id}
                        src={voucher.photo || 'https://via.placeholder.com/32?text=?'}
                        alt={voucher.name}
                        className="avatar-small"
                        title={voucher.name}
                      />
                    ))}
                    {vouchersFor.length > 8 && (
                      <span className="more-vouchers">+{vouchersFor.length - 8}</span>
                    )}
                  </div>
                  <span className="vouchers-label">
                    {vouchersFor.length} {vouchersFor.length === 1 ? 'person' : 'people'} vouched
                  </span>
                </>
              ) : (
                <span className="vouchers-label no-vouchers">No vouches yet</span>
              )}
            </div>

            {/* Vouch button for other profiles */}
            {!isOwnProfile && (
              <button
                className={`vouch-btn ${hasVouched ? 'vouched' : ''}`}
                onClick={handleVouchToggle}
              >
                {hasVouched ? <><Check size={16} weight="bold" /> I know them</> : <><Handshake size={16} /> I know them</>}
              </button>
            )}
          </div>
        </section>

        {/* Currently Listening */}
        <section className="profile-card">
          <h2 className="card-title">Currently listening</h2>
          <div className="spotify-embed">
            {profileUser.spotify && getSpotifyEmbedUrl(profileUser.spotify) ? (
              <iframe
                src={getSpotifyEmbedUrl(profileUser.spotify)}
                width="100%"
                height="152"
                frameBorder="0"
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                loading="lazy"
                className="spotify-iframe"
              />
            ) : profileUser.spotify ? (
              <div className="embed-placeholder spotify">
                <div className="embed-content">
                  <MusicNote size={24} className="embed-icon" />
                  <span>Invalid Spotify URL</span>
                </div>
                <p className="embed-link">{profileUser.spotify}</p>
              </div>
            ) : (
              <div className="embed-placeholder spotify">
                <div className="embed-content">
                  <MusicNote size={24} className="embed-icon" />
                  <span>No track added</span>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Video */}
        <section className="profile-card">
          <h2 className="card-title">Video</h2>
          <div className="video-embed">
            {profileUser.youtube && getYouTubeEmbedUrl(profileUser.youtube) ? (
              <iframe
                src={getYouTubeEmbedUrl(profileUser.youtube)}
                width="100%"
                height="315"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                loading="lazy"
                className="youtube-iframe"
              />
            ) : profileUser.youtube ? (
              <div className="embed-placeholder video">
                <Play size={32} weight="fill" />
                <p>Invalid YouTube URL</p>
              </div>
            ) : (
              <div className="embed-placeholder video">
                <Play size={32} weight="fill" />
                <p>No video added</p>
              </div>
            )}
          </div>
        </section>

        {/* Communities & Interests */}
        <section className="profile-card">
          <h2 className="card-title">Communities & interests</h2>
          <div className="interests-row">
            {interests.map((interest, idx) => (
              <span key={idx} className="interest-pill">{interest}</span>
            ))}
          </div>
          {communities.length > 0 && (
            <div className="communities-list">
              {communities.map((community, idx) => (
                <div key={idx} className="community-row">
                  <span className="community-letter">{community.charAt(0)}</span>
                  <span className="community-name">{community}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* A few tweets of mine */}
        <section className="profile-card">
          <h2 className="card-title">A few tweets of mine</h2>
          <div className="tweets-row">
            {(tweets.length > 0 && tweets.some(t => t && getTweetIdFromUrl(t))) ? (
              tweets.filter(t => t && getTweetIdFromUrl(t)).slice(0, 3).map((tweetUrl, idx) => (
                <div key={idx} className="tweet-embed-wrapper">
                  <TweetEmbed tweetUrl={tweetUrl} />
                </div>
              ))
            ) : (
              <p className="empty-text">No tweets added yet</p>
            )}
          </div>
        </section>

        {/* My Projects */}
        <section className="profile-card">
          <h2 className="card-title">My projects</h2>
          <div className="projects-row">
            {(projects.length > 0 && projects.some(p => p.title)) ? (
              projects.filter(p => p.title).map((project, idx) => (
                <div key={project.id || idx} className="project-card">
                  <div className="project-image">
                    {(project.image || project.photo) ? (
                      <img src={project.image || project.photo} alt={project.title} />
                    ) : (
                      <div className="project-placeholder">Cuties!</div>
                    )}
                  </div>
                  <div className="project-info">
                    <h3>{project.title}</h3>
                    <p>{project.description}</p>
                    {project.link && <a href={project.link} target="_blank" rel="noopener noreferrer" className="project-link">{project.link}</a>}
                  </div>
                </div>
              ))
            ) : (
              <p className="empty-text">No projects added yet</p>
            )}
          </div>
        </section>

        {/* Description */}
        <section className="profile-card">
          <h2 className="card-title">Description</h2>
          {morePhotos.length > 0 && (
            <div className="description-photos">
              {morePhotos.slice(0, 6).map((photo, idx) => (
                <div key={idx} className="desc-photo">
                  <img src={photo} alt={`Photo ${idx + 1}`} />
                </div>
              ))}
            </div>
          )}
          <div className="description-text">
            {profileUser.freeformDescription || profileUser.bio ? (
              <div dangerouslySetInnerHTML={{ __html: (profileUser.freeformDescription || profileUser.bio).replace(/\n/g, '<br/>') }} />
            ) : profileUser.quickBio ? (
              <>
                <p><strong>{profileUser.quickBio}</strong></p>
                {interests.length > 0 && (
                  <>
                    <p className="section-header">Interested in</p>
                    <p>{interests.join(', ')}</p>
                  </>
                )}
              </>
            ) : (
              <p className="empty-text">No description added yet</p>
            )}
          </div>
        </section>

        {/* Friend Reviews */}
        <section className="profile-card">
          <h2 className="card-title">Friend Reviews</h2>
          <button className="write-review-btn">Write a review</button>
          <div className="reviews-list">
            {testimonials.length > 0 ? (
              testimonials.map((testimonial) => (
                <div key={testimonial.id} className="review-item">
                  <p className="review-text">"{testimonial.content}"</p>
                  {testimonial.author && (
                    <div className="review-author">
                      {testimonial.author.photo && (
                        <img src={testimonial.author.photo} alt={testimonial.author.name} className="review-author-photo" />
                      )}
                      <span className="review-author-name">— {testimonial.author.name}</span>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <p className="empty-text">No reviews yet</p>
            )}
          </div>
        </section>

        {/* Footer */}
        <footer className="profile-footer">
          <div className="footer-content">
            <div className="footer-brand">
              <span className="footer-logo">Cuties!</span>
              <span className="footer-tagline">made by @christinewi</span>
            </div>
            <div className="footer-links">
              <div className="footer-column">
                <span className="footer-heading">Product</span>
                <a href="#">Overview</a>
                <a href="#">Customers</a>
              </div>
              <div className="footer-column">
                <span className="footer-heading">Company</span>
                <a href="#">About</a>
                <a href="#">Jobs</a>
              </div>
              <div className="footer-column">
                <span className="footer-heading">Support</span>
                <a href="#">FAQs</a>
                <a href="#">Contact Us</a>
              </div>
              <div className="footer-column">
                <span className="footer-heading">Legal</span>
                <a href="#">Terms</a>
                <a href="#">Privacy</a>
              </div>
            </div>
          </div>
        </footer>
      </div>

      {/* Vouchers Modal */}
      <VouchersModal
        isOpen={showVouchersModal}
        onClose={() => setShowVouchersModal(false)}
        vouchersFor={vouchersFor}
        vouchedBy={vouchedBy}
        userName={profileUser?.name}
      />
    </div>
  );
};

export default ProfilePage;
