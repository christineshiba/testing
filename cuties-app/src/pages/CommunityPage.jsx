import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { getCommunityBySlug, slugToName } from '../data/communities';
import {
  fetchUsersByCommunity,
  fetchVouchersForUsers,
  joinCommunity,
  leaveCommunity,
  fetchCommunityMemberCounts,
  fetchCommunityChannels,
  createChannel,
  joinChannel,
  fetchChannelMessages,
  sendChannelMessage,
  fetchMessageReplies,
  createMessageReply,
  fetchCommunityBySlug,
  getUserCommunityRole,
  createCommunityInvite,
  addCommunityMember,
  removeCommunityMember,
  fetchUsers,
  fetchCommunityModerators,
  hasOtherAdmins,
  getCommunityMemberCount,
  isUserCommunityMember,
  deleteCommunity,
  fetchAdjacentCommunities,
  ensureCommunityHasModerator,
  updateCommunityMemberRole,
  demoteCommunityMember,
  createJoinRequest,
  hasPendingJoinRequest,
  fetchPendingJoinRequests,
  getPendingJoinRequestCount,
  approveJoinRequest,
  rejectJoinRequest,
} from '../lib/supabase';
import {
  MagnifyingGlass,
  X,
  PaperPlaneTilt,
  Hash,
  Lock,
  Plus,
  ChatText,
  Link as LinkIcon,
  Check,
  Copy,
  Image,
  File,
  Microphone,
  VideoCamera,
  Gif,
  TwitterLogo,
  At,
  Article,
  CaretDown,
  Clock,
  UserPlus,
  Globe,
  UsersThree,
  PencilSimple,
} from '@phosphor-icons/react';
import EditCommunityModal from '../components/EditCommunityModal';
import './CommunityPage.css';

