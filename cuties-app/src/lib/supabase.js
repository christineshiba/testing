import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Helper to fix protocol-relative URLs
function fixPhotoUrl(url) {
  if (!url) return null;
  if (url.startsWith('//')) return 'https:' + url;
  return url;
}

// Helper to transform database user to app user format
export function transformUser(dbUser) {
  if (!dbUser) return null;

  return {
    id: dbUser.id,
    name: dbUser.name || dbUser.username || 'Anonymous',
    email: dbUser.email,
    age: dbUser.age,
    gender: dbUser.pronouns || dbUser.gender,
    location: dbUser.new_location || dbUser.location,
    bio: dbUser.long_description,
    quickBio: dbUser.short_description,
    freeformDescription: dbUser.long_description, // Same as bio for now
    interests: dbUser.topics ? dbUser.topics.split(',').map(t => t.trim()) : [],
    photos: (dbUser.photos || []).map(fixPhotoUrl),
    morePhotos: (dbUser.photos || []).map(fixPhotoUrl),
    mainPhoto: fixPhotoUrl(dbUser.main_photo),
    hereFor: dbUser.here_for || [],
    communities: dbUser.communities || [],
    collaborators: dbUser.collaborators || [],
    socials: {
      twitter: dbUser.social_x_handle,
      twitterLink: dbUser.social_x_link,
      instagram: dbUser.social_ig_handle,
      instagramLink: dbUser.social_ig_link,
      substack: dbUser.social_substack_handle,
      substackLink: dbUser.social_substack_link,
      youtube: dbUser.social_youtube_handle,
    },
    spotify: dbUser.spotify_url,
    spotifyEmbed: dbUser.spotify_embed,
    youtube: dbUser.youtube_url, // YouTube video embed URL
    tweets: [dbUser.tweet1_url, dbUser.tweet2_url, dbUser.tweet3_url].filter(Boolean),
    question: dbUser.question,
    promptQuestion: dbUser.question, // Alias for ProfilePage
    premium: dbUser.premium,
    supporterTier: dbUser.supporter_tier,
    showSupporterBadge: dbUser.show_supporter_badge,
    height: dbUser.height_feet ? `${dbUser.height_feet}'${dbUser.height_inches || 0}"` : null,
    kids: dbUser.kids,
    drugs: dbUser.drugs,
    monoPoly: dbUser.mono_poly,
    sexuality: dbUser.sexuality,
    nomadic: dbUser.nomadic,
    // Relationship data
    interestedIn: dbUser.interested_in || [],
    suitors: dbUser.suitors || [],
    mutualMatches: dbUser.mutual_matches || [],
    friends: dbUser.friends_list || [],
    metUpWith: dbUser.met_up_with || [],
    vouchedFor: dbUser.vouched_for || [],
    // Projects and testimonials are loaded separately
    projects: [],
    testimonials: [],
  };
}

// Fetch users for directory (with pagination)
export async function fetchUsers({ page = 0, limit = 20, search = '' } = {}) {
  let query = supabase
    .from('users')
    .select('*')
    .not('name', 'is', null)
    .not('main_photo', 'is', null)
    .neq('paused', true)
    .neq('suspended', true)
    .order('created_at', { ascending: false })
    .range(page * limit, (page + 1) * limit - 1);

  if (search) {
    query = query.or(`name.ilike.%${search}%,short_description.ilike.%${search}%,new_location.ilike.%${search}%,topics.ilike.%${search}%`);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching users:', error);
    return [];
  }

  return data.map(transformUser);
}

// Fetch a single user by ID
export async function fetchUserById(id) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching user:', error);
    return null;
  }

  return transformUser(data);
}

// Fetch a user by username/name
export async function fetchUserByName(name) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .or(`name.eq.${name},username.eq.${name}`)
    .single();

  if (error) {
    console.error('Error fetching user by name:', error);
    return null;
  }

  return transformUser(data);
}

// Fetch users by their names (for relationship data)
export async function fetchUsersByNames(names) {
  if (!names || names.length === 0) return [];

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .in('name', names)
    .neq('paused', true)
    .neq('suspended', true);

  if (error) {
    console.error('Error fetching users by names:', error);
    return [];
  }

  return data.map(transformUser);
}

