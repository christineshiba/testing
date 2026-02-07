import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useNavigate, Link } from 'react-router-dom';
import { supabase, createGroupConversation, fetchUsers } from '../lib/supabase';
import { ChatCircle, UsersThree, X, Plus } from '@phosphor-icons/react';
import { PageLoading, Spinner } from '../components/Loading';
import './MessagesPage.css';

const MessagesPage = () => {
  const { currentUser, isAuthenticated, loading } = useApp();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [showNewGroupModal, setShowNewGroupModal] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [creatingGroup, setCreatingGroup] = useState(false);

  useEffect(() => {
    const loadConversations = async () => {
      if (!currentUser) return;

      setDataLoading(true);

      try {
        // Directly query messages (simpler approach that works)
        const { data: messages, error } = await supabase
          .from('messages')
          .select(`
            *,
            sender:sender_id(id, name, main_photo),
            recipient:recipient_id(id, name, main_photo)
          `)
          .or(`sender_id.eq.${currentUser.id},recipient_id.eq.${currentUser.id}`)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching messages:', error);
          setDataLoading(false);
          return;
        }

        // Group messages by conversation partner
        const conversationMap = new Map();

        (messages || []).forEach(msg => {
          const isFromMe = msg.sender_id === currentUser.id;
          const partner = isFromMe ? msg.recipient : msg.sender;
          const partnerId = isFromMe ? msg.recipient_id : msg.sender_id;

          if (!partnerId || !partner) return;

          if (!conversationMap.has(partnerId)) {
            conversationMap.set(partnerId, {
              id: partnerId,
              name: partner.name,
              photo: partner.main_photo,
              lastMessage: msg.content,
              lastMessageTime: msg.created_at,
              lastMessageSenderId: msg.sender_id,
              isGroup: false,
            });
          }
        });

        // Convert to array and sort by most recent
        const conversationList = Array.from(conversationMap.values())
          .sort((a, b) => new Date(b.lastMessageTime) - new Date(a.lastMessageTime));

        setConversations(conversationList);
      } catch (error) {
        console.error('Error loading conversations:', error);
      } finally {
        setDataLoading(false);
      }
    };

    if (isAuthenticated && currentUser) {
      loadConversations();
    }
  }, [currentUser, isAuthenticated]);

  // Search for users to add to group
  useEffect(() => {
    const searchUsers = async () => {
      if (!searchQuery.trim()) {
        setSearchResults([]);
        return;
      }

      try {
        const users = await fetchUsers({ search: searchQuery, limit: 10 });
        // Filter out current user and already selected users
        const filtered = users.filter(
          u => u.id !== currentUser?.id && !selectedUsers.find(s => s.id === u.id)
        );
        setSearchResults(filtered);
      } catch (error) {
        console.error('Error searching users:', error);
      }
    };

    const debounce = setTimeout(searchUsers, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery, currentUser, selectedUsers]);

  const handleCreateGroup = async () => {
    if (!groupName.trim() || selectedUsers.length < 1) return;

    setCreatingGroup(true);
    try {
      const conversationId = await createGroupConversation(
        currentUser.id,
        groupName.trim(),
        selectedUsers.map(u => u.id)
      );

      if (conversationId) {
        navigate(`/chat/${conversationId}`);
      }
    } catch (error) {
      console.error('Error creating group:', error);
      alert('Failed to create group. Please try again.');
    } finally {
      setCreatingGroup(false);
    }
  };

  const addUserToSelection = (user) => {
    setSelectedUsers(prev => [...prev, user]);
    setSearchQuery('');
    setSearchResults([]);
  };

  const removeUserFromSelection = (userId) => {
    setSelectedUsers(prev => prev.filter(u => u.id !== userId));
  };

  // Format relative time
  const formatTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  // Fix protocol-relative URLs
  const fixPhotoUrl = (url) => {
    if (!url) return 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%22 height=%22100%22%3E%3Crect fill=%22%23e0e0e0%22 width=%22100%22 height=%22100%22/%3E%3C/svg%3E';
    if (url.startsWith('//')) return 'https:' + url;
    return url;
  };

  const closeModal = () => {
    setShowNewGroupModal(false);
    setGroupName('');
    setSelectedUsers([]);
    setSearchQuery('');
    setSearchResults([]);
  };

  if (loading) {
    return (
      <div className="messages-page">
        <PageLoading message="Loading messages..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    navigate('/login');
    return null;
  }

  return (
    <div className="messages-page">
      <div className="messages-container">
        <div className="messages-header">
          <h1 className="messages-title">Messages</h1>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => setShowNewGroupModal(true)}
          >
            <Plus size={16} weight="bold" /> New Group
          </button>
        </div>

        {dataLoading ? (
          <p className="loading-text">Loading your conversations...</p>
        ) : conversations.length === 0 ? (
          <div className="no-messages">
            <div className="no-messages-icon"><ChatCircle size={48} weight="light" /></div>
            <h2>No messages yet</h2>
            <p>Start a conversation with someone from the directory!</p>
            <Link to="/directory" className="browse-link">
              Browse Directory
            </Link>
          </div>
        ) : (
          <div className="conversations-list">
            {conversations.map((convo) => (
              <Link
                key={convo.id}
                to={`/chat/${convo.id}`}
                className="conversation-item"
              >
                {convo.isGroup ? (
                  <div className="group-avatar">
                    <UsersThree size={24} weight="fill" />
                  </div>
                ) : (
                  <img
                    src={fixPhotoUrl(convo.photo)}
                    alt={convo.name}
                    className="conversation-avatar"
                    onError={(e) => {
                      e.target.src = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%22 height=%22100%22%3E%3Crect fill=%22%23e0e0e0%22 width=%22100%22 height=%22100%22/%3E%3C/svg%3E';
                    }}
                  />
                )}
                <div className="conversation-content">
                  <div className="conversation-header">
                    <span className="conversation-name">
                      {convo.isGroup && <span className="group-badge">Group</span>}
                      {convo.name || 'Unknown'}
                    </span>
                    <span className="conversation-time">{formatTime(convo.lastMessageTime)}</span>
                  </div>
                  <p className="conversation-preview">
                    {convo.lastMessageSenderId === currentUser?.id && <span className="you-prefix">You: </span>}
                    {convo.isGroup && convo.lastMessageSenderId !== currentUser?.id && convo.lastMessageSender && (
                      <span className="sender-prefix">{convo.lastMessageSender}: </span>
                    )}
                    {convo.lastMessage || 'No messages yet'}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* New Group Modal */}
      {showNewGroupModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Create Group Chat</h2>
              <button className="modal-close" onClick={closeModal}><X size={20} weight="bold" /></button>
            </div>

            <div className="modal-body">
              <div className="form-group">
                <label>Group Name</label>
                <input
                  type="text"
                  value={groupName}
                  onChange={e => setGroupName(e.target.value)}
                  placeholder="Enter group name..."
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label>Add Members</label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search for users..."
                  className="form-input"
                />
                {searchResults.length > 0 && (
                  <div className="search-results">
                    {searchResults.map(user => (
                      <div
                        key={user.id}
                        className="search-result-item"
                        onClick={() => addUserToSelection(user)}
                      >
                        <img
                          src={fixPhotoUrl(user.mainPhoto)}
                          alt={user.name}
                          className="search-result-avatar"
                        />
                        <span>{user.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {selectedUsers.length > 0 && (
                <div className="selected-users">
                  <label>Selected Members ({selectedUsers.length})</label>
                  <div className="selected-users-list">
                    {selectedUsers.map(user => (
                      <div key={user.id} className="selected-user-chip">
                        <img
                          src={fixPhotoUrl(user.mainPhoto)}
                          alt={user.name}
                          className="chip-avatar"
                        />
                        <span>{user.name}</span>
                        <button
                          className="chip-remove"
                          onClick={() => removeUserFromSelection(user.id)}
                        >
                          <X size={14} weight="bold" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn-secondary" onClick={closeModal}>
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={handleCreateGroup}
                disabled={!groupName.trim() || selectedUsers.length < 1 || creatingGroup}
              >
                {creatingGroup ? 'Creating...' : 'Create Group'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MessagesPage;
