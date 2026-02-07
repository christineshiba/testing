import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { fetchCommunityMemberCounts, fetchCreatedCommunities, fetchCommunityMemberAvatars, fetchUserMemberships } from '../lib/supabase';
import CreateCommunityModal from '../components/CreateCommunityModal';
import { Plus, MagnifyingGlass } from '@phosphor-icons/react';
import './CommunitiesPage.css';

// Helper to create slug from community name
const toSlug = (name) => name.toLowerCase().replace(/\s+/g, '-');

// Community descriptions
const communityDescriptions = {
  'Tpot': 'Twitter philosophers and deep thinkers exploring ideas together',
  'Vibecamp': 'Festival community bringing online connections to real life',
  'Fractal': 'NYC coliving community of builders and creators',
  'Feytopia': 'Whimsical community exploring creativity and play',
  'Interintellect': 'Global community hosting salons and intellectual discussions',
  'Miguels': 'Community gathering space in NYC',
  'Treeweek': 'Nature retreat and outdoor community gathering',
  'Yincubator': 'Incubator community for early-stage founders',
  'Vibegala': 'Celebration and event-focused community',
  'Cliffs of Id': 'Creative community exploring the subconscious',
  'Vital Williamsburg': 'Brooklyn wellness and community space',
  'Art of Accomplishment': 'Personal development and leadership community',
  'Futurecraft': 'Builders creating tools for the future',
  'Vital LES': 'Lower East Side wellness community',
  'OBNYC': 'NYC community of builders and organizers',
  'Outdoor climbing': 'Rock climbers and outdoor adventure seekers',
  'Caulicamp': 'Health-focused retreat community',
  'Substack': 'Independent writers and newsletter creators',
  'Edge Esmeralda': 'Experimental pop-up city and community builders',
  'Jesscamp': 'Intimate gathering and retreat community',
  'LessOnline': 'Rationalist conference and community',
  'SF Commons': 'San Francisco community space for curious minds',
  'Modern Love Club': 'Community exploring relationships and connection',
  'Embassy': 'San Francisco coliving and community house',
  "Merlin's Place": 'Creative gathering space and community',
  'Fractal Geneva': 'European extension of Fractal community',
  'Verci': 'Community house and gathering space',
  'Castle': 'Historic venue for community events',
  'Sleepawake': 'Consciousness and dream exploration community',
  'Dandelion': 'Community spreading seeds of connection',
  'Casa Tilo': 'Latin American coliving community',
  'VibeSeattle': 'Seattle branch of the Vibe community',
  'Church of Interbeing': 'Mindfulness and interconnection community',
  'Portal': 'Gateway community for new connections',
  'Lightning Society': 'Fast-moving builders and innovators',
  'Bookbear Express': 'Book lovers and literary community',
  'Love Mixer': 'Dating and connection events community',
  'Meeting House': 'Community gathering and discussion space',
  'Beehive': 'Collaborative workspace community',
  'Bebop House': 'Music and arts community house',
  'Casa Chironja': 'Caribbean-inspired community space',
  'small_world': 'Intimate community of close connections',
  'Less Wrong': 'Rationality and AI safety focused community',
  'Effective Altruism': 'Doing the most good through evidence and reason',
  'Word Hack': 'Language and wordplay enthusiast community',
  'Crypto': 'Web3 builders, traders, and decentralization enthusiasts',
  'Farcaster': 'Decentralized social network community',
  'Solarpunk': 'Optimistic futurists building sustainable communities',
  'Zuzalu': 'Pop-up city community exploring new ways of living',
  'Network State': 'Building digital-first communities and governance',
  'Tech': 'Builders, founders, and technologists shaping the future',
  'AI': 'Exploring artificial intelligence and its implications',
  'NYC': 'New York City community of ambitious builders',
  'SF': 'San Francisco Bay Area tech and startup community',
  'LA': 'Los Angeles creatives, founders, and dreamers',
  'Austin': 'Texas tech and creative community',
  'Berlin': 'European hub for artists, techies, and free spirits',
  'London': 'UK community of builders and thinkers',
  'Burning Man': 'Burners and radical self-expression enthusiasts',
  'Founders': 'Startup founders and entrepreneurs',
  'Coliving': 'Community living and intentional housing',
};

const getDescription = (name) => {
  if (communityDescriptions[name]) return communityDescriptions[name];
  return `Connect with others in the ${name} community`;
};