// Fetch suggested pairings for a user
export async function fetchPairingsFor(userId) {
  const { data, error } = await supabase
    .from('pairings')
    .select(`
      *,
      match1:match1_id(id, name, main_photo, short_description, new_location, age, pronouns, here_for),
      match2:match2_id(id, name, main_photo, short_description, new_location, age, pronouns, here_for)
    `)
    .or(`match1_id.eq.${userId},match2_id.eq.${userId}`);

  if (error) {
    console.error('Error fetching pairings:', error);
    return [];
  }

  // Transform pairings to show the "other" person for the current user
  return data.map(p => {
    const isMatch1 = p.match1_id === userId;
    const otherUser = isMatch1 ? p.match2 : p.match1;
    const otherName = isMatch1 ? (p.match2_name || p.match2?.name) : (p.match1_name || p.match1?.name);

    return {
      id: p.id,
      user: otherUser ? {
        id: otherUser.id,
        name: otherUser.name,
        mainPhoto: fixPhotoUrl(otherUser.main_photo),
        quickBio: otherUser.short_description,
        location: otherUser.new_location,
        age: otherUser.age,
        gender: otherUser.pronouns,
        hereFor: otherUser.here_for || [],
      } : null,
      userName: otherName,
      description: p.description,
      contactInfo: p.contact_info,
      hereFor: p.here_for || [],
      anonymous: p.anonymous,
      createdAt: p.created_at,
    };
  });
}

// Fetch mutual matches for a user
export async function fetchMutualMatches(userId) {
  const { data, error } = await supabase
    .from('mutual_likes')
    .select(`
      user1_id,
      user2_id,
      matched_at
    `)
    .or(`user1_id.eq.${userId},user2_id.eq.${userId}`);

  if (error) {
    console.error('Error fetching matches:', error);
    return [];
  }

  // Get the other user's ID for each match
  const matchUserIds = data.map(m =>
    m.user1_id === userId ? m.user2_id : m.user1_id
  );

  if (matchUserIds.length === 0) return [];

  // Fetch the matched users
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('*')
    .in('id', matchUserIds);

  if (usersError) {
    console.error('Error fetching matched users:', usersError);
    return [];
  }

  return users.map(transformUser);
}

// Fetch messages between two users
export async function fetchMessages(userId1, userId2) {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .or(`and(sender_id.eq.${userId1},recipient_id.eq.${userId2}),and(sender_id.eq.${userId2},recipient_id.eq.${userId1})`)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching messages:', error);
    return [];
  }

  return data.map(msg => ({
    id: msg.id,
    text: msg.content,
    sender: msg.sender_id === userId1 ? 'me' : 'them',
    timestamp: new Date(msg.created_at),
  }));
}

// Fetch friend testimonials for a user
export async function fetchTestimonialsFor(userId) {
  const { data, error } = await supabase
    .from('friend_testimonials')
    .select(`
      *,
      author:author_id(id, name, main_photo)
    `)
    .eq('subject_id', userId);

  if (error) {
    console.error('Error fetching testimonials:', error);
    return [];
  }

  return data.map(t => ({
    id: t.id,
    content: t.content,
    author: t.author ? {
      id: t.author.id,
      name: t.author.name,
      photo: fixPhotoUrl(t.author.main_photo),
    } : null,
    createdAt: new Date(t.created_at),
  }));
}

// Fetch projects for a user
export async function fetchProjectsFor(userId) {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('user_id', userId)
    .order('display_order', { ascending: true });

  if (error) {
    console.error('Error fetching projects:', error);
    return [];
  }

  return data.map(p => ({
    id: p.id,
    title: p.name,
    description: p.description,
    link: p.link,
    photo: p.photo_url,
  }));
}

// Send a like (interest)
export async function sendLike(senderId, receiverId) {
  const { data, error } = await supabase
    .from('likes')
    .insert({ sender_id: senderId, receiver_id: receiverId })
    .select()
    .single();

  if (error) {
    console.error('Error sending like:', error);
    return null;
  }

  return data;
}

// Check if two users have a mutual like
export async function checkMutualLike(userId1, userId2) {
  const { data, error } = await supabase
    .from('mutual_likes')
    .select('*')
    .or(`and(user1_id.eq.${userId1},user2_id.eq.${userId2}),and(user1_id.eq.${userId2},user2_id.eq.${userId1})`)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
    console.error('Error checking mutual like:', error);
    return false;
  }

  return !!data;
}

