import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { fetchCommunityMemberCounts, fetchDiscoverableCommunities, fetchCommunityMemberAvatars, fetchUserCommunities } from '../lib/supabase';
import { MagnifyingGlass, UsersThree, Orange } from '@phosphor-icons/react';
import './CommunitiesContent.css';

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

const CommunitiesContent = () => {
  const { isAuthenticated, currentUser } = useApp();
  const navigate = useNavigate();
  const [memberCounts, setMemberCounts] = useState({});
  const [createdCommunities, setCreatedCommunities] = useState([]);
  const [memberAvatars, setMemberAvatars] = useState({});
  const [userRoles, setUserRoles] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');
  const [sortBy, setSortBy] = useState('size');

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const [counts, created] = await Promise.all([
        fetchCommunityMemberCounts(),
        fetchDiscoverableCommunities(), // Only shows public and semi-public
      ]);
      setMemberCounts(counts);
      setCreatedCommunities(created);
      setLoading(false);

      // Load avatars after main content is ready (non-blocking)
      fetchCommunityMemberAvatars(4).then(setMemberAvatars);
    };
    loadData();
  }, []);

  // Fetch user's community roles
  useEffect(() => {
    const loadUserRoles = async () => {
      if (!currentUser) {
        setUserRoles({});
        return;
      }
      const userCommunities = await fetchUserCommunities(currentUser.id, currentUser.communities);
      const roles = {};
      userCommunities.forEach(c => {
        if (c.role) {
          roles[c.name] = c.role;
          // Also map by slug
          roles[c.slug] = c.role;
        }
      });
      setUserRoles(roles);
    };
    loadUserRoles();
  }, [currentUser]);

  // Combine legacy communities with created communities
  const getAllCommunities = () => {
    const communities = [];

    // Add legacy communities from member counts
    Object.entries(memberCounts).forEach(([name, count]) => {
      const slug = toSlug(name);
      communities.push({
        name,
        slug,
        description: getDescription(name),
        memberCount: count,
        isCreated: false,
        userRole: userRoles[name] || userRoles[slug] || null,
        isCutiesOfficial: true, // Legacy communities are all Cuties official
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
          createdBy: c.created_by,
          userRole: userRoles[c.name] || userRoles[c.slug] || null,
          visibility: c.visibility || 'public',
          isCutiesOfficial: c.is_cuties_official ?? false,
        });
      }
    });

    // Sort: admin first, then moderator, then by selected sort
    const roleOrder = { admin: 0, moderator: 1 };
    return communities.sort((a, b) => {
      const aOrder = roleOrder[a.userRole] ?? 2;
      const bOrder = roleOrder[b.userRole] ?? 2;
      if (aOrder !== bOrder) return aOrder - bOrder;

      // Apply selected sort
      if (sortBy === 'alphabetical') {
        return a.name.localeCompare(b.name);
      }
      // Default: sort by size (member count)
      return b.memberCount - a.memberCount;
    });
  };

  const allCommunities = getAllCommunities();

  // Filter communities by search query and active filter
  const filteredCommunities = allCommunities.filter(c => {
    // Search filter
    if (searchQuery) {
      const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.description.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;
    }

    // Category filter
    if (activeFilter === 'mine') {
      return c.userRole !== null;
    } else if (activeFilter === 'cuties') {
      return c.isCutiesOfficial; // Cuties official communities
    } else if (activeFilter === 'community') {
      // Communities created by users (not Cuties official)
      return !c.isCutiesOfficial;
    }

    return true; // 'all' shows everything
  });

  const handleCommunityClick = (slug) => {
    navigate(`/community/${slug}`);
  };

  return (
    <div className="communities-content">
      <div className="communities-filters">
        <div className="communities-search">
          <MagnifyingGlass size={16} className="search-icon" />
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>
        <button
          className={`filter-pill ${activeFilter === 'all' ? 'active' : ''}`}
          onClick={() => setActiveFilter('all')}
        >
          All
        </button>
        {isAuthenticated && (
          <button
            className={`filter-pill ${activeFilter === 'mine' ? 'active' : ''}`}
            onClick={() => setActiveFilter('mine')}
          >
            Mine
          </button>
        )}
        <button
          className={`filter-pill ${activeFilter === 'cuties' ? 'active' : ''}`}
          onClick={() => setActiveFilter('cuties')}
        >
          Cuties
        </button>
        <button
          className={`filter-pill ${activeFilter === 'community' ? 'active' : ''}`}
          onClick={() => setActiveFilter('community')}
        >
          Community
        </button>
        <div className="sort-dropdown-wrapper">
          <select
            className="sort-dropdown"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="size">Sort by size</option>
            <option value="alphabetical">Sort A-Z</option>
          </select>
        </div>
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
            return (
              <div
                key={community.slug}
                className="community-card"
                onClick={() => handleCommunityClick(community.slug)}
              >
                <div className="community-card-content">
                  {community.photo ? (
                    <img src={community.photo} alt="" className="community-card-avatar" />
                  ) : (
                    <div className={`community-card-avatar gradient-${(index % 6) + 1}`} />
                  )}
                  <div className="community-card-info">
                    <div className="community-card-header">
                      <h3 className="community-name">
                        {community.name}
                        {community.visibility === 'semi-public' && (
                          <span className="visibility-badge semi-public" title="Requires approval to join">
                            <UsersThree size={10} weight="bold" />
                          </span>
                        )}
                      </h3>
                      <div className="card-badges">
                        {community.isCutiesOfficial && (
                          <span className="cuties-badge" title="Cuties Official Community">
                            <Orange size={12} weight="fill" className="cuties-badge-icon" />
                            <span className="cuties-badge-text">Cuties!</span>
                          </span>
                        )}
                        {community.userRole && (community.userRole === 'admin' || community.userRole === 'moderator') && (
                          <span className={`role-badge ${community.userRole}`}>
                            {community.userRole}
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="community-description">{community.description}</p>
                    <div className="community-meta">
                      <span className="community-member-count">
                        {community.memberCount} {community.memberCount === 1 ? 'member' : 'members'}
                      </span>
                    </div>
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
  );
};

export default CommunitiesContent;