const CommunityPage = () => {
  const { communityId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isAuthenticated, currentUser, loading, refreshCurrentUser } = useApp();
  const channelIdFromUrl = searchParams.get('channel');
  const [activeTab, setActiveTab] = useState('about');
  const [members, setMembers] = useState([]);
  const [memberCount, setMemberCount] = useState(0);
  const [membersLoading, setMembersLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [userVouchers, setUserVouchers] = useState({});
  const [isMember, setIsMember] = useState(false);
  const [joiningLoading, setJoiningLoading] = useState(false);
  const searchTimeoutRef = useRef(null);


  // Channels state
  const [channels, setChannels] = useState([]);
  const [channelsLoading, setChannelsLoading] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [channelMessages, setChannelMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelDesc, setNewChannelDesc] = useState('');
  const [newChannelPrivate, setNewChannelPrivate] = useState(false);
  const [creatingChannel, setCreatingChannel] = useState(false);
  const messagesEndRef = useRef(null);

  // Thread state for channel messages
  const [selectedMessageThread, setSelectedMessageThread] = useState(null);
  const [messageThreadReplies, setMessageThreadReplies] = useState([]);
  const [messageThreadLoading, setMessageThreadLoading] = useState(false);
  const [newMessageThreadReply, setNewMessageThreadReply] = useState('');
  const threadEndRef = useRef(null);

  // Media attachment state
  const [showMediaOptions, setShowMediaOptions] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);

  // Crosspost state
  const [showCrosspostOptions, setShowCrosspostOptions] = useState(false);
  const [crosspostTo, setCrosspostTo] = useState({
    twitter: false,
    bluesky: false,
    substack: false,
  });

  // Admin/invite state
  const [createdCommunity, setCreatedCommunity] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteLink, setInviteLink] = useState('');
  const [generatingInvite, setGeneratingInvite] = useState(false);
  const [inviteCopied, setInviteCopied] = useState(false);

  // Add member search state
  const [memberSearch, setMemberSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [addingMember, setAddingMember] = useState(null);
  const [addedMembers, setAddedMembers] = useState([]);
  const memberSearchTimeoutRef = useRef(null);

  // About tab state
  const [moderators, setModerators] = useState([]);
  const [moderatorsLoading, setModeratorsLoading] = useState(false);
  const [adjacentCommunities, setAdjacentCommunities] = useState([]);
  const [adjacentLoading, setAdjacentLoading] = useState(false);

  // Leave warning state
  const [leaveWarning, setLeaveWarning] = useState(null);

  // Delete community state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Edit community modal state
  const [showEditModal, setShowEditModal] = useState(false);

  // Moderator management state
  const [showAddModerator, setShowAddModerator] = useState(false);
  const [modSearch, setModSearch] = useState('');
  const [modSearchResults, setModSearchResults] = useState([]);
  const [modSearchLoading, setModSearchLoading] = useState(false);
  const [addingMod, setAddingMod] = useState(null);
  const [removingMod, setRemovingMod] = useState(null);
  const [promotingToAdmin, setPromotingToAdmin] = useState(null);
  const modSearchTimeoutRef = useRef(null);

  // Join request state (for semi-public communities)
  const [pendingRequests, setPendingRequests] = useState([]);
  const [pendingRequestCount, setPendingRequestCount] = useState(0);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [hasPendingRequest, setHasPendingRequest] = useState(false);
  const [processingRequest, setProcessingRequest] = useState(null);
  const [requestMessage, setRequestMessage] = useState('');

  // Get community data from slug (fallback name, will be overridden by DB name if available)
  const community = getCommunityBySlug(communityId);
  const fallbackName = community?.name || slugToName(communityId);

  // Use the actual name from database if it's a created community, otherwise use fallback
  const communityName = createdCommunity?.name || fallbackName;

  // Reset to top and first tab when navigating to a different community
  useEffect(() => {
    window.scrollTo(0, 0);
    // If there's a channel in the URL, go to channels tab
    setActiveTab(channelIdFromUrl ? 'channels' : 'channels');
  }, [communityId, channelIdFromUrl]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate('/login');
    }
  }, [loading, isAuthenticated, navigate]);

  // Check if user is a member (check both profile and community_members table)
  useEffect(() => {
    const checkMembership = async () => {
      if (!currentUser) return;

      // Check if community is in user's profile
      const nameToCheck = createdCommunity?.name || fallbackName;
      const inProfile = currentUser.communities?.includes(nameToCheck) || false;

      // For created communities, also check community_members table
      let inMembersTable = false;
      if (createdCommunity) {
        inMembersTable = await isUserCommunityMember(createdCommunity.id, currentUser.id);
      }

      // User is a member if they're in either place
      setIsMember(inProfile || inMembersTable);
    };

    checkMembership();
  }, [currentUser, createdCommunity, fallbackName]);

  // Check if this is a created community and get user role
  useEffect(() => {
    const checkCreatedCommunity = async () => {
      if (!communityId || !currentUser) return;

      // Check if community exists in the communities table
      const dbCommunity = await fetchCommunityBySlug(communityId);
      if (dbCommunity) {
        setCreatedCommunity(dbCommunity);
        // Get user's role in this community
        const role = await getUserCommunityRole(dbCommunity.id, currentUser.id);
        setUserRole(role);
      }
    };

    checkCreatedCommunity();
  }, [communityId, currentUser]);

  // Load member count - check both legacy (user profiles) and created community members
  useEffect(() => {
    const loadMemberCount = async () => {
      // Get legacy count from user profiles
      const counts = await fetchCommunityMemberCounts();
      const legacyCount = counts[communityName] || 0;

      // For created communities, also check community_members table
      let createdCount = 0;
      if (createdCommunity) {
        createdCount = await getCommunityMemberCount(createdCommunity.id);
      }

      // Use the higher count (members could be in either or both places)
      setMemberCount(Math.max(legacyCount, createdCount));
    };
    if (communityName) {
      loadMemberCount();
    }
  }, [communityName, createdCommunity]);

  // Load members function
  const loadMembers = useCallback(async (reset = false, nextPage = null) => {
    if (!communityName) return;

    setMembersLoading(true);
    const currentPage = reset ? 0 : (nextPage !== null ? nextPage : page);
    const results = await fetchUsersByCommunity(communityName, {
      page: currentPage,
      limit: 20,
      search,
      communityId: createdCommunity?.id || null,
    });

    if (reset) {
      setMembers(results);
      setPage(0);
    } else {
      // Deduplicate results by user ID
      setMembers(prev => {
        const existingIds = new Set(prev.map(u => u.id));
        const newUsers = results.filter(u => !existingIds.has(u.id));
        return [...prev, ...newUsers];
      });
      setPage(currentPage);
    }

    // If we got fewer than 20 results, there's no more to load
    setHasMore(results.length === 20);
    setMembersLoading(false);
  }, [communityName, search, page, createdCommunity]);

  // Load members on mount and when search changes
  useEffect(() => {
    if (!communityName) return;

    // Clear any existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Debounce the search by 300ms
    searchTimeoutRef.current = setTimeout(() => {
      loadMembers(true);
    }, search ? 300 : 0);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [communityName, search, loadMembers]);

  // Fetch vouchers for displayed members
  useEffect(() => {
    const loadVouchers = async () => {
      if (members.length === 0) return;
      const userIds = members.map(u => u.id);
      const vouchers = await fetchVouchersForUsers(userIds);
      setUserVouchers(vouchers);
    };
    loadVouchers();
  }, [members]);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    loadMembers(false, nextPage);
  };

  const handleJoinLeave = async () => {
    if (!currentUser) return;

    // Use the exact name from database if available, otherwise fallback
    const exactCommunityName = createdCommunity?.name || communityName;

    // Clear any previous warning
    setLeaveWarning(null);

    setJoiningLoading(true);
    try {
      if (isMember) {
        // Check if user is an admin/moderator trying to leave a created community
        if (createdCommunity && (userRole === 'admin' || userRole === 'moderator')) {
          // If admin, check if there are other admins
          if (userRole === 'admin') {
            const otherAdmins = await hasOtherAdmins(createdCommunity.id, currentUser.id);
            if (!otherAdmins) {
              setLeaveWarning('You are the only admin. Please assign another admin before leaving.');
              setJoiningLoading(false);
              return;
            }
          }
          // Moderators can leave if there's at least one admin (which we know exists if they're just a mod)
        }

        // Leave community - update user's communities array
        const result = await leaveCommunity(currentUser.id, exactCommunityName);
        if (result.success) {
          // Also remove from community_members if it's a created community
          if (createdCommunity) {
            await removeCommunityMember(createdCommunity.id, currentUser.id);
          }
          setIsMember(false);
          setUserRole(null); // Clear user role since they left
          setMemberCount(prev => Math.max(0, prev - 1));
          // Reload members list
          loadMembers(true);
          if (refreshCurrentUser) refreshCurrentUser();
        }
      } else {
        // Check if this is a semi-public community that requires approval
        if (createdCommunity?.visibility === 'semi-public') {
          // Create a join request instead of directly joining
          const { error, alreadyRequested } = await createJoinRequest(
            createdCommunity.id,
            currentUser.id,
            requestMessage || null
          );
          if (!error && !alreadyRequested) {
            setHasPendingRequest(true);
            setRequestMessage('');
          } else if (alreadyRequested) {
            setHasPendingRequest(true);
          }
        } else {
          // Public community - join directly
          const result = await joinCommunity(currentUser.id, exactCommunityName);
          if (result.success) {
            // Also add to community_members if it's a created community (ignore errors - might already exist)
            if (createdCommunity) {
              await addCommunityMember(createdCommunity.id, currentUser.id, 'member').catch(() => {});
            }
            setIsMember(true);
            setMemberCount(prev => prev + 1);
            // Reload members list to show the new member
            loadMembers(true);
            if (refreshCurrentUser) refreshCurrentUser();
          }
        }
      }
    } catch (error) {
      console.error('Error joining/leaving community:', error);
    }
    setJoiningLoading(false);
  };

  const formatTimeAgo = (dateString) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  // Load channels function
  const loadChannels = useCallback(async () => {
    if (!communityName) return;
    setChannelsLoading(true);
    try {
      const fetchedChannels = await fetchCommunityChannels(communityName, currentUser?.id);
      setChannels(fetchedChannels);
    } catch (error) {
      console.error('Error loading channels:', error);
    }
    setChannelsLoading(false);
  }, [communityName, currentUser]);

  // Load moderators function
  const loadModerators = useCallback(async () => {
    if (!createdCommunity) return;
    setModeratorsLoading(true);

    // Ensure community has at least one moderator (adds Christine if none)
    await ensureCommunityHasModerator(createdCommunity.id);

    // Fetch moderators after ensuring there's at least one
    const mods = await fetchCommunityModerators(createdCommunity.id);
    setModerators(mods);
    setModeratorsLoading(false);
  }, [createdCommunity]);

  // Load channels when channels tab is active
  useEffect(() => {
    if (activeTab === 'channels' && communityName) {
      loadChannels();
    }
  }, [activeTab, communityName, loadChannels]);

  // Auto-select channel from URL parameter after channels are loaded
  useEffect(() => {
    const selectChannelFromUrl = async () => {
      if (channelIdFromUrl && channels.length > 0 && !selectedChannel) {
        const channelFromUrl = channels.find(ch => ch.id === channelIdFromUrl);
        if (channelFromUrl && channelFromUrl.hasAccess !== false) {
          setSelectedChannel(channelFromUrl);
          setMessagesLoading(true);
          try {
            const messages = await fetchChannelMessages(channelFromUrl.id);
            setChannelMessages(messages);
          } catch (error) {
            console.error('Error loading messages:', error);
          }
          setMessagesLoading(false);
        }
      }
    };
    selectChannelFromUrl();
  }, [channelIdFromUrl, channels, selectedChannel]);

  // Load moderators when about tab is active and community is loaded
  useEffect(() => {
    if (activeTab === 'about' && createdCommunity) {
      loadModerators();
    }
  }, [activeTab, createdCommunity, loadModerators]);

  // Check if user has a pending join request (for semi-public communities)
  useEffect(() => {
    const checkPendingRequest = async () => {
      if (!createdCommunity || !currentUser || isMember) {
        setHasPendingRequest(false);
        return;
      }
      if (createdCommunity.visibility === 'semi-public') {
        const pending = await hasPendingJoinRequest(createdCommunity.id, currentUser.id);
        setHasPendingRequest(pending);
      }
    };
    checkPendingRequest();
  }, [createdCommunity, currentUser, isMember]);

  // Load pending join requests for admins/moderators
  useEffect(() => {
    const loadPendingRequests = async () => {
      if (!createdCommunity || createdCommunity.visibility !== 'semi-public') return;
      if (!userRole || (userRole !== 'admin' && userRole !== 'moderator')) return;

      setRequestsLoading(true);
      const [requests, count] = await Promise.all([
        fetchPendingJoinRequests(createdCommunity.id),
        getPendingJoinRequestCount(createdCommunity.id),
      ]);
      setPendingRequests(requests);
      setPendingRequestCount(count);
      setRequestsLoading(false);
    };
    loadPendingRequests();
  }, [createdCommunity, userRole]);

  // Load adjacent communities when about tab is active
  useEffect(() => {
    const loadAdjacentCommunities = async () => {
      if (activeTab === 'about' && communityName) {
        setAdjacentLoading(true);
        try {
          const adjacent = await fetchAdjacentCommunities(communityName, 4);
          setAdjacentCommunities(adjacent);
        } catch (error) {
          console.error('Error loading adjacent communities:', error);
        }
        setAdjacentLoading(false);
      }
    };
    loadAdjacentCommunities();
  }, [activeTab, communityName]);

  // Redirect non-members away from restricted tabs
  useEffect(() => {
    if (!isMember) {
      // Non-members can't see channels
      if (activeTab === 'channels') {
        setActiveTab('about');
      }
      // Semi-public non-members can only see about
      if (createdCommunity?.visibility === 'semi-public' && activeTab === 'directory') {
        setActiveTab('about');
      }
    }
  }, [isMember, activeTab, createdCommunity]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [channelMessages]);

  const handleSelectChannel = async (channel) => {
    if (channel.is_private && !channel.hasAccess) {
      // Request to join private channel
      if (currentUser) {
        const success = await joinChannel(channel.id, currentUser.id);
        if (success) {
          loadChannels();
        }
      }
      return;
    }

    setSelectedChannel(channel);
    setMessagesLoading(true);
    try {
      const messages = await fetchChannelMessages(channel.id);
      setChannelMessages(messages);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
    setMessagesLoading(false);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    // Allow sending if there's either text or attachments
    if ((!newMessage.trim() && attachments.length === 0) || !currentUser || !selectedChannel) return;

    setSendingMessage(true);
    console.log('Sending message with attachments:', attachments);
    try {
      const message = await sendChannelMessage(
        selectedChannel.id,
        currentUser.id,
        newMessage.trim(),
        attachments.length > 0 ? attachments : null
      );
      console.log('Message result:', message);
      if (message) {
        setChannelMessages(prev => [...prev, message]);
        setNewMessage('');
        setAttachments([]);

        // Handle crossposting (placeholder for now)
        if (crosspostTo.twitter || crosspostTo.bluesky || crosspostTo.substack) {
          console.log('Crossposting to:', crosspostTo);
          // TODO: Implement actual crossposting
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
    setSendingMessage(false);
  };

  const handleFileSelect = (e, type) => {
    const files = Array.from(e.target.files);
    const newAttachments = files.map(file => ({
      type,
      file,
      name: file.name,
      preview: type === 'image' ? URL.createObjectURL(file) : null,
    }));
    setAttachments([...attachments, ...newAttachments]);
    setShowMediaOptions(false);
  };

  const removeAttachment = (index) => {
    const newAttachments = [...attachments];
    if (newAttachments[index].preview) {
      URL.revokeObjectURL(newAttachments[index].preview);
    }
    newAttachments.splice(index, 1);
    setAttachments(newAttachments);
  };

  const toggleCrosspost = (platform) => {
    setCrosspostTo(prev => ({
      ...prev,
      [platform]: !prev[platform],
    }));
  };

  const handleCreateChannel = async (e) => {
    e.preventDefault();
    if (!newChannelName.trim() || !currentUser) return;

    setCreatingChannel(true);
    try {
      const channel = await createChannel(
        communityName,
        newChannelName.trim(),
        newChannelDesc.trim(),
        newChannelPrivate,
        currentUser.id
      );
      if (channel) {
        setShowCreateChannel(false);
        setNewChannelName('');
        setNewChannelDesc('');
        setNewChannelPrivate(false);
        loadChannels();
      }
    } catch (error) {
      console.error('Error creating channel:', error);
    }
    setCreatingChannel(false);
  };

  // Channel Message Thread Handlers
  const handleOpenMessageThread = async (message) => {
    setSelectedMessageThread(message);
    setMessageThreadLoading(true);
    try {
      const replies = await fetchMessageReplies(message.id);
      setMessageThreadReplies(replies);
    } catch (error) {
      console.error('Error loading message thread:', error);
    }
    setMessageThreadLoading(false);
  };

  const handleCloseMessageThread = () => {
    setSelectedMessageThread(null);
    setMessageThreadReplies([]);
    setNewMessageThreadReply('');
  };

  const handleSendMessageThreadReply = async (e) => {
    e.preventDefault();
    if (!newMessageThreadReply.trim() || !currentUser || !selectedMessageThread || !selectedChannel) return;

    try {
      const reply = await createMessageReply(selectedChannel.id, currentUser.id, newMessageThreadReply.trim(), selectedMessageThread.id);
      if (reply) {
        setMessageThreadReplies(prev => [...prev, reply]);
        setNewMessageThreadReply('');
        // Update reply count in messages list
        setChannelMessages(prev => prev.map(m =>
          m.id === selectedMessageThread.id ? { ...m, replyCount: (m.replyCount || 0) + 1 } : m
        ));
      }
    } catch (error) {
      console.error('Error sending thread reply:', error);
    }
  };

  // Scroll thread to bottom
  useEffect(() => {
    if (threadEndRef.current) {
      threadEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messageThreadReplies]);

  // Generate invite link handler
  const handleGenerateInvite = async () => {
    if (!createdCommunity || !currentUser) return;

    setGeneratingInvite(true);
    const { data, error } = await createCommunityInvite(createdCommunity.id, currentUser.id);

    if (error) {
      console.error('Error generating invite:', error);
      setGeneratingInvite(false);
      return;
    }

    // Build the invite link
    const baseUrl = window.location.origin;
    const link = `${baseUrl}/join/${data.code}`;
    setInviteLink(link);
    setGeneratingInvite(false);
    setShowInviteModal(true);
  };

  // Copy invite link handler
  const handleCopyInvite = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setInviteCopied(true);
      setTimeout(() => setInviteCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Search for users to add
  const handleMemberSearch = (searchTerm) => {
    setMemberSearch(searchTerm);

    if (memberSearchTimeoutRef.current) {
      clearTimeout(memberSearchTimeoutRef.current);
    }

    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }

    memberSearchTimeoutRef.current = setTimeout(async () => {
      setSearchLoading(true);
      const results = await fetchUsers({ search: searchTerm, limit: 10 });
      // Filter out users who are already members
      const existingMemberIds = members.map(m => m.id);
      const filtered = results.filter(u =>
        !existingMemberIds.includes(u.id) &&
        !addedMembers.includes(u.id) &&
        u.id !== currentUser?.id
      );
      setSearchResults(filtered);
      setSearchLoading(false);
    }, 300);
  };

  // Add member directly
  const handleAddMember = async (user) => {
    if (!createdCommunity || addingMember) return;

    setAddingMember(user.id);
    const { error } = await addCommunityMember(createdCommunity.id, user.id, 'member');

    if (!error) {
      setAddedMembers(prev => [...prev, user.id]);
      setSearchResults(prev => prev.filter(u => u.id !== user.id));
      // Refresh member count
      setMemberCount(prev => prev + 1);
    }
    setAddingMember(null);
  };

  // Reset invite modal state when closing
  const handleCloseInviteModal = () => {
    setShowInviteModal(false);
    setMemberSearch('');
    setSearchResults([]);
    setAddedMembers([]);
  };

  // Search for users to add as moderator
  const handleModSearch = (searchTerm) => {
    setModSearch(searchTerm);

    if (modSearchTimeoutRef.current) {
      clearTimeout(modSearchTimeoutRef.current);
    }

    if (!searchTerm.trim()) {
      setModSearchResults([]);
      return;
    }

    modSearchTimeoutRef.current = setTimeout(async () => {
      setModSearchLoading(true);
      const results = await fetchUsers({ search: searchTerm, limit: 10 });
      // Filter out users who are already moderators/admins
      const existingModIds = moderators.map(m => m.user.id);
      const filtered = results.filter(u =>
        !existingModIds.includes(u.id) &&
        u.id !== currentUser?.id
      );
      setModSearchResults(filtered);
      setModSearchLoading(false);
    }, 300);
  };

  // Add a user as moderator
  const handleAddModerator = async (user) => {
    if (!createdCommunity || addingMod) return;

    setAddingMod(user.id);
    const { error } = await updateCommunityMemberRole(createdCommunity.id, user.id, 'moderator');

    if (!error) {
      // Refresh moderators list
      await loadModerators();
      setModSearchResults(prev => prev.filter(u => u.id !== user.id));
      setModSearch('');
    }
    setAddingMod(null);
  };

  // Remove moderator (demote to member)
  const handleRemoveModerator = async (userId) => {
    if (!createdCommunity || removingMod) return;

    setRemovingMod(userId);
    const { error } = await demoteCommunityMember(createdCommunity.id, userId);

    if (!error) {
      // Refresh moderators list
      await loadModerators();
    }
    setRemovingMod(null);
  };

  // Promote moderator to admin (admin only)
  const handlePromoteToAdmin = async (userId) => {
    if (!createdCommunity || promotingToAdmin || userRole !== 'admin') return;

    setPromotingToAdmin(userId);
    const { error } = await updateCommunityMemberRole(createdCommunity.id, userId, 'admin');

    if (!error) {
      // Refresh moderators list
      await loadModerators();
    }
    setPromotingToAdmin(null);
  };

  // Delete community handler
  const handleDeleteCommunity = async () => {
    if (!createdCommunity) return;

    setDeleting(true);
    const { error } = await deleteCommunity(createdCommunity.id);

    if (error) {
      console.error('Error deleting community:', error);
      setDeleting(false);
      return;
    }

    // Navigate to explore communities page after deletion
    navigate('/explore');
  };

  // Handle approving a join request
  const handleApproveRequest = async (request) => {
    if (!createdCommunity || processingRequest) return;

    setProcessingRequest(request.id);
    const { success } = await approveJoinRequest(
      request.id,
      currentUser.id,
      createdCommunity.id,
      request.user_id
    );

    if (success) {
      // Remove from pending list and update count
      setPendingRequests(prev => prev.filter(r => r.id !== request.id));
      setPendingRequestCount(prev => Math.max(0, prev - 1));
      setMemberCount(prev => prev + 1);
    }
    setProcessingRequest(null);
  };

  // Handle rejecting a join request
  const handleRejectRequest = async (request) => {
    if (!createdCommunity || processingRequest) return;

    setProcessingRequest(request.id);
    const { success } = await rejectJoinRequest(request.id, currentUser.id);

    if (success) {
      // Remove from pending list and update count
      setPendingRequests(prev => prev.filter(r => r.id !== request.id));
      setPendingRequestCount(prev => Math.max(0, prev - 1));
    }
    setProcessingRequest(null);
  };

  // Show loading state
  if (loading) {
    return (
      <div className="community-page">
        <div className="loading-indicator">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="community-page">
      {/* Community Header */}
      <header className="community-header">
        <div className="community-header-content">
          <div className="community-header-left">
            <h1 className="community-title">{communityName}</h1>
            <div className="community-meta-row">
              <span className="community-members">
                {memberCount} members
              </span>
              {createdCommunity?.visibility && createdCommunity.visibility !== 'public' && (
                <span className={`visibility-indicator ${createdCommunity.visibility}`}>
                  {createdCommunity.visibility === 'semi-public' ? (
                    <>
                      <UsersThree size={14} weight="bold" />
                      <span>Requires approval</span>
                    </>
                  ) : (
                    <>
                      <Lock size={14} weight="bold" />
                      <span>Invite only</span>
                    </>
                  )}
                </span>
              )}
            </div>
          </div>
          <div className="community-header-actions">
            {/* Show edit button for admins of created communities */}
            {createdCommunity && userRole === 'admin' && (
              <button
                className="edit-community-btn"
                onClick={() => setShowEditModal(true)}
                title="Edit community"
              >
                <PencilSimple size={18} />
              </button>
            )}
            {/* Show invite button for admins/moderators of created communities */}
            {createdCommunity && (userRole === 'admin' || userRole === 'moderator') && (
              <button
                className="invite-btn"
                onClick={() => setShowInviteModal(true)}
                title="Invite members"
              >
                <LinkIcon size={18} />
                <span>Invite</span>
              </button>
            )}
            <button
              className={`join-btn ${isMember ? 'member' : ''} ${hasPendingRequest ? 'pending' : ''}`}
              onClick={handleJoinLeave}
              disabled={joiningLoading || hasPendingRequest}
            >
              {joiningLoading ? '...' : isMember ? 'Leave' : hasPendingRequest ? (
                <>
                  <Clock size={16} weight="bold" />
                  Pending
                </>
              ) : createdCommunity?.visibility === 'semi-public' ? 'Request to Join' : 'Join'}
            </button>
          </div>
        </div>
        {leaveWarning && (
          <div className="leave-warning">
            <span>{leaveWarning}</span>
            <button onClick={() => setLeaveWarning(null)}>×</button>
          </div>
        )}
      </header>

      {/* Tab Navigation */}
      <nav className="community-tabs">
        {/* Channels - only for members */}
        {isMember && (
          <button
            className={`community-tab ${activeTab === 'channels' ? 'active' : ''}`}
            onClick={() => setActiveTab('channels')}
          >
            Channels
          </button>
        )}
        {/* Directory - hide for semi-public non-members */}
        {(isMember || createdCommunity?.visibility !== 'semi-public') && (
          <button
            className={`community-tab ${activeTab === 'directory' ? 'active' : ''}`}
            onClick={() => setActiveTab('directory')}
          >
            Directory
          </button>
        )}
        <button
          className={`community-tab ${activeTab === 'about' ? 'active' : ''}`}
          onClick={() => setActiveTab('about')}
        >
          About
        </button>
      </nav>

      {/* Directory Tab Content */}
      {activeTab === 'directory' && (
        <div className="community-directory">
          {/* Search Bar */}
          <div className="community-search-container">
            <div className="community-search-bar">
              <MagnifyingGlass className="search-icon" size={20} weight="bold" />
              <input
                type="text"
                placeholder="Search members..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button className="search-clear" onClick={() => setSearch('')}>
                  <X size={14} weight="bold" />
                </button>
              )}
            </div>
          </div>

          {/* Members Grid */}
          <div className="community-members-grid">
            {members.map((user) => (
              <Link
                key={user.id}
                to={user.id === currentUser?.id ? '/profile' : `/user/${user.id}`}
                className="member-card"
              >
                <div className="member-image">
                  <img
                    src={user.mainPhoto || user.photos?.[0] || 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%22 height=%22100%22%3E%3Crect fill=%22%23e0e0e0%22 width=%22100%22 height=%22100%22/%3E%3C/svg%3E'}
                    alt={user.name}
                    onError={(e) => {
                      e.target.src = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%22 height=%22100%22%3E%3Crect fill=%22%23e0e0e0%22 width=%22100%22 height=%22100%22/%3E%3C/svg%3E';
                    }}
                  />
                </div>
                <div className="member-content">
                  <h3 className="member-name">{user.name}</h3>
                  <p className="member-bio">{user.quickBio || user.bio}</p>

                  <div className="member-badges">
                    {user.hereFor?.includes('Love') && <span className="badge love">Love</span>}
                    {user.hereFor?.includes('Friends') && <span className="badge friends">Friends</span>}
                    {user.hereFor?.includes('Collaboration') && <span className="badge collab">Collab</span>}
                  </div>

                  <div className="member-meta">
                    <p>{[user.age, user.gender, user.location].filter(Boolean).join(' \u2022 ')}</p>
                  </div>

                  {user.communities && user.communities.length > 0 && (
                    <div className="member-communities">
                      {user.communities.slice(0, 2).join(', ')}
                    </div>
                  )}

                  {/* Voucher avatars */}
                  {userVouchers[user.id] && userVouchers[user.id].length > 0 && (
                    <div className="member-vouchers">
                      {userVouchers[user.id].slice(0, 4).map((voucher, idx) => (
                        <img
                          key={idx}
                          src={voucher.photo || 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%22 height=%22100%22%3E%3Crect fill=%22%23e0e0e0%22 width=%22100%22 height=%22100%22/%3E%3C/svg%3E'}
                          alt={voucher.name}
                          className="voucher-avatar"
                          title={`Vouched by ${voucher.name}`}
                        />
                      ))}
                      {userVouchers[user.id].length > 4 && (
                        <span className="voucher-more">+{userVouchers[user.id].length - 4}</span>
                      )}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>

          {membersLoading && (
            <div className="loading-indicator">
              <p>Loading members...</p>
            </div>
          )}

          {!membersLoading && hasMore && members.length > 0 && (
            <div className="load-more-container">
              <button className="load-more-btn" onClick={handleLoadMore}>
                Load More
              </button>
            </div>
          )}

          {!membersLoading && members.length === 0 && (
            <div className="no-results">
              <p>No members found{search ? ` matching "${search}"` : ' in this community'}.</p>
              {search && (
                <button onClick={() => setSearch('')}>Clear Search</button>
              )}
            </div>
          )}
        </div>
      )}

      {/* About Tab Content */}
      {activeTab === 'about' && (
        <div className="community-about">
          {/* Community Description */}
          {createdCommunity?.description && (
            <section className="about-section">
              <h3>About</h3>
              <p className="about-description">{createdCommunity.description}</p>
            </section>
          )}

          {/* Moderators Section */}
          <section className="about-section">
            <div className="section-header">
              <h3>Moderators</h3>
              {createdCommunity && (userRole === 'admin' || userRole === 'moderator') && (
                <button
                  className="btn btn-sm btn-secondary"
                  onClick={() => setShowAddModerator(!showAddModerator)}
                >
                  <Plus size={14} /> Add
                </button>
              )}
            </div>

            {/* Add Moderator Search */}
            {showAddModerator && (
              <div className="add-moderator-section">
                <div className="mod-search-container">
                  <MagnifyingGlass size={16} className="mod-search-icon" />
                  <input
                    type="text"
                    value={modSearch}
                    onChange={(e) => handleModSearch(e.target.value)}
                    placeholder="Search users to add as moderator..."
                    className="mod-search-input"
                  />
                </div>

                {(modSearchResults.length > 0 || modSearchLoading) && (
                  <div className="mod-search-results">
                    {modSearchLoading ? (
                      <div className="search-loading">Searching...</div>
                    ) : (
                      modSearchResults.map(user => (
                        <div key={user.id} className="mod-search-result">
                          <img
                            src={user.mainPhoto || 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%22 height=%22100%22%3E%3Crect fill=%22%23e0e0e0%22 width=%22100%22 height=%22100%22/%3E%3C/svg%3E'}
                            alt={user.name}
                            className="mod-search-avatar"
                          />
                          <div className="mod-search-info">
                            <span className="mod-search-name">{user.name}</span>
                            {user.location && (
                              <span className="mod-search-location">{user.location}</span>
                            )}
                          </div>
                          <button
                            className="btn btn-sm btn-primary"
                            onClick={() => handleAddModerator(user)}
                            disabled={addingMod === user.id}
                          >
                            {addingMod === user.id ? '...' : 'Add'}
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}

            {moderatorsLoading ? (
              <div className="loading-indicator">
                <p>Loading...</p>
              </div>
            ) : moderators.length > 0 ? (
              <div className="moderators-list">
                {moderators.map((mod) => (
                  <div key={mod.user.id} className="moderator-card">
                    <Link
                      to={mod.user.id === currentUser?.id ? '/profile' : `/user/${mod.user.id}`}
                      className="moderator-link"
                    >
                      <img
                        src={mod.user.photo || 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%22 height=%22100%22%3E%3Crect fill=%22%23e0e0e0%22 width=%22100%22 height=%22100%22/%3E%3C/svg%3E'}
                        alt={mod.user.name}
                        className="moderator-avatar"
                      />
                      <div className="moderator-info">
                        <div className="moderator-name-row">
                          <span className="moderator-name">{mod.user.name}</span>
                          <span className={`moderator-role ${mod.role}`}>
                            {mod.role === 'admin' ? 'Admin' : 'Moderator'}
                          </span>
                        </div>
                        {mod.user.bio && (
                          <p className="moderator-bio">{mod.user.bio}</p>
                        )}
                        {mod.user.location && (
                          <p className="moderator-location">{mod.user.location}</p>
                        )}
                      </div>
                    </Link>
                    {/* Action buttons for moderators */}
                    {mod.role === 'moderator' && mod.user.id !== currentUser?.id && (
                      <div className="mod-actions">
                        {/* Make Admin button - only for admins */}
                        {userRole === 'admin' && (
                          <button
                            className="btn btn-sm btn-secondary mod-promote-btn"
                            onClick={() => handlePromoteToAdmin(mod.user.id)}
                            disabled={promotingToAdmin === mod.user.id}
                            title="Promote to admin"
                          >
                            {promotingToAdmin === mod.user.id ? '...' : 'Make Admin'}
                          </button>
                        )}
                        {/* Remove button - for admins and moderators */}
                        {(userRole === 'admin' || userRole === 'moderator') && (
                          <button
                            className="btn btn-sm btn-ghost mod-remove-btn"
                            onClick={() => handleRemoveModerator(mod.user.id)}
                            disabled={removingMod === mod.user.id}
                            title="Remove moderator"
                          >
                            {removingMod === mod.user.id ? '...' : <X size={16} />}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="no-moderators">No moderators found for this community.</p>
            )}
          </section>

          {/* Pending Applications - only for semi-public communities and admins/moderators */}
          {createdCommunity?.visibility === 'semi-public' && (userRole === 'admin' || userRole === 'moderator') && (
            <section className="about-section pending-section">
              <div className="section-header">
                <h3>
                  <UserPlus size={20} weight="duotone" />
                  Pending Applications
                  {pendingRequestCount > 0 && (
                    <span className="pending-count">{pendingRequestCount}</span>
                  )}
                </h3>
              </div>

              {requestsLoading ? (
                <div className="loading-indicator">
                  <p>Loading...</p>
                </div>
              ) : pendingRequests.length > 0 ? (
                <div className="pending-requests-list">
                  {pendingRequests.map((request) => (
                    <div key={request.id} className="pending-request-card">
                      <Link
                        to={`/user/${request.user.id}`}
                        className="request-user-info"
                      >
                        <img
                          src={request.user.photo || 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%22 height=%22100%22%3E%3Crect fill=%22%23e0e0e0%22 width=%22100%22 height=%22100%22/%3E%3C/svg%3E'}
                          alt={request.user.name}
                          className="request-avatar"
                        />
                        <div className="request-user-details">
                          <span className="request-user-name">{request.user.name}</span>
                          {request.user.bio && (
                            <span className="request-user-bio">{request.user.bio}</span>
                          )}
                          {request.user.location && (
                            <span className="request-user-location">{request.user.location}</span>
                          )}
                        </div>
                      </Link>
                      {request.message && (
                        <p className="request-message">"{request.message}"</p>
                      )}
                      <div className="request-actions">
                        <button
                          className="btn btn-sm btn-primary"
                          onClick={() => handleApproveRequest(request)}
                          disabled={processingRequest === request.id}
                        >
                          {processingRequest === request.id ? '...' : 'Approve'}
                        </button>
                        <button
                          className="btn btn-sm btn-ghost"
                          onClick={() => handleRejectRequest(request)}
                          disabled={processingRequest === request.id}
                        >
                          {processingRequest === request.id ? '...' : 'Reject'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="no-pending">No pending applications</p>
              )}
            </section>
          )}

          {/* Community Stats */}
          <section className="about-section">
            <h3>Community Info</h3>
            <div className="about-stats">
              <div className="stat-item">
                <span className="stat-label">Members</span>
                <span className="stat-value">{memberCount}</span>
              </div>
              {createdCommunity?.created_at && (
                <div className="stat-item">
                  <span className="stat-label">Created</span>
                  <span className="stat-value">
                    {new Date(createdCommunity.created_at).toLocaleDateString('en-US', {
                      month: 'long',
                      year: 'numeric'
                    })}
                  </span>
                </div>
              )}
            </div>
          </section>

          {/* Adjacent Communities */}
          <section className="about-section">
            <h3>Adjacent Communities</h3>
            {adjacentLoading ? (
              <div className="loading-indicator">
                <p>Loading...</p>
              </div>
            ) : adjacentCommunities.length > 0 ? (
              <div className="adjacent-communities">
                {adjacentCommunities.map((comm) => {
                  const isJoined = currentUser?.communities?.includes(comm.name);
                  return (
                    <Link
                      key={comm.slug}
                      to={`/community/${comm.slug}`}
                      className={`adjacent-community-pill ${isJoined ? 'joined' : ''}`}
                    >
                      {isJoined && <Check size={14} weight="bold" />}
                      {comm.name}
                    </Link>
                  );
                })}
              </div>
            ) : (
              <p className="no-adjacent">No adjacent communities found yet.</p>
            )}
          </section>

                  </div>
      )}

      {/* Channels Tab Content - Slack-like Layout */}
      {activeTab === 'channels' && (
        <div className="slack-layout">
          {/* Channel Sidebar */}
          <div className="slack-sidebar">
            <div className="sidebar-header">
              <h3>Channels</h3>
              {isMember && (
                <button className="add-channel-btn" onClick={() => setShowCreateChannel(true)} title="Create channel">
                  <Plus size={16} weight="bold" />
                </button>
              )}
            </div>

            {channelsLoading ? (
              <div className="sidebar-loading">Loading...</div>
            ) : (
              <div className="channel-list">
                {channels.map((channel) => (
                  <button
                    key={channel.id}
                    className={`channel-item ${selectedChannel?.id === channel.id ? 'active' : ''} ${channel.is_private && !channel.hasAccess ? 'locked' : ''}`}
                    onClick={() => handleSelectChannel(channel)}
                  >
                    {channel.is_private ? <Lock size={16} /> : <Hash size={16} />}
                    <span className="channel-item-name">{channel.name}</span>
                  </button>
                ))}
                {channels.length === 0 && (
                  <div className="no-channels">
                    <p>No channels yet</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Main Message Area */}
          <div className={`slack-main ${selectedMessageThread ? 'with-thread' : ''}`}>
            {selectedChannel ? (
              <>
                <div className="slack-header">
                  <div className="slack-header-title">
                    {selectedChannel.is_private ? <Lock size={18} /> : <Hash size={18} />}
                    <h2>{selectedChannel.name}</h2>
                  </div>
                  {selectedChannel.description && (
                    <p className="slack-header-desc">{selectedChannel.description}</p>
                  )}
                </div>

                <div className="slack-messages">
                  {messagesLoading ? (
                    <div className="loading-indicator">
                      <p>Loading messages...</p>
                    </div>
                  ) : channelMessages.length > 0 ? (
                    <>
                      {channelMessages.map((msg) => (
                        <div
                          key={msg.id}
                          className={`slack-message ${selectedMessageThread?.id === msg.id ? 'highlighted' : ''}`}
                        >
                          <Link to={msg.author?.id === currentUser?.id ? '/profile' : `/user/${msg.author?.id}`}>
                            <img
                              src={msg.author?.photo || 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%22 height=%22100%22%3E%3Crect fill=%22%23e0e0e0%22 width=%22100%22 height=%22100%22/%3E%3C/svg%3E'}
                              alt={msg.author?.name}
                              className="slack-avatar"
                            />
                          </Link>
                          <div className="slack-message-body">
                            <div className="slack-message-header">
                              <Link
                                to={msg.author?.id === currentUser?.id ? '/profile' : `/user/${msg.author?.id}`}
                                className="slack-author"
                              >
                                {msg.author?.name || 'Anonymous'}
                              </Link>
                              <span className="slack-time">{formatTimeAgo(msg.created_at)}</span>
                            </div>
                            <p className="slack-text">{msg.content}</p>
                            {msg.attachments && msg.attachments.length > 0 && (
                              <div className="message-attachments">
                                {msg.attachments.map((att, idx) => (
                                  <a
                                    key={idx}
                                    href={att.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={`message-attachment ${att.type?.startsWith('image/') ? 'image' : 'file'}`}
                                  >
                                    {att.type?.startsWith('image/') ? (
                                      <img src={att.url} alt={att.name} />
                                    ) : (
                                      <span className="file-attachment">
                                        <File size={16} />
                                        {att.name}
                                      </span>
                                    )}
                                  </a>
                                ))}
                              </div>
                            )}
                            {msg.replyCount > 0 ? (
                              <button
                                className="slack-thread-indicator"
                                onClick={() => handleOpenMessageThread(msg)}
                              >
                                <span className="thread-count">{msg.replyCount} {msg.replyCount === 1 ? 'reply' : 'replies'}</span>
                                <span className="thread-view">View thread</span>
                              </button>
                            ) : (
                              <button
                                className="slack-reply-btn"
                                onClick={() => handleOpenMessageThread(msg)}
                              >
                                <ChatText size={14} />
                                <span>Reply</span>
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                      <div ref={messagesEndRef} />
                    </>
                  ) : (
                    <div className="slack-empty">
                      <Hash size={48} weight="light" />
                      <h3>Welcome to #{selectedChannel.name}</h3>
                      <p>This is the start of the channel. Send a message to get the conversation going!</p>
                    </div>
                  )}
                </div>

                {isMember && (
                  <form className="slack-input" onSubmit={handleSendMessage}>
                    {attachments.length > 0 && (
                      <div className="attachments-preview">
                        {attachments.map((att, index) => (
                          <div key={index} className="attachment-item">
                            {att.preview ? (
                              <img src={att.preview} alt="" />
                            ) : (
                              <div className="attachment-file">
                                <File size={20} />
                                <span>{att.name}</span>
                              </div>
                            )}
                            <button
                              type="button"
                              className="attachment-remove"
                              onClick={() => removeAttachment(index)}
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="input-row">
                      <div className="media-buttons">
                        <button
                          type="button"
                          className="media-btn"
                          onClick={() => setShowMediaOptions(!showMediaOptions)}
                          title="Add media"
                        >
                          <Image size={20} />
                        </button>

                        {showMediaOptions && (
                          <div className="media-options-dropdown">
                            <button type="button" onClick={() => imageInputRef.current?.click()}>
                              <Image size={18} /> Image
                            </button>
                            <button type="button" onClick={() => fileInputRef.current?.click()}>
                              <File size={18} /> File
                            </button>
                            <button type="button" disabled>
                              <LinkIcon size={18} /> Link
                            </button>
                            <button type="button" disabled>
                              <Gif size={18} /> GIF
                            </button>
                            <button type="button" disabled>
                              <Microphone size={18} /> Voice
                            </button>
                            <button type="button" disabled>
                              <VideoCamera size={18} /> Video
                            </button>
                          </div>
                        )}
                      </div>

                      <input
                        type="text"
                        placeholder={`Message #${selectedChannel.name}`}
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        className="message-input"
                      />

                      <div className="crosspost-wrapper">
                        <button
                          type="button"
                          className={`crosspost-btn ${Object.values(crosspostTo).some(v => v) ? 'active' : ''}`}
                          onClick={() => setShowCrosspostOptions(!showCrosspostOptions)}
                          title="Crosspost"
                        >
                          <CaretDown size={16} />
                        </button>

                        {showCrosspostOptions && (
                          <div className="crosspost-dropdown">
                            <div className="crosspost-header">Crosspost to:</div>
                            <label className={crosspostTo.twitter ? 'active' : ''}>
                              <input
                                type="checkbox"
                                checked={crosspostTo.twitter}
                                onChange={() => toggleCrosspost('twitter')}
                              />
                              <TwitterLogo size={18} weight="fill" />
                              Twitter
                            </label>
                            <label className={crosspostTo.bluesky ? 'active' : ''}>
                              <input
                                type="checkbox"
                                checked={crosspostTo.bluesky}
                                onChange={() => toggleCrosspost('bluesky')}
                              />
                              <At size={18} weight="bold" />
                              Bluesky
                            </label>
                            <label className={crosspostTo.substack ? 'active' : ''}>
                              <input
                                type="checkbox"
                                checked={crosspostTo.substack}
                                onChange={() => toggleCrosspost('substack')}
                              />
                              <Article size={18} />
                              Substack
                            </label>
                          </div>
                        )}
                      </div>

                      <button
                        type="submit"
                        className="send-btn"
                        disabled={sendingMessage || (!newMessage.trim() && attachments.length === 0)}
                      >
                        <PaperPlaneTilt size={20} weight="fill" />
                      </button>
                    </div>

                    <input
                      type="file"
                      ref={imageInputRef}
                      accept="image/*"
                      multiple
                      onChange={(e) => handleFileSelect(e, 'image')}
                      style={{ display: 'none' }}
                    />
                    <input
                      type="file"
                      ref={fileInputRef}
                      multiple
                      onChange={(e) => handleFileSelect(e, 'file')}
                      style={{ display: 'none' }}
                    />
                  </form>
                )}
              </>
            ) : (
              <div className="slack-empty">
                <Hash size={48} weight="light" />
                <h3>Select a channel</h3>
                <p>Choose a channel from the sidebar to start chatting</p>
              </div>
            )}
          </div>

          {/* Thread Panel */}
          {selectedMessageThread && (
            <div className="slack-thread">
              <div className="slack-thread-header">
                <h3>Thread</h3>
                <button className="thread-close-btn" onClick={handleCloseMessageThread}>
                  <X size={20} />
                </button>
              </div>

              <div className="slack-thread-content">
                {/* Original Message */}
                <div className="slack-message original">
                  <img
                    src={selectedMessageThread.author?.photo || 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%22 height=%22100%22%3E%3Crect fill=%22%23e0e0e0%22 width=%22100%22 height=%22100%22/%3E%3C/svg%3E'}
                    alt={selectedMessageThread.author?.name}
                    className="slack-avatar"
                  />
                  <div className="slack-message-body">
                    <div className="slack-message-header">
                      <span className="slack-author">{selectedMessageThread.author?.name || 'Anonymous'}</span>
                      <span className="slack-time">{formatTimeAgo(selectedMessageThread.created_at)}</span>
                    </div>
                    <p className="slack-text">{selectedMessageThread.content}</p>
                  </div>
                </div>

                <div className="thread-reply-divider">
                  <span>{messageThreadReplies.length} {messageThreadReplies.length === 1 ? 'reply' : 'replies'}</span>
                </div>

                {/* Thread Replies */}
                <div className="slack-thread-replies">
                  {messageThreadLoading ? (
                    <div className="loading-indicator">
                      <p>Loading replies...</p>
                    </div>
                  ) : (
                    messageThreadReplies.map((reply) => (
                      <div key={reply.id} className="slack-message">
                        <Link to={reply.author?.id === currentUser?.id ? '/profile' : `/user/${reply.author?.id}`}>
                          <img
                            src={reply.author?.photo || 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%22 height=%22100%22%3E%3Crect fill=%22%23e0e0e0%22 width=%22100%22 height=%22100%22/%3E%3C/svg%3E'}
                            alt={reply.author?.name}
                            className="reply-avatar"
                          />
                        </Link>
                        <div className="reply-content">
                          <div className="reply-header">
                            <Link
                              to={reply.author?.id === currentUser?.id ? '/profile' : `/user/${reply.author?.id}`}
                              className="reply-author"
                            >
                              {reply.author?.name || 'Anonymous'}
                            </Link>
                            <span className="reply-time">{formatTimeAgo(reply.created_at)}</span>
                          </div>
                          <p className="reply-text">{reply.content}</p>
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={threadEndRef} />
                </div>

                {/* Reply Input */}
                {isMember && (
                  <form className="thread-input" onSubmit={handleSendMessageThreadReply}>
                    <input
                      type="text"
                      placeholder="Reply to thread..."
                      value={newMessageThreadReply}
                      onChange={(e) => setNewMessageThreadReply(e.target.value)}
                    />
                    <button type="submit" disabled={!newMessageThreadReply.trim()}>
                      <PaperPlaneTilt size={18} weight="fill" />
                    </button>
                  </form>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create Channel Modal */}
      {showCreateChannel && (
        <div className="modal-overlay" onClick={() => setShowCreateChannel(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Create a channel</h3>
              <button className="modal-close" onClick={() => setShowCreateChannel(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateChannel}>
              <div className="form-group">
                <label>Channel name</label>
                <input
                  type="text"
                  value={newChannelName}
                  onChange={(e) => setNewChannelName(e.target.value)}
                  placeholder="e.g. introductions"
                  required
                />
              </div>
              <div className="form-group">
                <label>Description (optional)</label>
                <input
                  type="text"
                  value={newChannelDesc}
                  onChange={(e) => setNewChannelDesc(e.target.value)}
                  placeholder="What's this channel about?"
                />
              </div>
              <div className="form-group checkbox">
                <label>
                  <input
                    type="checkbox"
                    checked={newChannelPrivate}
                    onChange={(e) => setNewChannelPrivate(e.target.checked)}
                  />
                  Make private
                </label>
                <p className="form-hint">Only invited members can see and join</p>
              </div>
              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowCreateChannel(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={creatingChannel || !newChannelName.trim()}>
                  {creatingChannel ? 'Creating...' : 'Create Channel'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invite Link Modal */}
      {showInviteModal && (
        <div className="modal-overlay" onClick={handleCloseInviteModal}>
          <div className="modal-content invite-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Invite Members</h3>
              <button className="modal-close" onClick={handleCloseInviteModal}>
                <X size={20} />
              </button>
            </div>
            <div className="invite-modal-body">
              {/* Add Members Section */}
              <div className="add-members-section">
                <label>Add members from directory</label>
                <div className="member-search-container">
                  <MagnifyingGlass size={18} className="member-search-icon" />
                  <input
                    type="text"
                    value={memberSearch}
                    onChange={(e) => handleMemberSearch(e.target.value)}
                    placeholder="Search by name..."
                    className="member-search-input"
                  />
                </div>

                {/* Search Results */}
                {(searchResults.length > 0 || searchLoading) && (
                  <div className="member-search-results">
                    {searchLoading ? (
                      <div className="search-loading">Searching...</div>
                    ) : (
                      searchResults.map(user => (
                        <div key={user.id} className="member-search-result">
                          <img
                            src={user.mainPhoto || 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%22 height=%22100%22%3E%3Crect fill=%22%23e0e0e0%22 width=%22100%22 height=%22100%22/%3E%3C/svg%3E'}
                            alt={user.name}
                            className="member-search-avatar"
                          />
                          <div className="member-search-info">
                            <span className="member-search-name">{user.name}</span>
                            {user.location && (
                              <span className="member-search-location">{user.location}</span>
                            )}
                          </div>
                          <button
                            className="member-add-btn"
                            onClick={() => handleAddMember(user)}
                            disabled={addingMember === user.id}
                          >
                            {addingMember === user.id ? '...' : 'Add'}
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {addedMembers.length > 0 && (
                  <p className="added-members-note">
                    <Check size={14} /> {addedMembers.length} member{addedMembers.length > 1 ? 's' : ''} added
                  </p>
                )}
              </div>

              <div className="invite-divider">
                <span>or share invite link</span>
              </div>

              {/* Invite Link Section */}
              <div className="invite-link-section">
                {inviteLink ? (
                  <>
                    <div className="invite-link-container">
                      <input
                        type="text"
                        value={inviteLink}
                        readOnly
                        className="invite-link-input"
                      />
                      <button
                        className="invite-copy-btn"
                        onClick={handleCopyInvite}
                      >
                        {inviteCopied ? (
                          <>
                            <Check size={18} />
                            <span>Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy size={18} />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                    <p className="invite-modal-note">
                      This link doesn't expire. You can generate new links anytime.
                    </p>
                  </>
                ) : (
                  <button
                    className="generate-link-btn"
                    onClick={handleGenerateInvite}
                    disabled={generatingInvite}
                  >
                    {generatingInvite ? 'Generating...' : 'Generate Invite Link'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Community Modal */}
      {createdCommunity && userRole === 'admin' && (
        <EditCommunityModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          community={createdCommunity}
          onUpdate={(updatedCommunity) => {
            setCreatedCommunity(updatedCommunity);
          }}
        />
      )}
    </div>
  );
};

export default CommunityPage;