// Fetch vouchers for multiple users (for directory cards)
export async function fetchVouchersForUsers(userIds) {
  if (!userIds || userIds.length === 0) return {};

  const { data, error } = await supabase
    .from('vouches')
    .select(`
      vouchee_id,
      voucher:voucher_id(id, name, main_photo, paused, suspended)
    `)
    .in('vouchee_id', userIds);

  if (error) {
    console.error('Error fetching vouchers for users:', error);
    return {};
  }

  // Group vouchers by vouchee_id, filtering out paused/suspended vouchers
  const vouchersByUser = {};
  data.forEach(v => {
    if (!v.voucher?.name) return;
    // Skip vouchers from paused or suspended users
    if (v.voucher.paused || v.voucher.suspended) return;
    if (!vouchersByUser[v.vouchee_id]) {
      vouchersByUser[v.vouchee_id] = [];
    }
    vouchersByUser[v.vouchee_id].push({
      userId: v.voucher.id,
      name: v.voucher.name,
      photo: fixPhotoUrl(v.voucher.main_photo),
    });
  });

  return vouchersByUser;
}

// Fetch users who vouched for a given user
export async function fetchVouchersFor(userId) {
  const { data, error } = await supabase
    .from('vouches')
    .select(`
      id,
      created_at,
      voucher:voucher_id(id, name, main_photo, paused, suspended)
    `)
    .eq('vouchee_id', userId);

  if (error) {
    console.error('Error fetching vouchers:', error);
    return [];
  }

  // Filter out paused/suspended vouchers, then map to result format
  return data
    .filter(v => v.voucher?.name && !v.voucher?.paused && !v.voucher?.suspended)
    .map(v => ({
      id: v.id,
      userId: v.voucher.id,
      name: v.voucher.name,
      photo: fixPhotoUrl(v.voucher.main_photo),
      createdAt: v.created_at,
    }));
}

// Fetch users that a given user has vouched for
export async function fetchVouchedBy(userId) {
  const { data, error } = await supabase
    .from('vouches')
    .select(`
      id,
      created_at,
      vouchee:vouchee_id(id, name, main_photo, paused, suspended)
    `)
    .eq('voucher_id', userId);

  if (error) {
    console.error('Error fetching vouched users:', error);
    return [];
  }

  // Filter out paused/suspended vouchees, then map to result format
  return data
    .filter(v => v.vouchee?.name && !v.vouchee?.paused && !v.vouchee?.suspended)
    .map(v => ({
      id: v.id,
      userId: v.vouchee.id,
      name: v.vouchee.name,
      photo: fixPhotoUrl(v.vouchee.main_photo),
      createdAt: v.created_at,
    }));
}

// Check if current user has vouched for another user
export async function checkHasVouched(voucherId, voucheeId) {
  const { data, error } = await supabase
    .from('vouches')
    .select('id')
    .eq('voucher_id', voucherId)
    .eq('vouchee_id', voucheeId)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error checking vouch:', error);
    return false;
  }

  return !!data;
}

// Add a vouch for a user
export async function addVouch(voucherId, voucheeId) {
  const { data, error } = await supabase
    .from('vouches')
    .insert({ voucher_id: voucherId, vouchee_id: voucheeId })
    .select()
    .single();

  if (error) {
    console.error('Error adding vouch:', error);
    return null;
  }

  return data;
}

// Remove a vouch
export async function removeVouch(voucherId, voucheeId) {
  const { error } = await supabase
    .from('vouches')
    .delete()
    .eq('voucher_id', voucherId)
    .eq('vouchee_id', voucheeId);

  if (error) {
    console.error('Error removing vouch:', error);
    return false;
  }

  return true;
}

// ============================================
// CONVERSATIONS & MESSAGING
// ============================================

