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
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [matches, setMatches] = useState([]);
  const [messages, setMessages] = useState({});
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Initialize with mock data
  useEffect(() => {
    // Load mock users
    const mockUsers = [
      {
        id: 1,
        name: 'Alex Chen',
        age: 26,
        gender: 'Female',
        location: 'San Francisco, CA',
        bio: '🎨 Artist & Designer | Coffee enthusiast | Love hiking and exploring the city',
        interests: ['Art', 'Hiking', 'Coffee', 'Design'],
        photos: ['https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400'],
        distance: 2,
      },
      {
        id: 2,
        name: 'Jordan Smith',
        age: 24,
        gender: 'Male',
        location: 'San Francisco, CA',
        bio: '📚 Book lover | Tech geek | Always up for a good conversation',
        interests: ['Reading', 'Technology', 'Gaming', 'Music'],
        photos: ['https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400'],
        distance: 3,
      },
      {
        id: 3,
        name: 'Sam Rodriguez',
        age: 28,
        gender: 'Female',
        location: 'San Francisco, CA',
        bio: '🏃‍♀️ Marathon runner | Foodie | Dog parent to two golden retrievers',
        interests: ['Running', 'Food', 'Dogs', 'Travel'],
        photos: ['https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400'],
        distance: 1,
      },
      {
        id: 4,
        name: 'Taylor Kim',
        age: 25,
        gender: 'Male',
        location: 'San Francisco, CA',
        bio: '🎵 Musician | Plant parent | Looking for concert buddies',
        interests: ['Music', 'Plants', 'Concerts', 'Cooking'],
        photos: ['https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400'],
        distance: 4,
      },
      {
        id: 5,
        name: 'Casey Johnson',
        age: 27,
        gender: 'Female',
        location: 'San Francisco, CA',
        bio: '🌊 Surfer | Yoga instructor | Living for those sunset beach vibes',
        interests: ['Surfing', 'Yoga', 'Beach', 'Photography'],
        photos: ['https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=400'],
        distance: 5,
      },
      {
        id: 6,
        name: 'Nathan Park',
        age: 30,
        gender: 'Male',
        location: 'San Francisco, CA',
        bio: 'I really want to fall deeply in love with everyone, but I also want to fight everyone.',
        interests: ['Philosophy', 'Meditation', 'Wood Working', 'Zen'],
        photos: ['https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400'],
        distance: 2,
      },
      {
        id: 7,
        name: 'Jose Luis Ricon',
        age: 32,
        gender: 'Male',
        location: 'San Francisco, CA',
        bio: 'A local SF character that works in biotech and hangs out of House of Prime Rib.',
        interests: ['Biotech', 'Flamenco', 'Dancing', 'Fitness'],
        photos: ['https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400'],
        distance: 3,
      },
      {
        id: 8,
        name: 'Christine Peterson',
        age: 65,
        gender: 'Female',
        location: 'San Mateo, CA',
        bio: 'For decades I built community at Foresight Institute. Now I\'m building online communities for non-dual moms and beyond.',
        interests: ['Community', 'Hosting', 'Meditation'],
        photos: ['https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400'],
        distance: 8,
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
  };

  const addMatch = (userId) => {
    if (!matches.includes(userId)) {
      setMatches([...matches, userId]);
      // Initialize empty message thread
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

    // Simulate response after 1-2 seconds
    setTimeout(() => {
      const responses = [
        "That sounds great! 😊",
        "I'd love to!",
        "When are you free?",
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
    addMatch,
    sendMessage,
    getMatchedUsers: () => users.filter(u => matches.includes(u.id)),
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
