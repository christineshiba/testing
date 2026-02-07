import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Cuties platform admin email
export const CUTIES_ADMIN_EMAIL = 'christinetshiba@gmail.com';

// Check if a user is a Cuties platform admin
export function isCutiesAdmin(user) {
  return user?.email === CUTIES_ADMIN_EMAIL;
}

// Helper to fix protocol-relative URLs
function fixPhotoUrl(url) {
  if (!url) return null;
  if (url.startsWith('//')) return 'https:' + url;
  return url;
}

// Upload community photo to Supabase Storage
export async function uploadCommunityPhoto(file, communitySlug) {
  // Generate unique filename
  const fileExt = file.name?.split('.').pop() || 'jpg';
  const fileName = `${communitySlug}-${Date.now()}.${fileExt}`;
  const filePath = `community-photos/${fileName}`;

  const { data, error } = await supabase.storage
    .from('photos')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) {
    console.error('Error uploading community photo:', error);
    return { error };
  }

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('photos')
    .getPublicUrl(filePath);

  return { url: publicUrl };
}

// Convert base64 data URL to File object
function dataURLtoFile(dataUrl, filename) {
  const arr = dataUrl.split(',');
  const mime = arr[0].match(/:(.*?);/)[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, { type: mime });
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
    heightFeet: dbUser.height_feet,
    heightInches: dbUser.height_inches,
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

// Fetch testimonials for landing page (random sample)
export async function fetchLandingPageTestimonials(limit = 30) {
  const { data, error } = await supabase
    .from('friend_testimonials')
    .select(`
      id,
      content,
      author:author_id(id, name, username)
    `)
    .not('content', 'is', null)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching landing page testimonials:', error);
    return [];
  }

  return data.map(t => ({
    id: t.id,
    text: t.content,
    author: t.author?.name || t.author?.username || 'anonymous',
  }));
}