// Get all conversations for a user (including legacy direct messages)
export async function fetchConversations(userId) {
  // Get conversations the user is part of
  const { data: participations, error: partError } = await supabase
    .from('conversation_participants')
    .select(`
      conversation_id,
      last_read_at,
      conversation:conversation_id(
        id,
        name,
        is_group,
        created_by,
        created_at,
        updated_at
      )
    `)
    .eq('user_id', userId);

  if (partError) {
    console.error('Error fetching conversations:', partError);
  }

  // For each conversation, get participants and last message
  const conversationPromises = (participations || []).map(async (p) => {
    const convo = p.conversation;
    if (!convo) return null;

    // Get participants
    const { data: participants } = await supabase
      .from('conversation_participants')
      .select(`
        user:user_id(id, name, main_photo)
      `)
      .eq('conversation_id', convo.id);

    // Get last message
    const { data: lastMessages } = await supabase
      .from('messages')
      .select('*, sender:sender_id(name)')
      .eq('conversation_id', convo.id)
      .order('created_at', { ascending: false })
      .limit(1);

    const lastMessage = lastMessages?.[0];

    // For 1-on-1 chats, get the other participant
    const otherParticipants = participants
      ?.filter(part => part.user?.id !== userId)
      .map(part => ({
        id: part.user?.id,
        name: part.user?.name,
        photo: fixPhotoUrl(part.user?.main_photo),
      })) || [];

    return {
      id: convo.id,
      name: convo.is_group ? convo.name : otherParticipants[0]?.name,
      isGroup: convo.is_group,
      photo: convo.is_group ? null : otherParticipants[0]?.photo,
      participants: otherParticipants,
      lastMessage: lastMessage?.content,
      lastMessageTime: lastMessage?.created_at,
      lastMessageSender: lastMessage?.sender?.name,
      lastMessageSenderId: lastMessage?.sender_id,
      lastReadAt: p.last_read_at,
      createdAt: convo.created_at,
      isLegacy: false,
    };
  });

  const conversations = await Promise.all(conversationPromises);

  // Also fetch legacy messages (without conversation_id) for backwards compatibility
  const { data: legacyMessages, error: legacyError } = await supabase
    .from('messages')
    .select(`
      *,
      sender:sender_id(id, name, main_photo),
      recipient:recipient_id(id, name, main_photo)
    `)
    .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
    .is('conversation_id', null)
    .order('created_at', { ascending: false });

  if (!legacyError && legacyMessages && legacyMessages.length > 0) {
    // Group legacy messages by conversation partner
    const legacyConversationMap = new Map();

    legacyMessages.forEach(msg => {
      const isFromMe = msg.sender_id === userId;
      const partner = isFromMe ? msg.recipient : msg.sender;
      const partnerId = isFromMe ? msg.recipient_id : msg.sender_id;

      if (!partnerId || !partner) return;

      // Skip if we already have a conversation with this user in the new system
      const existingConvo = conversations.find(c =>
        !c?.isGroup && c?.participants?.some(p => p.id === partnerId)
      );
      if (existingConvo) return;

      if (!legacyConversationMap.has(partnerId)) {
        legacyConversationMap.set(partnerId, {
          id: partnerId, // Use partner ID as the "conversation" ID for legacy
          name: partner.name,
          isGroup: false,
          photo: fixPhotoUrl(partner.main_photo),
          participants: [{
            id: partnerId,
            name: partner.name,
            photo: fixPhotoUrl(partner.main_photo),
          }],
          lastMessage: msg.content,
          lastMessageTime: msg.created_at,
          lastMessageSender: isFromMe ? null : partner.name,
          lastMessageSenderId: msg.sender_id,
          createdAt: msg.created_at,
          isLegacy: true,
        });
      }
    });

    // Add legacy conversations to the list
    conversations.push(...legacyConversationMap.values());
  }

  return conversations
    .filter(Boolean)
    .sort((a, b) => {
      const aTime = a.lastMessageTime || a.createdAt;
      const bTime = b.lastMessageTime || b.createdAt;
      return new Date(bTime) - new Date(aTime);
    });
}

