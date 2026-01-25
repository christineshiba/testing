// Centralized community metadata with descriptions
export const communityDescriptions = {
  // Core communities from database
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
  'FuturePARTS': 'Creative technologists exploring art and technology',
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

// Convert slug to community name - must match exactly what's in database
export function slugToName(slug) {
  // Exact mappings for all communities from database
  const slugMappings = {
    // Core communities
    'feytopia': 'Feytopia',
    'fractal': 'Fractal',
    'vibecamp': 'Vibecamp',
    'miguels': 'Miguels',
    'tpot': 'Tpot',
    'interintellect': 'Interintellect',
    'treeweek': 'Treeweek',
    'yincubator': 'Yincubator',
    'vibegala': 'Vibegala',
    'cliffs-of-id': 'Cliffs of Id',
    'vital-williamsburg': 'Vital Williamsburg',
    'art-of-accomplishment': 'Art of Accomplishment',
    'futurecraft': 'Futurecraft',
    'vital-les': 'Vital LES',
    'obnyc': 'OBNYC',
    'outdoor-climbing': 'Outdoor climbing',
    'caulicamp': 'Caulicamp',
    'substack': 'Substack',
    'edge-esmeralda': 'Edge Esmeralda',
    'jesscamp': 'Jesscamp',
    'lessonline': 'LessOnline',
    'sf-commons': 'SF Commons',
    'modern-love-club': 'Modern Love Club',
    'embassy': 'Embassy',
    'merlins-place': "Merlin's Place",
    'fractal-geneva': 'Fractal Geneva',
    'verci': 'Verci',
    'castle': 'Castle',
    'sleepawake': 'Sleepawake',
    'dandelion': 'Dandelion',
    'casa-tilo': 'Casa Tilo',
    'vibeseattle': 'VibeSeattle',
    'church-of-interbeing': 'Church of Interbeing',
    'portal': 'Portal',
    'lightning-society': 'Lightning Society',
    'bookbear-express': 'Bookbear Express',
    'love-mixer': 'Love Mixer',
    'meeting-house': 'Meeting House',
    'beehive': 'Beehive',
    'bebop-house': 'Bebop House',
    'casa-chironja': 'Casa Chironja',
    'small_world': 'small_world',
    'less-wrong': 'Less Wrong',
    'effective-altruism': 'Effective Altruism',
    'word-hack': 'Word Hack',
    // Additional
    'crypto': 'Crypto',
    'farcaster': 'Farcaster',
    'solarpunk': 'Solarpunk',
    'futureparts': 'FuturePARTS',
    'zuzalu': 'Zuzalu',
    'network-state': 'Network State',
    'tech': 'Tech',
    'ai': 'AI',
    'nyc': 'NYC',
    'sf': 'SF',
    'la': 'LA',
    'austin': 'Austin',
    'berlin': 'Berlin',
    'london': 'London',
    'burning-man': 'Burning Man',
    'founders': 'Founders',
    'coliving': 'Coliving',
  };

  if (slugMappings[slug.toLowerCase()]) {
    return slugMappings[slug.toLowerCase()];
  }

  // Fallback: Convert slug to title case
  return slug
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Get description for a community
export function getCommunityDescription(name) {
  return communityDescriptions[name] || `Connect with others in the ${name} community`;
}

// Get community data from name
export function getCommunityData(name) {
  return {
    name,
    slug: name.toLowerCase().replace(/\s+/g, '-').replace(/'/g, ''),
    description: getCommunityDescription(name),
  };
}

// Legacy function for backwards compatibility
export function getCommunityBySlug(slug) {
  const name = slugToName(slug);
  return getCommunityData(name);
}

// Legacy function for backwards compatibility
export function getCommunityByName(name) {
  return getCommunityData(name);
}

// Get all community names (for filtering)
export function getCommunityNames() {
  return Object.keys(communityDescriptions);
}