// Fetch friend testimonials for a user
export async function fetchTestimonialsFor(userId) {
  const { data, error } = await supabase
    .from('friend_testimonials')
    .select(`
      *,
      author:author_id(id, name, username, main_photo)
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
      name: t.author.name || t.author.username, // Fallback to username if name is null
      photo: fixPhotoUrl(t.author.main_photo),
    } : null,
    createdAt: new Date(t.created_at),
  }));
}

// Fetch projects for a user
export async function fetchProjectsFor(userId) {
  // First try to get projects from users table (JSON format)
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('projects_json')
    .eq('id', userId)
    .single();

  if (!userError && userData?.projects_json && Array.isArray(userData.projects_json)) {
    return userData.projects_json;
  }

  // Fallback to projects table (legacy)
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
    image: p.photo_url,
  }));
}

// Save/update projects for a user (stores as JSON in users table to avoid RLS issues)
export async function saveProjectsFor(userId, projects) {
  if (!userId || !projects) return { error: 'Invalid input' };

  // Filter out empty projects (no title and no image)
  const validProjects = projects.filter(p => p.title || p.image).map((p, index) => ({
    title: p.title || '',
    description: p.description || '',
    link: p.link || '',
    image: p.image || null,
    display_order: index,
  }));

  // Store projects as JSON in the users table
  const { error } = await supabase
    .from('users')
    .update({ projects_json: validProjects })
    .eq('id', userId);

  if (error) {
    console.error('Error saving projects:', error);
    return { error };
  }

  return { data: validProjects };
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

// Fetch all unique communities from database (sorted by member count)
export async function fetchAllCommunities() {
  const counts = await fetchCommunityMemberCounts();
  // Sort by member count descending
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([name]) => name);
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

// Fetch sample member avatars for communities (for social proof)
export async function fetchCommunityMemberAvatars(limit = 4) {
  const { data, error } = await supabase
    .from('users')
    .select('id, main_photo, communities')
    .not('communities', 'is', null)
    .not('main_photo', 'is', null)
    .neq('paused', true)
    .neq('suspended', true)
    .limit(150);

  if (error) {
    console.error('Error fetching community member avatars:', error);
    return {};
  }

  // Group avatars by community
  const avatarsByCommunity = {};
  data.forEach(user => {
    if (user.communities && Array.isArray(user.communities)) {
      user.communities.forEach(community => {
        if (!avatarsByCommunity[community]) {
          avatarsByCommunity[community] = [];
        }
        if (avatarsByCommunity[community].length < limit) {
          avatarsByCommunity[community].push({
            id: user.id,
            photo: fixPhotoUrl(user.main_photo),
          });
        }
      });
    }
  });

  return avatarsByCommunity;
}

// Fetch users filtered by community
export async function fetchUsersByCommunity(communityName, { page = 0, limit = 20, search = '', communityId = null } = {}) {
  // Fetch users who have the community in their profile (legacy)
  let legacyQuery = supabase
    .from('users')
    .select('*')
    .not('name', 'is', null)
    .not('main_photo', 'is', null)
    .neq('paused', true)
    .neq('suspended', true)
    .contains('communities', [communityName]);

  if (search) {
    legacyQuery = legacyQuery.or(`name.ilike.%${search}%,short_description.ilike.%${search}%,new_location.ilike.%${search}%`);
  }

  const { data: legacyData, error: legacyError } = await legacyQuery;

  if (legacyError) {
    console.error('Error fetching users by community:', legacyError);
  }

  const legacyUsers = legacyData ? legacyData.map(transformUser) : [];

  // If there's a communityId, also fetch from community_members table
  let memberUsers = [];
  if (communityId) {
    let memberQuery = supabase
      .from('community_members')
      .select(`
        user:user_id(*)
      `)
      .eq('community_id', communityId);

    const { data: memberData, error: memberError } = await memberQuery;

    if (memberError) {
      console.error('Error fetching community members:', memberError);
    } else if (memberData) {
      // Transform and filter member users
      memberUsers = memberData
        .filter(m => m.user && m.user.name && m.user.main_photo && !m.user.paused && !m.user.suspended)
        .map(m => transformUser(m.user));

      // Apply search filter if provided
      if (search) {
        const searchLower = search.toLowerCase();
        memberUsers = memberUsers.filter(u =>
          u.name?.toLowerCase().includes(searchLower) ||
          u.bio?.toLowerCase().includes(searchLower) ||
          u.location?.toLowerCase().includes(searchLower)
        );
      }
    }
  }

  // Combine and deduplicate by user ID
  const userMap = new Map();
  [...legacyUsers, ...memberUsers].forEach(user => {
    if (!userMap.has(user.id)) {
      userMap.set(user.id, user);
    }
  });

  // Convert to array, sort, and paginate
  const allUsers = Array.from(userMap.values())
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

  // Apply pagination
  const start = page * limit;
  const end = start + limit;
  return allUsers.slice(start, end);
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

// Fetch community posts (only top-level, not replies)
export async function fetchCommunityPosts(communityName, { page = 0, limit = 20 } = {}) {
  const { data, error } = await supabase
    .from('community_posts')
    .select(`
      *,
      author:users!community_posts_author_id_fkey(id, name, main_photo)
    `)
    .eq('community_name', communityName)
    .is('parent_id', null)
    .order('created_at', { ascending: false })
    .range(page * limit, (page + 1) * limit - 1);

  if (error) {
    console.error('Error fetching community posts:', error);
    return [];
  }

  // Get reply counts for each post
  const postsWithCounts = await Promise.all(data.map(async (post) => {
    const { count } = await supabase
      .from('community_posts')
      .select('*', { count: 'exact', head: true })
      .eq('parent_id', post.id);

    return {
      ...post,
      author: post.author ? {
        id: post.author.id,
        name: post.author.name,
        photo: fixPhotoUrl(post.author.main_photo),
      } : null,
      replyCount: count || 0,
    };
  }));

  return postsWithCounts;
}

// Fetch thread replies for a post
export async function fetchPostReplies(parentId) {
  const { data, error } = await supabase
    .from('community_posts')
    .select(`
      *,
      author:users!community_posts_author_id_fkey(id, name, main_photo)
    `)
    .eq('parent_id', parentId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching post replies:', error);
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

// Create a reply to a post (thread)
export async function createPostReply(authorId, communityName, content, parentId) {
  const { data, error } = await supabase
    .from('community_posts')
    .insert({
      author_id: authorId,
      community_name: communityName,
      content: content,
      parent_id: parentId,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating reply:', error);
    return null;
  }

  return data;
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

// ============================================
// COMMUNITY CHANNELS FUNCTIONS
// ============================================

// Create a new channel
export async function createChannel(communityName, name, description, isPrivate, createdBy) {
  const { data, error } = await supabase
    .from('community_channels')
    .insert({
      community_name: communityName,
      name: name,
      description: description,
      is_private: isPrivate,
      created_by: createdBy,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating channel:', error);
    return null;
  }

  // If private, add creator as admin member
  if (isPrivate && data) {
    await supabase
      .from('channel_members')
      .insert({
        channel_id: data.id,
        user_id: createdBy,
        role: 'admin',
      });
  }

  return data;
}

// Fetch channels for a community
export async function fetchCommunityChannels(communityName, userId) {
  const { data, error } = await supabase
    .from('community_channels')
    .select(`
      *,
      creator:users!community_channels_created_by_fkey(id, name, main_photo)
    `)
    .eq('community_name', communityName)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching channels:', error);
    return [];
  }

  // For private channels, check if user is a member
  const channelsWithAccess = await Promise.all(data.map(async (channel) => {
    let hasAccess = !channel.is_private; // Public channels accessible to all
    let memberCount = 0;

    if (channel.is_private && userId) {
      const { data: membership } = await supabase
        .from('channel_members')
        .select('id')
        .eq('channel_id', channel.id)
        .eq('user_id', userId)
        .maybeSingle();
      hasAccess = !!membership;
    }

    // Get member count for private channels
    if (channel.is_private) {
      const { count } = await supabase
        .from('channel_members')
        .select('*', { count: 'exact', head: true })
        .eq('channel_id', channel.id);
      memberCount = count || 0;
    }

    return {
      ...channel,
      creator: channel.creator ? {
        id: channel.creator.id,
        name: channel.creator.name,
        photo: fixPhotoUrl(channel.creator.main_photo),
      } : null,
      hasAccess,
      memberCount,
    };
  }));

  return channelsWithAccess;
}

// Fetch channels across all user's communities (both from profile and membership)
export async function fetchUserCommunityChannels(userId, userCommunities = []) {
  // Get communities user has joined via community_members table
  const { data: memberships, error: memberError } = await supabase
    .from('community_members')
    .select('community:community_id(name)')
    .eq('user_id', userId);

  if (memberError) {
    console.error('Error fetching user memberships:', memberError);
  }

  // Combine communities from profile and memberships
  const joinedCommunities = memberships
    ? memberships.map(m => m.community?.name).filter(Boolean)
    : [];

  const allCommunities = [...new Set([...(userCommunities || []), ...joinedCommunities])];

  if (allCommunities.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from('community_channels')
    .select(`
      *,
      creator:users!community_channels_created_by_fkey(id, name, main_photo)
    `)
    .in('community_name', allCommunities)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching user community channels:', error);
    return [];
  }

  // For private channels, check if user is a member
  const channelsWithAccess = await Promise.all(data.map(async (channel) => {
    let hasAccess = !channel.is_private;

    if (channel.is_private && userId) {
      const { data: membership } = await supabase
        .from('channel_members')
        .select('id')
        .eq('channel_id', channel.id)
        .eq('user_id', userId)
        .maybeSingle();
      hasAccess = !!membership;
    }

    return {
      ...channel,
      creator: channel.creator ? {
        id: channel.creator.id,
        name: channel.creator.name,
        photo: fixPhotoUrl(channel.creator.main_photo),
      } : null,
      hasAccess,
    };
  }));

  // Filter to only show accessible channels
  return channelsWithAccess.filter(ch => ch.hasAccess);
}

// Join a channel (for private channels)
export async function joinChannel(channelId, userId) {
  const { error } = await supabase
    .from('channel_members')
    .insert({
      channel_id: channelId,
      user_id: userId,
      role: 'member',
    });

  if (error && error.code !== '23505') { // Ignore duplicate
    console.error('Error joining channel:', error);
    return false;
  }

  return true;
}

// Leave a channel
export async function leaveChannel(channelId, userId) {
  const { error } = await supabase
    .from('channel_members')
    .delete()
    .eq('channel_id', channelId)
    .eq('user_id', userId);

  if (error) {
    console.error('Error leaving channel:', error);
    return false;
  }

  return true;
}

// Fetch channel messages (only top-level, not thread replies)
export async function fetchChannelMessages(channelId, { page = 0, limit = 50 } = {}) {
  const { data, error } = await supabase
    .from('channel_messages')
    .select(`
      *,
      author:users!channel_messages_author_id_fkey(id, name, main_photo)
    `)
    .eq('channel_id', channelId)
    .is('parent_id', null)
    .order('created_at', { ascending: true })
    .range(page * limit, (page + 1) * limit - 1);

  if (error) {
    console.error('Error fetching channel messages:', error);
    return [];
  }

  // Get reply counts for each message
  const messagesWithCounts = await Promise.all(data.map(async (msg) => {
    const { count } = await supabase
      .from('channel_messages')
      .select('*', { count: 'exact', head: true })
      .eq('parent_id', msg.id);

    return {
      ...msg,
      author: msg.author ? {
        id: msg.author.id,
        name: msg.author.name,
        photo: fixPhotoUrl(msg.author.main_photo),
      } : null,
      replyCount: count || 0,
    };
  }));

  return messagesWithCounts;
}

// Fetch thread replies for a channel message
export async function fetchMessageReplies(parentId) {
  const { data, error } = await supabase
    .from('channel_messages')
    .select(`
      *,
      author:users!channel_messages_author_id_fkey(id, name, main_photo)
    `)
    .eq('parent_id', parentId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching message replies:', error);
    return [];
  }

  return data.map(msg => ({
    ...msg,
    author: msg.author ? {
      id: msg.author.id,
      name: msg.author.name,
      photo: fixPhotoUrl(msg.author.main_photo),
    } : null,
  }));
}

// Create a thread reply to a channel message
export async function createMessageReply(channelId, authorId, content, parentId) {
  const { data, error } = await supabase
    .from('channel_messages')
    .insert({
      channel_id: channelId,
      author_id: authorId,
      content: content,
      parent_id: parentId,
    })
    .select(`
      *,
      author:users!channel_messages_author_id_fkey(id, name, main_photo)
    `)
    .single();

  if (error) {
    console.error('Error creating message reply:', error);
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

// Send a message to a channel
// Upload a file to Supabase Storage
export async function uploadMessageAttachment(file, channelId, authorId) {
  console.log('Uploading file:', file.name, 'to channel:', channelId);
  const fileExt = file.name.split('.').pop();
  const fileName = `${channelId}/${authorId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

  const { data, error } = await supabase.storage
    .from('message-attachments')
    .upload(fileName, file);

  if (error) {
    console.error('Error uploading file:', error);
    return null;
  }
  console.log('File uploaded successfully:', data);

  // Get the public URL
  const { data: urlData } = supabase.storage
    .from('message-attachments')
    .getPublicUrl(fileName);

  return {
    url: urlData.publicUrl,
    name: file.name,
    type: file.type,
    size: file.size,
  };
}

export async function sendChannelMessage(channelId, authorId, content, attachments = null) {
  // Upload attachments first if any
  let attachmentUrls = null;
  if (attachments && attachments.length > 0) {
    const uploadedAttachments = await Promise.all(
      attachments.map(att => uploadMessageAttachment(att.file, channelId, authorId))
    );
    // Filter out failed uploads
    attachmentUrls = uploadedAttachments.filter(a => a !== null);
    if (attachmentUrls.length === 0) {
      attachmentUrls = null;
    }
  }

  // Use empty string if no content (allows posting just attachments)
  const messageContent = content || '';

  const { data, error } = await supabase
    .from('channel_messages')
    .insert({
      channel_id: channelId,
      author_id: authorId,
      content: messageContent,
      attachments: attachmentUrls,
    })
    .select(`
      *,
      author:users!channel_messages_author_id_fkey(id, name, main_photo)
    `)
    .single();

  if (error) {
    console.error('Error sending message:', error);
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

// Get channel members
export async function fetchChannelMembers(channelId) {
  const { data, error } = await supabase
    .from('channel_members')
    .select(`
      *,
      user:users!channel_members_user_id_fkey(id, name, main_photo)
    `)
    .eq('channel_id', channelId)
    .order('joined_at', { ascending: true });

  if (error) {
    console.error('Error fetching channel members:', error);
    return [];
  }

  return data.map(m => ({
    ...m,
    user: m.user ? {
      id: m.user.id,
      name: m.user.name,
      photo: fixPhotoUrl(m.user.main_photo),
    } : null,
  }));
}

// Delete a channel (only creator)
export async function deleteChannel(channelId) {
  const { error } = await supabase
    .from('community_channels')
    .delete()
    .eq('id', channelId);

  if (error) {
    console.error('Error deleting channel:', error);
    return false;
  }

  return true;
}

// ============================================
// COMMUNITY MANAGEMENT FUNCTIONS
// ============================================

// Helper to generate slug from name
function generateSlug(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

// Helper to generate random alphanumeric code
function generateInviteCode(length = 8) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Create a new community
// visibility: 'public' | 'semi-public' | 'private'
// pricingOptions: { hasPaidMembership, membershipType, membershipPrice, subscriptionInterval }
export async function createCommunity(name, description, visibility, creatorId, photo = null, isCutiesOfficial = false, pricingOptions = null) {
  const slug = generateSlug(name);

  // Map visibility to is_private for backwards compatibility
  const isPrivate = visibility === 'private';

  // Upload photo to storage if it's a base64 data URL
  let photoUrl = null;
  if (photo && photo.startsWith('data:')) {
    const file = dataURLtoFile(photo, `${slug}.jpg`);
    const { url, error: uploadError } = await uploadCommunityPhoto(file, slug);
    if (uploadError) {
      console.error('Error uploading community photo:', uploadError);
      // Continue without photo
    } else {
      photoUrl = url;
    }
  } else if (photo) {
    // Already a URL
    photoUrl = photo;
  }

  // Build community data
  const communityData = {
    name: name.trim(),
    slug,
    description: description?.trim() || null,
    is_private: isPrivate,
    visibility: visibility || 'public',
    created_by: creatorId,
    photo_url: photoUrl,
    is_cuties_official: isCutiesOfficial,
  };

  // Add pricing fields if provided
  if (pricingOptions && pricingOptions.hasPaidMembership) {
    communityData.has_paid_membership = true;
    communityData.membership_type = pricingOptions.membershipType;
    communityData.membership_price = pricingOptions.membershipPrice;
    communityData.membership_currency = 'USD';
    if (pricingOptions.membershipType === 'subscription') {
      communityData.subscription_interval = pricingOptions.subscriptionInterval;
    }
  }

  // Create the community
  const { data: community, error: communityError } = await supabase
    .from('communities')
    .insert(communityData)
    .select()
    .single();

  if (communityError) {
    console.error('Error creating community:', communityError);
    return { error: communityError };
  }

  // Add creator as admin in community_members table
  const { error: memberError } = await supabase
    .from('community_members')
    .insert({
      community_id: community.id,
      user_id: creatorId,
      role: 'admin',
    });

  if (memberError) {
    console.error('Error adding creator as admin:', memberError);
    // Community was created, so still return it
  }

  // Also add community to creator's profile communities array (so they show in directory)
  await joinCommunity(creatorId, community.name);

  return { data: community };
}

// Fetch community by slug
export async function fetchCommunityBySlug(slug) {
  const { data, error } = await supabase
    .from('communities')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error) {
    if (error.code !== 'PGRST116') { // Not found is ok
      console.error('Error fetching community by slug:', error);
    }
    return null;
  }

  return data;
}

// Fetch community by ID
export async function fetchCommunityById(communityId) {
  const { data, error } = await supabase
    .from('communities')
    .select('*')
    .eq('id', communityId)
    .single();

  if (error) {
    console.error('Error fetching community by id:', error);
    return null;
  }

  return data;
}

// Add a member to a community
// Main community ID - all users are automatically added to this community
export const MAIN_COMMUNITY_ID = 'a0000000-0000-0000-0000-000000000001';

// Join user to the main community
export async function joinMainCommunity(userId) {
  // First check if main community exists
  const { data: mainCommunity } = await supabase
    .from('communities')
    .select('id')
    .eq('id', MAIN_COMMUNITY_ID)
    .single();

  if (!mainCommunity) {
    console.warn('Main community does not exist yet');
    return { error: 'Main community not found' };
  }

  return addCommunityMember(MAIN_COMMUNITY_ID, userId, 'member');
}

export async function addCommunityMember(communityId, userId, role = 'member') {
  const { data, error } = await supabase
    .from('community_members')
    .insert({
      community_id: communityId,
      user_id: userId,
      role,
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') { // Duplicate key - already a member
      return { data: null, alreadyMember: true };
    }
    console.error('Error adding community member:', error);
    return { error };
  }

  return { data };
}

// Remove a member from a community
export async function removeCommunityMember(communityId, userId) {
  const { error } = await supabase
    .from('community_members')
    .delete()
    .eq('community_id', communityId)
    .eq('user_id', userId);

  if (error) {
    console.error('Error removing community member:', error);
    return false;
  }

  return true;
}

// Get user's role in a community
export async function getUserCommunityRole(communityId, userId) {
  const { data, error } = await supabase
    .from('community_members')
    .select('role')
    .eq('community_id', communityId)
    .eq('user_id', userId)
    .single();

  if (error) {
    if (error.code !== 'PGRST116') { // Not found is ok
      console.error('Error getting user community role:', error);
    }
    return null;
  }

  return data?.role || null;
}

// Check if user is a member of a community (by community ID)
export async function isUserCommunityMember(communityId, userId) {
  const { data, error } = await supabase
    .from('community_members')
    .select('id')
    .eq('community_id', communityId)
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error checking community membership:', error);
    return false;
  }

  return !!data;
}

// Get community member count
export async function getCommunityMemberCount(communityId) {
  const { count, error } = await supabase
    .from('community_members')
    .select('*', { count: 'exact', head: true })
    .eq('community_id', communityId);

  if (error) {
    console.error('Error getting community member count:', error);
    return 0;
  }

  return count || 0;
}

// Create an invite link for a community
export async function createCommunityInvite(communityId, creatorId, options = {}) {
  const { expiresAt = null, maxUses = null } = options;

  // Generate unique code
  let code = generateInviteCode();
  let attempts = 0;
  const maxAttempts = 5;

  // Try to insert, regenerate code if collision
  while (attempts < maxAttempts) {
    const { data, error } = await supabase
      .from('community_invites')
      .insert({
        community_id: communityId,
        code,
        created_by: creatorId,
        expires_at: expiresAt,
        max_uses: maxUses,
      })
      .select()
      .single();

    if (!error) {
      return { data };
    }

    if (error.code === '23505') { // Duplicate code
      code = generateInviteCode();
      attempts++;
    } else {
      console.error('Error creating invite:', error);
      return { error };
    }
  }

  return { error: { message: 'Failed to generate unique invite code' } };
}

// Get invite by code
export async function getInviteByCode(code) {
  const { data, error } = await supabase
    .from('community_invites')
    .select(`
      *,
      community:community_id(id, name, slug, description, is_private)
    `)
    .eq('code', code.toUpperCase())
    .eq('is_active', true)
    .single();

  if (error) {
    if (error.code !== 'PGRST116') {
      console.error('Error getting invite:', error);
    }
    return null;
  }

  // Check if expired
  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    return null;
  }

  // Check if max uses reached
  if (data.max_uses !== null && data.use_count >= data.max_uses) {
    return null;
  }

  return data;
}

// Redeem an invite code
export async function redeemInvite(code, userId) {
  // Get the invite
  const invite = await getInviteByCode(code);

  if (!invite) {
    return { error: { message: 'Invalid or expired invite code' } };
  }

  // Check if user is already a member
  const isMember = await isUserCommunityMember(invite.community_id, userId);
  if (isMember) {
    return {
      data: invite.community,
      alreadyMember: true
    };
  }

  // Add user to community
  const { error: memberError } = await addCommunityMember(invite.community_id, userId, 'member');

  if (memberError) {
    return { error: memberError };
  }

  // Increment use count
  await supabase
    .from('community_invites')
    .update({ use_count: invite.use_count + 1 })
    .eq('id', invite.id);

  return { data: invite.community };
}

// Deactivate an invite
export async function deactivateInvite(inviteId) {
  const { error } = await supabase
    .from('community_invites')
    .update({ is_active: false })
    .eq('id', inviteId);

  if (error) {
    console.error('Error deactivating invite:', error);
    return false;
  }

  return true;
}

// Get all invites for a community
export async function getCommunityInvites(communityId) {
  const { data, error } = await supabase
    .from('community_invites')
    .select(`
      *,
      creator:created_by(id, name, main_photo)
    `)
    .eq('community_id', communityId)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error getting community invites:', error);
    return [];
  }

  return data.map(invite => ({
    ...invite,
    creator: invite.creator ? {
      id: invite.creator.id,
      name: invite.creator.name,
      photo: fixPhotoUrl(invite.creator.main_photo),
    } : null,
  }));
}

// Delete a community (admin or moderator only)
export async function deleteCommunity(communityId) {
  const { error } = await supabase
    .from('communities')
    .delete()
    .eq('id', communityId);

  if (error) {
    console.error('Error deleting community:', error);
    return { error };
  }

  return { success: true };
}

// Update community details
export async function updateCommunity(communityId, updates) {
  const { data, error } = await supabase
    .from('communities')
    .update(updates)
    .eq('id', communityId)
    .select()
    .single();

  if (error) {
    console.error('Error updating community:', error);
    return { error };
  }

  return { data };
}

// Check if there are other admins in the community (besides the given user)
export async function hasOtherAdmins(communityId, userId) {
  const { count, error } = await supabase
    .from('community_members')
    .select('*', { count: 'exact', head: true })
    .eq('community_id', communityId)
    .eq('role', 'admin')
    .neq('user_id', userId);

  if (error) {
    console.error('Error checking for other admins:', error);
    return false;
  }

  return (count || 0) > 0;
}

// Fetch community moderators and admins
export async function fetchCommunityModerators(communityId) {
  const { data, error } = await supabase
    .from('community_members')
    .select(`
      role,
      joined_at,
      user:user_id(id, name, main_photo, short_description, new_location)
    `)
    .eq('community_id', communityId)
    .in('role', ['admin', 'moderator'])
    .order('role', { ascending: true }); // admins first

  if (error) {
    console.error('Error fetching community moderators:', error);
    return [];
  }

  return data.map(m => ({
    role: m.role,
    joinedAt: m.joined_at,
    user: m.user ? {
      id: m.user.id,
      name: m.user.name,
      photo: fixPhotoUrl(m.user.main_photo),
      bio: m.user.short_description,
      location: m.user.new_location,
    } : null,
  })).filter(m => m.user !== null);
}

// Fetch all community names (for dropdowns like edit profile)
// This combines created communities with legacy communities from user profiles
export async function fetchAllCommunityNames() {
  const communitySet = new Set();

  // Fetch all created communities (public ones)
  const { data: createdData, error: createdError } = await supabase
    .from('communities')
    .select('name')
    .order('name');

  if (!createdError && createdData) {
    createdData.forEach(c => communitySet.add(c.name));
  }

  // Fetch all unique communities from user profiles (legacy)
  const { data: usersData, error: usersError } = await supabase
    .from('users')
    .select('communities');

  if (!usersError && usersData) {
    usersData.forEach(user => {
      if (user.communities && Array.isArray(user.communities)) {
        user.communities.forEach(c => communitySet.add(c));
      }
    });
  }

  // Return sorted array
  return Array.from(communitySet).sort((a, b) =>
    a.toLowerCase().localeCompare(b.toLowerCase())
  );
}

// Fetch communities user is a member of
export async function fetchUserCommunities(userId, userProfileCommunities = []) {
  // Get communities from community_members table
  const { data: memberships, error: memberError } = await supabase
    .from('community_members')
    .select(`
      role,
      joined_at,
      community:community_id(id, name, slug, description, is_private, photo_url)
    `)
    .eq('user_id', userId);

  if (memberError) {
    console.error('Error fetching user communities:', memberError);
  }

  // Build a map of joined communities with their roles
  const joinedCommunities = new Map();
  if (memberships) {
    memberships.forEach(m => {
      if (m.community) {
        joinedCommunities.set(m.community.name, {
          ...m.community,
          role: m.role,
          joinedAt: m.joined_at,
          isCreated: true,
        });
      }
    });
  }

  // Add profile communities (legacy) that aren't in community_members
  const allCommunities = [];

  // First add joined communities
  joinedCommunities.forEach(community => {
    allCommunities.push(community);
  });

  // Then add profile communities not already in the list
  if (userProfileCommunities && Array.isArray(userProfileCommunities)) {
    userProfileCommunities.forEach(name => {
      if (!joinedCommunities.has(name)) {
        allCommunities.push({
          name,
          slug: name.toLowerCase().replace(/\s+/g, '-'),
          description: null,
          is_private: false,
          isCreated: false,
        });
      }
    });
  }

  // Get member counts for all communities
  const communityNames = allCommunities.map(c => c.name);
  const counts = await fetchCommunityMemberCounts();

  return allCommunities.map(c => ({
    ...c,
    memberCount: counts[c.name] || 0,
  }));
}

// Fetch all user memberships (returns map of community name -> role)
export async function fetchUserMemberships(userId, userProfileCommunities = []) {
  if (!userId) return {};

  const memberships = {};

  // Get memberships from community_members table
  const { data, error } = await supabase
    .from('community_members')
    .select(`
      role,
      community:community_id(name)
    `)
    .eq('user_id', userId);

  if (error) {
    console.error('Error fetching user memberships:', error);
  } else if (data) {
    data.forEach(m => {
      if (m.community?.name) {
        memberships[m.community.name] = m.role;
      }
    });
  }

  // Add profile communities as "member" if not already in memberships
  if (userProfileCommunities && Array.isArray(userProfileCommunities)) {
    userProfileCommunities.forEach(name => {
      if (!memberships[name]) {
        memberships[name] = 'member';
      }
    });
  }

  return memberships;
}

// Fetch all created communities (for displaying in directory)
// Note: This now filters by visibility, showing public communities only
// For discoverable communities (public + semi-public), use fetchDiscoverableCommunities
export async function fetchCreatedCommunities() {
  const { data, error } = await supabase
    .from('communities')
    .select(`
      *,
      member_count:community_members(count)
    `)
    .or('visibility.eq.public,visibility.is.null,is_private.eq.false')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching created communities:', error);
    return [];
  }

  return data.map(c => ({
    ...c,
    memberCount: c.member_count?.[0]?.count || 0,
  }));
}