const CommunitiesPage = () => {
  const { isAuthenticated, currentUser } = useApp();
  const navigate = useNavigate();
  const [memberCounts, setMemberCounts] = useState({});
  const [createdCommunities, setCreatedCommunities] = useState([]);
  const [memberAvatars, setMemberAvatars] = useState({});
  const [userMemberships, setUserMemberships] = useState({});
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const [counts, created] = await Promise.all([
        fetchCommunityMemberCounts(),
        fetchCreatedCommunities(),
      ]);
      setMemberCounts(counts);
      setCreatedCommunities(created);
      setLoading(false);

      // Load avatars after main content is ready (non-blocking)
      fetchCommunityMemberAvatars(4).then(setMemberAvatars);
    };
    loadData();
  }, []);

  // Fetch user memberships when authenticated
  useEffect(() => {
    const loadMemberships = async () => {
      if (isAuthenticated && currentUser) {
        const memberships = await fetchUserMemberships(currentUser.id, currentUser.communities);
        setUserMemberships(memberships);
      }
    };
    loadMemberships();
  }, [isAuthenticated, currentUser]);

  // Combine legacy communities with created communities
  const getAllCommunities = () => {
    const communities = [];

    // Add legacy communities from member counts
    Object.entries(memberCounts).forEach(([name, count]) => {
      communities.push({
        name,
        slug: toSlug(name),
        description: getDescription(name),
        memberCount: count,
        isCreated: false,
      });
    });

    // Add created communities (avoid duplicates by slug)
    const existingSlugs = new Set(communities.map(c => c.slug));
    createdCommunities.forEach(c => {
      if (!existingSlugs.has(c.slug)) {
        communities.push({
          name: c.name,
          slug: c.slug,
          description: c.description || getDescription(c.name),
          memberCount: c.memberCount || 0,
          isCreated: true,
        });
      }
    });

    // Sort by member count descending
    return communities.sort((a, b) => b.memberCount - a.memberCount);
  };

  const allCommunities = getAllCommunities();

  // Filter communities by search query
  const filteredCommunities = searchQuery
    ? allCommunities.filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : allCommunities;

  const handleCommunityClick = (slug) => {
    navigate(`/community/${slug}`);
  };

  return (
    <div className="communities-page">
      <div className="communities-container">
        <div className="communities-header">
          <div className="communities-header-text">
            <h1>Communities</h1>
            <p>Explore and join communities of interesting people</p>
          </div>
          {isAuthenticated && (
            <button
              className="create-community-btn"
              onClick={() => setShowCreateModal(true)}
            >
              <Plus size={18} weight="bold" />
              Create Community
            </button>
          )}
        </div>

        <div className="communities-search">
          <MagnifyingGlass size={20} className="search-icon" />
          <input
            type="text"
            placeholder="Search communities..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>

        {loading ? (
          <div className="loading-state">
            <p>Loading communities...</p>
          </div>
        ) : filteredCommunities.length === 0 ? (
          <div className="empty-state">
            <p>No communities found matching "{searchQuery}"</p>
          </div>
        ) : (
          <div className="communities-grid">
            {filteredCommunities.map((community, index) => {
              const avatars = memberAvatars[community.name] || [];
              const showAvatars = index < 9 && avatars.length >= 3;
              const userRole = userMemberships[community.name];
              const isMember = !!userRole;
              return (
                <div
                  key={community.slug}
                  className="community-card"
                  onClick={() => handleCommunityClick(community.slug)}
                >
                  {isAuthenticated && (
                    <div className="community-card-badge">
                      {isMember ? (
                        <span className={`role-badge ${userRole}`}>
                          {userRole === 'admin' ? 'Admin' : userRole === 'moderator' ? 'Mod' : 'Member'}
                        </span>
                      ) : (
                        <span className="join-badge">Join</span>
                      )}
                    </div>
                  )}
                  <div className="community-card-content">
                    <h3 className="community-name">{community.name}</h3>
                    <p className="community-description">{community.description}</p>
                    <div className="community-meta">
                      {showAvatars && (
                        <div className="community-avatars">
                          {avatars.slice(0, 3).map((member, idx) => (
                            <img
                              key={member.id}
                              src={member.photo}
                              alt=""
                              className="community-avatar"
                              style={{ zIndex: 3 - idx }}
                            />
                          ))}
                        </div>
                      )}
                      <span className="community-member-count">
                        {community.memberCount} {community.memberCount === 1 ? 'member' : 'members'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!isAuthenticated && (
          <div className="signup-cta">
            <p>Want to create your own community?</p>
            <Link to="/signup" className="signup-btn">Sign up to get started</Link>
          </div>
        )}
      </div>

      <CreateCommunityModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        userId={currentUser?.id}
      />
    </div>
  );
};

export default CommunitiesPage;
