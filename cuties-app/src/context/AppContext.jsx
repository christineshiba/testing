import { createContext, useContext, useState, useEffect } from 'react';

const AppContext = createContext();

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
};

export const AppProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('currentUser');
    return saved ? JSON.parse(saved) : {
      id: 999,
      name: 'Demo User',
      age: 25,
      gender: 'They / Them',
      location: 'San Francisco, CA',
      bio: 'Just exploring the app!',
      quickBio: 'Exploring cuties.app',
      interests: ['Technology', 'Art', 'Music'],
      photos: ['https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400'],
      hereFor: ['Friends', 'Love'],
      communities: ['Vibecamp'],
      socials: {},
    };
  });
  const [users, setUsers] = useState([]);
  const [matches, setMatches] = useState(() => {
    const saved = localStorage.getItem('matches');
    return saved ? JSON.parse(saved) : [];
  });
  const [messages, setMessages] = useState(() => {
    const saved = localStorage.getItem('messages');
    return saved ? JSON.parse(saved) : {};
  });
  const [isAuthenticated, setIsAuthenticated] = useState(true);

  // Persist currentUser to localStorage
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('currentUser', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('currentUser');
    }
  }, [currentUser]);

  // Persist authentication state
  useEffect(() => {
    localStorage.setItem('isAuthenticated', isAuthenticated);
  }, [isAuthenticated]);

  // Persist matches
  useEffect(() => {
    localStorage.setItem('matches', JSON.stringify(matches));
  }, [matches]);

  // Persist messages
  useEffect(() => {
    localStorage.setItem('messages', JSON.stringify(messages));
  }, [messages]);

  // Initialize with rich mock data
  useEffect(() => {
    const mockUsers = [
      {
        id: 1,
        name: 'Alex Chen',
        age: 26,
        gender: 'She / Her',
        location: 'San Francisco, CA',
        bio: 'Artist & Designer | Coffee enthusiast | Love hiking and exploring the city',
        quickBio: 'SF creative making things',
        interests: ['Art', 'Hiking', 'Coffee', 'Design', 'Photography'],
        photos: ['https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400'],
        distance: 2,
        hereFor: ['Love', 'Friends'],
        communities: ['Crypto', 'Farcaster', 'Vibecamp'],
        socials: { twitter: 'alexchen', instagram: 'alexchen.art' },
        spotify: 'https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT',
        youtube: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        tweets: [
          'https://x.com/sama/status/1745875097498370293',
          'https://twitter.com/OpenAI/status/1745475054840762408'
        ],
        projects: [
          { title: 'Design Studio', link: 'https://alexchen.design', description: 'Freelance design work' }
        ],
        promptQuestion: 'What creative projects are you working on?',
      },
      {
        id: 2,
        name: 'Jordan Smith',
        age: 24,
        gender: 'He / Him',
        location: 'San Francisco, CA',
        bio: 'Book lover | Tech geek | Always up for a good conversation',
        quickBio: 'Building cool things at a startup',
        interests: ['Reading', 'Technology', 'Gaming', 'Music', 'Startups'],
        photos: ['https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400'],
        distance: 3,
        hereFor: ['Friends', 'Collaboration'],
        communities: ['Crypto', 'SF Commons', 'Solarpunk'],
        socials: { twitter: 'jordansmith', instagram: 'jordan.codes' },
        projects: [
          { title: 'Open Source CLI', link: 'https://github.com/jordan', description: 'Developer tools' }
        ],
        promptQuestion: 'What book changed your perspective?',
      },
      {
        id: 3,
        name: 'Sam Rodriguez',
        age: 28,
        gender: 'She / Her',
        location: 'Oakland, CA',
        bio: 'Marathon runner | Foodie | Dog parent to two golden retrievers',
        quickBio: 'Running and cooking my way through life',
        interests: ['Running', 'Food', 'Dogs', 'Travel', 'Wellness'],
        photos: ['https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400'],
        distance: 5,
        hereFor: ['Love', 'Friends'],
        communities: ['Outdoor climbing', 'Vibecamp'],
        socials: { twitter: 'samruns', instagram: 'sam.and.dogs' },
        youtube: 'https://www.youtube.com/watch?v=jNQXAC9IVRw',
        promptQuestion: 'Best trail you have ever run?',
      },
      {
        id: 4,
        name: 'Taylor Kim',
        age: 25,
        gender: 'They / Them',
        location: 'Berkeley, CA',
        bio: 'Musician | Plant parent | Looking for concert buddies',
        quickBio: 'Making music and growing plants',
        interests: ['Music', 'Plants', 'Concerts', 'Cooking', 'Meditation'],
        photos: ['https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400'],
        distance: 4,
        hereFor: ['Friends', 'Collaboration'],
        communities: ['Fractal', 'Solarpunk', 'Vibecamp'],
        socials: { twitter: 'taylorkim', instagram: 'taylor.tunes' },
        spotify: 'https://open.spotify.com/track/0VjIjW4GlUZAMYd2vXMi3b',
        projects: [
          { title: 'Ambient Album', link: 'https://spotify.com', description: 'Electronic ambient music' }
        ],
        promptQuestion: 'What song is stuck in your head?',
      },
      {
        id: 5,
        name: 'Casey Johnson',
        age: 27,
        gender: 'She / Her',
        location: 'Santa Cruz, CA',
        bio: 'Surfer | Yoga instructor | Living for those sunset beach vibes',
        quickBio: 'Beach life and mindfulness',
        interests: ['Surfing', 'Yoga', 'Beach', 'Photography', 'Wellness'],
        photos: ['https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=400'],
        distance: 8,
        hereFor: ['Love'],
        communities: ['Outdoor climbing', 'Vibecamp'],
        socials: { twitter: 'caseysurf', instagram: 'casey.waves' },
        promptQuestion: 'Sunrise or sunset surf session?',
      },
      {
        id: 6,
        name: 'Nathan Park',
        age: 30,
        gender: 'He / Him',
        location: 'San Francisco, CA',
        bio: 'I really want to fall deeply in love with everyone, but I also want to fight everyone.',
        quickBio: 'Philosopher and woodworker',
        interests: ['Philosophy', 'Meditation', 'Woodworking', 'Zen', 'Martial Arts'],
        photos: ['https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400'],
        distance: 2,
        hereFor: ['Love', 'Friends', 'Collaboration'],
        communities: ['Fractal', 'SF Commons', 'Megavn'],
        socials: { twitter: 'nathanpark', instagram: 'nathan.crafts' },
        projects: [
          { title: 'Handmade Furniture', link: 'https://nathanpark.com', description: 'Custom woodworking' }
        ],
        promptQuestion: 'What paradox do you live with?',
      },
      {
        id: 7,
        name: 'Jose Luis Ricon',
        age: 32,
        gender: 'He / Him',
        location: 'San Francisco, CA',
        bio: 'A local SF character that works in biotech and hangs out at House of Prime Rib.',
        quickBio: 'Biotech researcher and foodie',
        interests: ['Biotech', 'Flamenco', 'Dancing', 'Fitness', 'Science'],
        photos: ['https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400'],
        distance: 3,
        hereFor: ['Friends', 'Collaboration'],
        communities: ['Crypto', 'FuturePARTS', 'SF Commons'],
        socials: { twitter: 'jose_a_ricon', instagram: 'joseluis.sf' },
        projects: [
          { title: 'Longevity Research', link: 'https://nintil.com', description: 'Writing about science and progress' }
        ],
        promptQuestion: 'What scientific breakthrough excites you most?',
      },
      {
        id: 8,
        name: 'Maya Patel',
        age: 29,
        gender: 'She / Her',
        location: 'Palo Alto, CA',
        bio: 'AI researcher by day, salsa dancer by night. Building the future while staying grounded.',
        quickBio: 'AI + dance + good vibes',
        interests: ['AI', 'Dancing', 'Research', 'Startups', 'Travel'],
        photos: ['https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400'],
        distance: 6,
        hereFor: ['Love', 'Collaboration'],
        communities: ['Crypto', 'FuturePARTS', 'Vibecamp'],
        socials: { twitter: 'mayapatel_ai', instagram: 'maya.dances' },
        spotify: 'https://open.spotify.com/playlist/example',
        projects: [
          { title: 'AI Safety Research', link: 'https://mayapatel.ai', description: 'Working on alignment' }
        ],
        promptQuestion: 'How do you balance ambition with presence?',
      },
      {
        id: 9,
        name: 'River Chen',
        age: 31,
        gender: 'They / Them',
        location: 'Oakland, CA',
        bio: 'Community organizer | Urban farmer | Believe in the power of local food systems',
        quickBio: 'Growing food and community',
        interests: ['Farming', 'Community', 'Sustainability', 'Cooking', 'Education'],
        photos: ['https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400'],
        distance: 5,
        hereFor: ['Friends', 'Collaboration'],
        communities: ['Solarpunk', 'SF Commons', 'Fractal'],
        socials: { twitter: 'riverchen', instagram: 'river.grows' },
        projects: [
          { title: 'Oakland Urban Farm', link: 'https://oaklandfarm.org', description: 'Community supported agriculture' }
        ],
        promptQuestion: 'What does community mean to you?',
      },
      {
        id: 10,
        name: 'Zoe Williams',
        age: 26,
        gender: 'She / Her',
        location: 'San Francisco, CA',
        bio: 'Writer and podcast host exploring the intersection of tech and humanity',
        quickBio: 'Telling stories that matter',
        interests: ['Writing', 'Podcasting', 'Technology', 'Philosophy', 'Interviews'],
        photos: ['https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400'],
        distance: 1,
        hereFor: ['Friends', 'Collaboration'],
        communities: ['Farcaster', 'Vibecamp', 'SF Commons'],
        socials: { twitter: 'zoewrites', instagram: 'zoe.stories' },
        youtube: 'https://youtube.com/zoepodcast',
        projects: [
          { title: 'Human Tech Podcast', link: 'https://humantech.fm', description: 'Weekly conversations' }
        ],
        promptQuestion: 'What story do you want to tell?',
      },
    ];
    setUsers(mockUsers);
  }, []);

  const login = (user) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
  };

  const logout = () => {
    setCurrentUser(null);
    setIsAuthenticated(false);
    setMatches([]);
    setMessages({});
    localStorage.removeItem('currentUser');
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('matches');
    localStorage.removeItem('messages');
  };

  const updateUser = (updates) => {
    setCurrentUser(prev => ({ ...prev, ...updates }));
  };

  const addMatch = (userId) => {
    if (!matches.includes(userId)) {
      setMatches([...matches, userId]);
      setMessages(prev => ({
        ...prev,
        [userId]: []
      }));
    }
  };

  const sendMessage = (userId, message) => {
    const newMessage = {
      id: Date.now(),
      text: message,
      sender: 'me',
      timestamp: new Date(),
    };

    setMessages(prev => ({
      ...prev,
      [userId]: [...(prev[userId] || []), newMessage]
    }));

    setTimeout(() => {
      const responses = [
        "That sounds great!",
        "I'd love to chat more about that!",
        "When are you free to meet up?",
        "That's so cool!",
        "Tell me more!",
      ];
      const response = {
        id: Date.now(),
        text: responses[Math.floor(Math.random() * responses.length)],
        sender: 'them',
        timestamp: new Date(),
      };

      setMessages(prev => ({
        ...prev,
        [userId]: [...(prev[userId] || []), response]
      }));
    }, 1000 + Math.random() * 1000);
  };

  const value = {
    currentUser,
    users,
    matches,
    messages,
    isAuthenticated,
    login,
    logout,
    updateUser,
    addMatch,
    sendMessage,
    getMatchedUsers: () => users.filter(u => matches.includes(u.id)),
    getUserById: (id) => users.find(u => u.id === parseInt(id)),
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
