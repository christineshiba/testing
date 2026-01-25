import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase, fetchUsers, fetchUserById, fetchMutualMatches, fetchMessages, transformUser } from '../lib/supabase';

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
  const [loading, setLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  // Check for existing session on mount
  useEffect(() => {
    const checkSession = async () => {
      // Check for Supabase Auth session
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        // Find the user profile linked to this auth user
        let { data: userData } = await supabase
          .from('users')
          .select('*')
          .eq('auth_id', session.user.id)
          .single();

        // If no profile found by auth_id, try by email (for users who haven't been linked yet)
        if (!userData) {
          const { data: emailUser } = await supabase
            .from('users')
            .select('*')
            .eq('email', session.user.email)
            .single();

          if (emailUser) {
            // Link the auth_id
            await supabase
              .from('users')
              .update({ auth_id: session.user.id })
              .eq('id', emailUser.id);
            userData = emailUser;
          }
        }

        if (userData) {
          setCurrentUser(transformUser(userData));
          setIsAuthenticated(true);
        }
      }
      setLoading(false);
    };

    checkSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        // Small delay to let the callback page handle profile creation
        setTimeout(async () => {
          let { data: userData } = await supabase
            .from('users')
            .select('*')
            .eq('auth_id', session.user.id)
            .single();

          if (!userData) {
            const { data: emailUser } = await supabase
              .from('users')
              .select('*')
              .eq('email', session.user.email)
              .single();
            userData = emailUser;
          }

          if (userData) {
            setCurrentUser(transformUser(userData));
            setIsAuthenticated(true);
          }
        }, 500);
      } else if (event === 'SIGNED_OUT') {
        setCurrentUser(null);
        setIsAuthenticated(false);
        setMatches([]);
        setMessages({});
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Load initial users
  useEffect(() => {
    loadUsers();
  }, []);

  // Load users from Supabase
  const loadUsers = useCallback(async (reset = false) => {
    if (usersLoading) return;

    setUsersLoading(true);
    const newPage = reset ? 0 : page;

    try {
      const newUsers = await fetchUsers({ page: newPage, limit: 20 });

      if (reset) {
        setUsers(newUsers);
        setPage(1);
      } else {
        setUsers(prev => [...prev, ...newUsers]);
        setPage(prev => prev + 1);
      }

      setHasMore(newUsers.length === 20);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setUsersLoading(false);
    }
  }, [page, usersLoading]);

  // Search users
  const searchUsers = useCallback(async (searchTerm) => {
    setUsersLoading(true);
    try {
      const results = await fetchUsers({ page: 0, limit: 50, search: searchTerm });
      setUsers(results);
      setHasMore(false);
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setUsersLoading(false);
    }
  }, []);

  // Send magic link for login
  const sendMagicLink = async (email) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin + '/auth/callback',
      },
    });

    if (error) {
      console.error('Magic link error:', error);
      return false;
    }

    return true;
  };


  const logout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
    setIsAuthenticated(false);
    setMatches([]);
    setMessages({});
    localStorage.removeItem('currentUserId');
  };

  const updateUser = async (updates) => {
    if (!currentUser) return;

    // Update local state immediately
    setCurrentUser(prev => ({ ...prev, ...updates }));

    // Update in database
    const { error } = await supabase
      .from('users')
      .update({
        name: updates.name,
        short_description: updates.quickBio,
        long_description: updates.bio,
        location: updates.location,
        // Add more fields as needed
      })
      .eq('id', currentUser.id);

    if (error) {
      console.error('Error updating user:', error);
    }
  };

  // Like a user
  const likeUser = async (userId) => {
    if (!currentUser) return false;

    const { error } = await supabase
      .from('likes')
      .insert({
        sender_id: currentUser.id,
        receiver_id: userId,
      });

    if (error) {
      console.error('Error liking user:', error);
      return false;
    }

    // Check if it's a mutual match
    const { data: mutualCheck } = await supabase
      .from('likes')
      .select('*')
      .eq('sender_id', userId)
      .eq('receiver_id', currentUser.id)
      .single();

    if (mutualCheck) {
      // It's a match! Reload matches
      const userMatches = await fetchMutualMatches(currentUser.id);
      setMatches(userMatches);
      return 'match';
    }

    return true;
  };

  // Send a message
  const sendMessage = async (recipientId, messageText) => {
    if (!currentUser) return;

    const { data, error } = await supabase
      .from('messages')
      .insert({
        sender_id: currentUser.id,
        recipient_id: recipientId,
        content: messageText,
      })
      .select()
      .single();

    if (error) {
      console.error('Error sending message:', error);
      return;
    }

    // Update local messages state
    const newMessage = {
      id: data.id,
      text: messageText,
      sender: 'me',
      timestamp: new Date(data.created_at),
    };

    setMessages(prev => ({
      ...prev,
      [recipientId]: [...(prev[recipientId] || []), newMessage],
    }));
  };

  // Load messages for a conversation
  const loadMessages = async (otherUserId) => {
    if (!currentUser) return;

    const msgs = await fetchMessages(currentUser.id, otherUserId);
    setMessages(prev => ({
      ...prev,
      [otherUserId]: msgs,
    }));
  };

  // Get user by ID
  const getUserById = useCallback(async (id) => {
    // First check local cache
    const cached = users.find(u => u.id === id);
    if (cached) return cached;

    // Fetch from database
    return await fetchUserById(id);
  }, [users]);

  const value = {
    currentUser,
    users,
    matches,
    messages,
    isAuthenticated,
    loading,
    usersLoading,
    hasMore,
    sendMagicLink,
    logout,
    updateUser,
    likeUser,
    sendMessage,
    loadMessages,
    loadMoreUsers: () => loadUsers(false),
    searchUsers,
    refreshUsers: () => loadUsers(true),
    getMatchedUsers: () => matches,
    getUserById,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