// Fetch adjacent communities (communities that share members with the given community)
export async function fetchAdjacentCommunities(communityName, limit = 10) {
  // Get all users who are members of this community
  const { data: members, error: membersError } = await supabase
    .from('users')
    .select('communities')
    .contains('communities', [communityName]);

  if (membersError) {
    console.error('Error fetching community members:', membersError);
    return [];
  }

  // Count occurrences of each community across all members
  const communityCounts = {};
  members.forEach(member => {
    (member.communities || []).forEach(comm => {
      if (comm !== communityName) {
        communityCounts[comm] = (communityCounts[comm] || 0) + 1;
      }
    });
  });

  // Sort by overlap count and return top communities
  const sortedCommunities = Object.entries(communityCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name, count]) => ({
      name,
      slug: name.toLowerCase().replace(/\s+/g, '-').replace(/'/g, ''),
      overlapCount: count,
    }));

  return sortedCommunities;
}

// ==================== NOTIFICATIONS ====================

// Create a notification
export async function createNotification(userId, type, fromUserId, message, link) {
  const { data, error } = await supabase
    .from('notifications')
    .insert({
      user_id: userId,
      type,
      from_user_id: fromUserId,
      message,
      link,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating notification:', error);
    return null;
  }

  return data;
}

// Fetch notifications for a user
export async function fetchNotifications(userId, limit = 50) {
  const { data, error } = await supabase
    .from('notifications')
    .select(`
      *,
      from_user:from_user_id(id, name, main_photo)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching notifications:', error);
    return [];
  }

  return data.map(n => ({
    ...n,
    fromUser: n.from_user ? {
      id: n.from_user.id,
      name: n.from_user.name,
      photo: fixPhotoUrl(n.from_user.main_photo),
    } : null,
  }));
}

// Get unread notification count
export async function getUnreadNotificationCount(userId) {
  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_read', false);

  if (error) {
    console.error('Error getting unread count:', error);
    return 0;
  }

  return count || 0;
}

// Mark notification as read
export async function markNotificationRead(notificationId) {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId);

  if (error) {
    console.error('Error marking notification read:', error);
    return false;
  }

  return true;
}

// Mark all notifications as read
export async function markAllNotificationsRead(userId) {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', userId)
    .eq('is_read', false);

  if (error) {
    console.error('Error marking all notifications read:', error);
    return false;
  }

  return true;
}

// ============================================
// DEFAULT MODERATOR FUNCTIONS
// ============================================

// Default moderator email (Christine)
const DEFAULT_MODERATOR_EMAIL = 'christinetshiba@gmail.com';

// Get Christine's user ID by email
export async function getDefaultModeratorId() {
  const { data, error } = await supabase
    .from('users')
    .select('id')
    .eq('email', DEFAULT_MODERATOR_EMAIL)
    .single();

  if (error) {
    console.error('Error fetching default moderator:', error);
    return null;
  }

  return data?.id || null;
}

// Ensure a community has at least one moderator
// If no moderators exist, add Christine as a moderator
export async function ensureCommunityHasModerator(communityId) {
  // First check if community has any moderators or admins
  const { data: moderators, error: modError } = await supabase
    .from('community_members')
    .select('id')
    .eq('community_id', communityId)
    .in('role', ['admin', 'moderator'])
    .limit(1);

  if (modError) {
    console.error('Error checking moderators:', modError);
    return { error: modError };
  }

  // If there are already moderators, do nothing
  if (moderators && moderators.length > 0) {
    return { hasModeratorAlready: true };
  }

  // No moderators found, add Christine
  const christineId = await getDefaultModeratorId();
  if (!christineId) {
    console.error('Default moderator (Christine) not found in database');
    return { error: { message: 'Default moderator not found' } };
  }

  // Add Christine as moderator - use insert and handle duplicate gracefully
  const { error: addError } = await supabase
    .from('community_members')
    .insert({
      community_id: communityId,
      user_id: christineId,
      role: 'moderator',
    });

  // Ignore duplicate key error (23505) - Christine might already be a member
  if (addError && addError.code !== '23505') {
    console.error('Error adding default moderator:', addError);
    return { error: addError };
  }

  // If she was already a member but not a moderator, update her role
  if (addError && addError.code === '23505') {
    const { error: updateError } = await supabase
      .from('community_members')
      .update({ role: 'moderator' })
      .eq('community_id', communityId)
      .eq('user_id', christineId);

    if (updateError) {
      console.error('Error updating default moderator role:', updateError);
      return { error: updateError };
    }
  }

  return { addedDefaultModerator: true, moderatorId: christineId };
}

// Update a user's role in a community
export async function updateCommunityMemberRole(communityId, userId, newRole) {
  // First check if user is already a member
  const { data: existing, error: checkError } = await supabase
    .from('community_members')
    .select('id, role')
    .eq('community_id', communityId)
    .eq('user_id', userId)
    .single();

  if (checkError && checkError.code !== 'PGRST116') {
    console.error('Error checking membership:', checkError);
    return { error: checkError };
  }

  if (existing) {
    // Update existing membership
    const { error: updateError } = await supabase
      .from('community_members')
      .update({ role: newRole })
      .eq('community_id', communityId)
      .eq('user_id', userId);

    if (updateError) {
      console.error('Error updating role:', updateError);
      return { error: updateError };
    }
  } else {
    // Insert new membership
    const { error: insertError } = await supabase
      .from('community_members')
      .insert({
        community_id: communityId,
        user_id: userId,
        role: newRole,
      });

    if (insertError) {
      console.error('Error adding member:', insertError);
      return { error: insertError };
    }
  }

  return { success: true };
}

// Remove moderator/admin role (demote to member)
export async function demoteCommunityMember(communityId, userId) {
  const { error } = await supabase
    .from('community_members')
    .update({ role: 'member' })
    .eq('community_id', communityId)
    .eq('user_id', userId);

  if (error) {
    console.error('Error demoting member:', error);
    return { error };
  }

  return { success: true };
}

// ============================================
// COMMUNITY JOIN REQUEST FUNCTIONS
// ============================================

// Create a join request for a semi-public community
export async function createJoinRequest(communityId, userId, message = null) {
  const { data, error } = await supabase
    .from('community_join_requests')
    .insert({
      community_id: communityId,
      user_id: userId,
      message: message?.trim() || null,
      status: 'pending',
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') { // Duplicate - already requested
      return { data: null, alreadyRequested: true };
    }
    console.error('Error creating join request:', error);
    return { error };
  }

  return { data };
}

// Check if user has a pending join request
export async function hasPendingJoinRequest(communityId, userId) {
  const { data, error } = await supabase
    .from('community_join_requests')
    .select('id, status')
    .eq('community_id', communityId)
    .eq('user_id', userId)
    .eq('status', 'pending')
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error checking join request:', error);
    return false;
  }

  return !!data;
}

// Get user's join request status for a community
export async function getJoinRequestStatus(communityId, userId) {
  const { data, error } = await supabase
    .from('community_join_requests')
    .select('id, status, created_at')
    .eq('community_id', communityId)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error getting join request status:', error);
    return null;
  }

  return data;
}

// Fetch pending join requests for a community (for admins/moderators)
export async function fetchPendingJoinRequests(communityId) {
  const { data, error } = await supabase
    .from('community_join_requests')
    .select(`
      *,
      user:user_id(id, name, main_photo, short_description, new_location)
    `)
    .eq('community_id', communityId)
    .eq('status', 'pending')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching pending join requests:', error);
    return [];
  }

  return data.map(r => ({
    ...r,
    user: r.user ? {
      id: r.user.id,
      name: r.user.name,
      photo: fixPhotoUrl(r.user.main_photo),
      bio: r.user.short_description,
      location: r.user.new_location,
    } : null,
  }));
}

// Get pending join request count for a community
export async function getPendingJoinRequestCount(communityId) {
  const { count, error } = await supabase
    .from('community_join_requests')
    .select('*', { count: 'exact', head: true })
    .eq('community_id', communityId)
    .eq('status', 'pending');

  if (error) {
    console.error('Error getting pending request count:', error);
    return 0;
  }

  return count || 0;
}

// Approve a join request
export async function approveJoinRequest(requestId, reviewerId, communityId, userId) {
  // Update the request status
  const { error: updateError } = await supabase
    .from('community_join_requests')
    .update({
      status: 'approved',
      reviewed_by: reviewerId,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', requestId);

  if (updateError) {
    console.error('Error approving join request:', updateError);
    return { error: updateError };
  }

  // Add user to community_members
  const { error: memberError } = await supabase
    .from('community_members')
    .insert({
      community_id: communityId,
      user_id: userId,
      role: 'member',
    });

  if (memberError && memberError.code !== '23505') {
    console.error('Error adding member:', memberError);
    return { error: memberError };
  }

  // Get the community name to add to user's profile
  const { data: community } = await supabase
    .from('communities')
    .select('name')
    .eq('id', communityId)
    .single();

  // Also add to user's communities array in profile
  if (community) {
    await joinCommunity(userId, community.name);
  }

  return { success: true };
}

// Reject a join request
export async function rejectJoinRequest(requestId, reviewerId) {
  const { error } = await supabase
    .from('community_join_requests')
    .update({
      status: 'rejected',
      reviewed_by: reviewerId,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', requestId);

  if (error) {
    console.error('Error rejecting join request:', error);
    return { error };
  }

  return { success: true };
}

// Fetch all created communities with visibility filter
// For explore page - show public and semi-public only (private are hidden from non-members)
export async function fetchDiscoverableCommunities() {
  const { data, error } = await supabase
    .from('communities')
    .select(`
      *,
      member_count:community_members(count)
    `)
    .in('visibility', ['public', 'semi-public'])
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching discoverable communities:', error);
    return [];
  }

  return data.map(c => ({
    ...c,
    memberCount: c.member_count?.[0]?.count || 0,
  }));
}

// ============================================
// USER PRIVACY SETTINGS
// ============================================

// Get user's privacy setting
export async function getUserPrivacySetting(userId) {
  const { data, error } = await supabase
    .from('users')
    .select('privacy_setting')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Error fetching privacy setting:', error);
    return 'public'; // Default to public
  }

  return data?.privacy_setting || 'public';
}

// Update user's privacy setting
export async function updateUserPrivacySetting(userId, setting) {
  const { error } = await supabase
    .from('users')
    .update({ privacy_setting: setting })
    .eq('id', userId);

  if (error) {
    console.error('Error updating privacy setting:', error);
    return false;
  }

  return true;
}