// Get or create a 1-on-1 conversation between two users
export async function getOrCreateDirectConversation(userId1, userId2) {
  // Check if a direct conversation already exists between these users
  const { data: existingParticipations } = await supabase
    .from('conversation_participants')
    .select('conversation_id')
    .eq('user_id', userId1);

  if (existingParticipations) {
    for (const p of existingParticipations) {
      // Check if this conversation has exactly these 2 users and is not a group
      const { data: convo } = await supabase
        .from('conversations')
        .select('id, is_group')
        .eq('id', p.conversation_id)
        .eq('is_group', false)
        .single();

      if (convo) {
        const { data: participants } = await supabase
          .from('conversation_participants')
          .select('user_id')
          .eq('conversation_id', convo.id);

        if (participants?.length === 2) {
          const userIds = participants.map(p => p.user_id);
          if (userIds.includes(userId1) && userIds.includes(userId2)) {
            return convo.id;
          }
        }
      }
    }
  }

  // Create new conversation
  const { data: newConvo, error: convoError } = await supabase
    .from('conversations')
    .insert({
      is_group: false,
      created_by: userId1,
    })
    .select()
    .single();

  if (convoError) {
    console.error('Error creating conversation:', convoError);
    return null;
  }

  // Add both participants
  const { error: partError } = await supabase
    .from('conversation_participants')
    .insert([
      { conversation_id: newConvo.id, user_id: userId1 },
      { conversation_id: newConvo.id, user_id: userId2 },
    ]);

  if (partError) {
    console.error('Error adding participants:', partError);
  }

  return newConvo.id;
}

// Create a group conversation
export async function createGroupConversation(creatorId, name, participantIds) {
  // Create the conversation
  const { data: newConvo, error: convoError } = await supabase
    .from('conversations')
    .insert({
      name,
      is_group: true,
      created_by: creatorId,
    })
    .select()
    .single();

  if (convoError) {
    console.error('Error creating group conversation:', convoError);
    return null;
  }

  // Add all participants including the creator
  const allParticipants = [...new Set([creatorId, ...participantIds])];
  const { error: partError } = await supabase
    .from('conversation_participants')
    .insert(
      allParticipants.map(userId => ({
        conversation_id: newConvo.id,
        user_id: userId,
      }))
    );

  if (partError) {
    console.error('Error adding participants:', partError);
  }

  return newConvo.id;
}

// Get messages for a conversation (including legacy messages for 1-on-1 chats)
export async function fetchConversationMessages(conversationId, participantIds = null) {
  // Fetch messages with this conversation_id
  const { data, error } = await supabase
    .from('messages')
    .select(`
      *,
      sender:sender_id(id, name, main_photo)
    `)
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching conversation messages:', error);
    return [];
  }

  let allMessages = data || [];

  // For 1-on-1 chats, also fetch legacy messages (without conversation_id)
  if (participantIds && participantIds.length === 2) {
    const [user1, user2] = participantIds;
    const { data: legacyData, error: legacyError } = await supabase
      .from('messages')
      .select(`
        *,
        sender:sender_id(id, name, main_photo)
      `)
      .is('conversation_id', null)
      .or(`and(sender_id.eq.${user1},recipient_id.eq.${user2}),and(sender_id.eq.${user2},recipient_id.eq.${user1})`)
      .order('created_at', { ascending: true });

    if (!legacyError && legacyData) {
      allMessages = [...allMessages, ...legacyData];
      // Sort by created_at
      allMessages.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    }
  }

  return allMessages.map(msg => ({
    id: msg.id,
    content: msg.content,
    senderId: msg.sender_id,
    senderName: msg.sender?.name,
    senderPhoto: fixPhotoUrl(msg.sender?.main_photo),
    createdAt: msg.created_at,
  }));
}

// Send a message to a conversation
export async function sendConversationMessage(conversationId, senderId, content) {
  const { data, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_id: senderId,
      content,
    })
    .select(`
      *,
      sender:sender_id(id, name, main_photo)
    `)
    .single();

  if (error) {
    console.error('Error sending message:', error);
    return null;
  }

  // Update conversation's updated_at
  await supabase
    .from('conversations')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', conversationId);

  return {
    id: data.id,
    content: data.content,
    senderId: data.sender_id,
    senderName: data.sender?.name,
    senderPhoto: fixPhotoUrl(data.sender?.main_photo),
    createdAt: data.created_at,
  };
}

// Get conversation details
export async function fetchConversationDetails(conversationId) {
  const { data: convo, error } = await supabase
    .from('conversations')
    .select('*')
    .eq('id', conversationId)
    .single();

  if (error) {
    console.error('Error fetching conversation:', error);
    return null;
  }

  // Get participants
  const { data: participants } = await supabase
    .from('conversation_participants')
    .select(`
      user:user_id(id, name, main_photo, short_description)
    `)
    .eq('conversation_id', conversationId);

  return {
    id: convo.id,
    name: convo.name,
    isGroup: convo.is_group,
    createdBy: convo.created_by,
    participants: participants?.map(p => ({
      id: p.user?.id,
      name: p.user?.name,
      photo: fixPhotoUrl(p.user?.main_photo),
      bio: p.user?.short_description,
    })) || [],
  };
}

