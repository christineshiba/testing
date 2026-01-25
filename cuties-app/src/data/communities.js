// Centralized community metadata
export const communities = [
  {
    id: 'tpot',
    name: 'Tpot',
    slug: 'tpot',
    description: 'Twitter philosophers and thought leaders exploring ideas together',
    color: '#6366f1', // indigo
  },
  {
    id: 'vibecamp',
    name: 'Vibecamp',
    slug: 'vibecamp',
    description: 'Festival community bringing online connections to real life',
    color: '#ec4899', // pink
  },
  {
    id: 'fractal',
    name: 'Fractal',
    slug: 'fractal',
    description: 'Builders and makers creating the future together',
    color: '#14b8a6', // teal
  },
  {
    id: 'sf-commons',
    name: 'SF Commons',
    slug: 'sf-commons',
    description: 'San Francisco community space for curious minds',
    color: '#f97316', // orange
  },
  {
    id: 'crypto',
    name: 'Crypto',
    slug: 'crypto',
    description: 'Web3 builders, traders, and decentralization enthusiasts',
    color: '#8b5cf6', // purple
  },
  {
    id: 'farcaster',
    name: 'Farcaster',
    slug: 'farcaster',
    description: 'Decentralized social network community',
    color: '#7c3aed', // violet
  },
  {
    id: 'outdoor-climbing',
    name: 'Outdoor climbing',
    slug: 'outdoor-climbing',
    description: 'Rock climbers and outdoor adventure seekers',
    color: '#22c55e', // green
  },
  {
    id: 'solarpunk',
    name: 'Solarpunk',
    slug: 'solarpunk',
    description: 'Optimistic futurists building sustainable communities',
    color: '#84cc16', // lime
  },
  {
    id: 'futureparts',
    name: 'FuturePARTS',
    slug: 'futureparts',
    description: 'Creative technologists exploring art and technology',
    color: '#06b6d4', // cyan
  },
  {
    id: 'interintellect',
    name: 'Interintellect',
    slug: 'interintellect',
    description: 'Global community of curious minds hosting salons and discussions',
    color: '#f43f5e', // rose
  },
  {
    id: 'feytopia',
    name: 'Feytopia',
    slug: 'feytopia',
    description: 'Whimsical community exploring creativity and play',
    color: '#a855f7', // fuchsia
  },
];

// Helper function to get community by slug
export function getCommunityBySlug(slug) {
  return communities.find(c => c.slug === slug) || null;
}

// Helper function to get community by name
export function getCommunityByName(name) {
  return communities.find(c => c.name.toLowerCase() === name.toLowerCase()) || null;
}

// Get all community names (for filtering)
export function getCommunityNames() {
  return communities.map(c => c.name);
}