// Add participant to group
export async function addParticipantToGroup(conversationId, userId) {
  const { error } = await supabase
    .from('conversation_participants')
    .insert({
      conversation_id: conversationId,
      user_id: userId,
    });

  if (error) {
    console.error('Error adding participant:', error);
    return false;
  }

  return true;
}

// Leave a conversation
export async function leaveConversation(conversationId, userId) {
  const { error } = await supabase
    .from('conversation_participants')
    .delete()
    .eq('conversation_id', conversationId)
    .eq('user_id', userId);

  if (error) {
    console.error('Error leaving conversation:', error);
    return false;
  }

  return true;
}

// Fetch member counts for all communities
// Only counts users with name and photo (same as directory filter)
export async function fetchCommunityMemberCounts() {
  const { data, error } = await supabase
    .from('users')
    .select('communities')
    .not('communities', 'is', null)
    .not('name', 'is', null)
    .not('main_photo', 'is', null)
    .neq('paused', true)
    .neq('suspended', true);

  if (error) {
    console.error('Error fetching community member counts:', error);
    return {};
  }

  // Count members per community
  const counts = {};
  data.forEach(user => {
    if (user.communities && Array.isArray(user.communities)) {
      user.communities.forEach(community => {
        counts[community] = (counts[community] || 0) + 1;
      });
    }
  });

  return counts;
}

// Fetch users filtered by community
export async function fetchUsersByCommunity(communityName, { page = 0, limit = 20, search = '' } = {}) {
  let query = supabase
    .from('users')
    .select('*')
    .not('name', 'is', null)
    .not('main_photo', 'is', null)
    .neq('paused', true)
    .neq('suspended', true)
    .contains('communities', [communityName])
    .order('created_at', { ascending: false })
    .range(page * limit, (page + 1) * limit - 1);

  if (search) {
    query = query.or(`name.ilike.%${search}%,short_description.ilike.%${search}%,new_location.ilike.%${search}%`);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching users by community:', error);
    return [];
  }

  return data.map(transformUser);
}

// Fetch sample user avatars for social proof
export async function fetchSampleUserAvatars(limit = 8) {
  const { data, error } = await supabase
    .from('users')
    .select('id, main_photo')
    .not('main_photo', 'is', null)
    .neq('paused', true)
    .neq('suspended', true)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching sample avatars:', error);
    return [];
  }

  return data.map(u => ({
    id: u.id,
    photo: fixPhotoUrl(u.main_photo),
  }));
}

// Get total user count
export async function fetchTotalUserCount() {
  const { count, error } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })
    .not('name', 'is', null)
    .neq('paused', true)
    .neq('suspended', true);

  if (error) {
    console.error('Error fetching user count:', error);
    return 0;
  }

  return count || 0;
}

// ============================================
// COMMUNITY MEMBERSHIP FUNCTIONS
// ============================================

// Join a community (add to user's communities array)
export async function joinCommunity(userId, communityName) {
  // First get current communities
  const { data: user, error: fetchError } = await supabase
    .from('users')
    .select('communities')
    .eq('id', userId)
    .single();

  if (fetchError) {
    console.error('Error fetching user communities:', fetchError);
    return { success: false, error: fetchError };
  }

  const currentCommunities = user.communities || [];

  // Check if already a member
  if (currentCommunities.includes(communityName)) {
    return { success: true, alreadyMember: true };
  }

  // Add new community
  const newCommunities = [...currentCommunities, communityName];

  const { error: updateError } = await supabase
    .from('users')
    .update({ communities: newCommunities })
    .eq('id', userId);

  if (updateError) {
    console.error('Error joining community:', updateError);
    return { success: false, error: updateError };
  }

  return { success: true, communities: newCommunities };
}

// Leave a community (remove from user's communities array)
export async function leaveCommunity(userId, communityName) {
  // First get current communities
  const { data: user, error: fetchError } = await supabase
    .from('users')
    .select('communities')
    .eq('id', userId)
    .single();

  if (fetchError) {
    console.error('Error fetching user communities:', fetchError);
    return { success: false, error: fetchError };
  }

  const currentCommunities = user.communities || [];

  // Check if not a member
  if (!currentCommunities.includes(communityName)) {
    return { success: true, notMember: true };
  }

  // Remove community
  const newCommunities = currentCommunities.filter(c => c !== communityName);

  const { error: updateError } = await supabase
    .from('users')
    .update({ communities: newCommunities })
    .eq('id', userId);

  if (updateError) {
    console.error('Error leaving community:', updateError);
    return { success: false, error: updateError };
  }

  return { success: true, communities: newCommunities };
}

// Check if user is a member of a community
export async function isUserInCommunity(userId, communityName) {
  const { data: user, error } = await supabase
    .from('users')
    .select('communities')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Error checking community membership:', error);
    return false;
  }

  return (user.communities || []).includes(communityName);
}

// ============================================
// COMMUNITY POSTS FUNCTIONS
// ============================================

// Create a new community post
export async function createCommunityPost(authorId, communityName, content) {
  const { data, error } = await supabase
    .from('community_posts')
    .insert({
      author_id: authorId,
      community_name: communityName,
      content: content,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating post:', error);
    return null;
  }

  return data;
}

// Fetch community posts
export async function fetchCommunityPosts(communityName, { page = 0, limit = 20 } = {}) {
  const { data, error } = await supabase
    .from('community_posts')
    .select(`
      *,
      author:users!community_posts_author_id_fkey(id, name, main_photo)
    `)
    .eq('community_name', communityName)
    .order('created_at', { ascending: false })
    .range(page * limit, (page + 1) * limit - 1);

  if (error) {
    console.error('Error fetching community posts:', error);
    return [];
  }

  return data.map(post => ({
    ...post,
    author: post.author ? {
      id: post.author.id,
      name: post.author.name,
      photo: fixPhotoUrl(post.author.main_photo),
    } : null,
  }));
}

// Like a post
export async function likePost(userId, postId) {
  const { error } = await supabase
    .from('post_likes')
    .insert({ user_id: userId, post_id: postId });

  if (error && error.code !== '23505') { // Ignore duplicate key error
    console.error('Error liking post:', error);
    return false;
  }

  return true;
}

// Unlike a post
export async function unlikePost(userId, postId) {
  const { error } = await supabase
    .from('post_likes')
    .delete()
    .eq('user_id', userId)
    .eq('post_id', postId);

  if (error) {
    console.error('Error unliking post:', error);
    return false;
  }

  return true;
}

// Get like count and whether user liked a post
export async function getPostLikes(postId, userId) {
  const { count, error: countError } = await supabase
    .from('post_likes')
    .select('*', { count: 'exact', head: true })
    .eq('post_id', postId);

  if (countError) {
    console.error('Error getting like count:', countError);
    return { count: 0, userLiked: false };
  }

  const { data: userLike, error: userError } = await supabase
    .from('post_likes')
    .select('id')
    .eq('post_id', postId)
    .eq('user_id', userId)
    .maybeSingle();

  return {
    count: count || 0,
    userLiked: !!userLike && !userError,
  };
}

// Add a comment to a post
export async function addPostComment(userId, postId, content) {
  const { data, error } = await supabase
    .from('post_comments')
    .insert({
      author_id: userId,
      post_id: postId,
      content: content,
    })
    .select(`
      *,
      author:users!post_comments_author_id_fkey(id, name, main_photo)
    `)
    .single();

  if (error) {
    console.error('Error adding comment:', error);
    return null;
  }

  return {
    ...data,
    author: data.author ? {
      id: data.author.id,
      name: data.author.name,
      photo: fixPhotoUrl(data.author.main_photo),
    } : null,
  };
}

// Fetch comments for a post
export async function fetchPostComments(postId) {
  const { data, error } = await supabase
    .from('post_comments')
    .select(`
      *,
      author:users!post_comments_author_id_fkey(id, name, main_photo)
    `)
    .eq('post_id', postId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching comments:', error);
    return [];
  }

  return data.map(comment => ({
    ...comment,
    author: comment.author ? {
      id: comment.author.id,
      name: comment.author.name,
      photo: fixPhotoUrl(comment.author.main_photo),
    } : null,
  }));
}
