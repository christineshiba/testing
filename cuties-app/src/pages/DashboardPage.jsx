import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import {
  fetchUserCommunityChannels,
  fetchChannelMessages,
  sendChannelMessage,
  fetchMessageReplies,
  createMessageReply,
} from '../lib/supabase';
import {
  Hash,
  Lock,
  PaperPlaneTilt,
  ChatText,
  X,
} from '@phosphor-icons/react';
import './DashboardPage.css';

const DashboardPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated, currentUser, loading } = useApp();

  // Channels state
  const [channels, setChannels] = useState([]);
  const [channelsLoading, setChannelsLoading] = useState(true);
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [channelMessages, setChannelMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);

  // Thread state
  const [selectedMessageThread, setSelectedMessageThread] = useState(null);
  const [messageThreadReplies, setMessageThreadReplies] = useState([]);
  const [messageThreadLoading, setMessageThreadLoading] = useState(false);
  const [newMessageThreadReply, setNewMessageThreadReply] = useState('');

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate('/login');
    }
  }, [loading, isAuthenticated, navigate]);

  // Load channels from all user's communities
  useEffect(() => {
    const loadChannels = async () => {
      if (!currentUser?.communities || currentUser.communities.length === 0) {
        setChannelsLoading(false);
        return;
      }

      setChannelsLoading(true);
      try {
        const fetchedChannels = await fetchUserCommunityChannels(
          currentUser.id,
          currentUser.communities
        );
        setChannels(fetchedChannels);
      } catch (error) {
        console.error('Error loading channels:', error);
      }
      setChannelsLoading(false);
    };

    if (currentUser) {
      loadChannels();
    }
  }, [currentUser]);

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

  const handleSelectChannel = async (channel) => {
    setSelectedChannel(channel);
    setSelectedMessageThread(null);
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
    if (!newMessage.trim() || !currentUser || !selectedChannel) return;

    setSendingMessage(true);
    try {
      const message = await sendChannelMessage(
        selectedChannel.id,
        currentUser.id,
        newMessage.trim()
      );
      if (message) {
        setChannelMessages(prev => [...prev, message]);
        setNewMessage('');
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
    setSendingMessage(false);
  };

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
        setChannelMessages(prev => prev.map(m =>
          m.id === selectedMessageThread.id ? { ...m, replyCount: (m.replyCount || 0) + 1 } : m
        ));
      }
    } catch (error) {
      console.error('Error sending thread reply:', error);
    }
  };

  // Group channels by community
  const channelsByCommunity = channels.reduce((acc, channel) => {
    const community = channel.community_name;
    if (!acc[community]) {
      acc[community] = [];
    }
    acc[community].push(channel);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="dashboard-page">
        <div className="loading-indicator">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      {/* Dashboard Header */}
      <header className="dashboard-header-bar">
        <div className="dashboard-header-content">
          <h1>My Channels</h1>
        </div>
      </header>

      <div className="dashboard-layout">
        {/* Sidebar with all channels grouped by community */}
        <div className="dashboard-sidebar">
          <div className="sidebar-header">
            <h2>Channels</h2>
          </div>

          {channelsLoading ? (
            <div className="sidebar-loading">Loading channels...</div>
          ) : Object.keys(channelsByCommunity).length > 0 ? (
            <div className="community-channels-list">
              {Object.entries(channelsByCommunity).map(([communityName, communityChannels]) => (
                <div key={communityName} className="community-group">
                  <Link
                    to={`/community/${communityName.toLowerCase().replace(/\s+/g, '-').replace(/'/g, '')}`}
                    className="community-group-header"
                  >
                    {communityName}
                  </Link>
                  <div className="channel-list">
                    {communityChannels.map((channel) => (
                      <button
                        key={channel.id}
                        className={`channel-item ${selectedChannel?.id === channel.id ? 'active' : ''}`}
                        onClick={() => handleSelectChannel(channel)}
                      >
                        {channel.is_private ? <Lock size={14} /> : <Hash size={14} />}
                        <span className="channel-item-name">{channel.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-channels">
              <p>No channels yet</p>
              <p className="no-channels-hint">Join some communities to see their channels here</p>
            </div>
          )}
        </div>

        {/* Main Message Area */}
        <div className={`dashboard-main ${selectedMessageThread ? 'with-thread' : ''}`}>
          {selectedChannel ? (
            <>
              <div className="dashboard-channel-header">
                <div className="dashboard-channel-header-title">
                  {selectedChannel.is_private ? <Lock size={18} /> : <Hash size={18} />}
                  <h2>{selectedChannel.name}</h2>
                  <span className="channel-community-tag">{selectedChannel.community_name}</span>
                </div>
                {selectedChannel.description && (
                  <p className="dashboard-channel-header-desc">{selectedChannel.description}</p>
                )}
              </div>

              <div className="dashboard-messages">
                {messagesLoading ? (
                  <div className="loading-indicator">
                    <p>Loading messages...</p>
                  </div>
                ) : channelMessages.length > 0 ? (
                  <>
                    {channelMessages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`dashboard-message ${selectedMessageThread?.id === msg.id ? 'highlighted' : ''}`}
                      >
                        <Link to={msg.author?.id === currentUser?.id ? '/profile' : `/user/${msg.author?.id}`}>
                          <img
                            src={msg.author?.photo || 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%22 height=%22100%22%3E%3Crect fill=%22%23e0e0e0%22 width=%22100%22 height=%22100%22/%3E%3C/svg%3E'}
                            alt={msg.author?.name}
                            className="message-avatar"
                          />
                        </Link>
                        <div className="message-body">
                          <div className="message-header">
                            <Link
                              to={msg.author?.id === currentUser?.id ? '/profile' : `/user/${msg.author?.id}`}
                              className="message-author"
                            >
                              {msg.author?.name || 'Anonymous'}
                            </Link>
                            <span className="message-time">{formatTimeAgo(msg.created_at)}</span>
                          </div>
                          <p className="message-text">{msg.content}</p>
                          {msg.replyCount > 0 ? (
                            <button
                              className="thread-indicator"
                              onClick={() => handleOpenMessageThread(msg)}
                            >
                              <span className="thread-count">{msg.replyCount} {msg.replyCount === 1 ? 'reply' : 'replies'}</span>
                              <span className="thread-view">View thread</span>
                            </button>
                          ) : (
                            <button
                              className="reply-btn"
                              onClick={() => handleOpenMessageThread(msg)}
                            >
                              <ChatText size={14} />
                              <span>Reply</span>
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </>
                ) : (
                  <div className="dashboard-empty">
                    <Hash size={48} weight="light" />
                    <h3>Welcome to #{selectedChannel.name}</h3>
                    <p>This is the start of the channel. Send a message to get the conversation going!</p>
                  </div>
                )}
              </div>

              <form className="dashboard-input" onSubmit={handleSendMessage}>
                <div className="input-row">
                  <input
                    type="text"
                    placeholder={`Message #${selectedChannel.name}`}
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    className="message-input"
                  />
                  <button
                    type="submit"
                    className="send-btn"
                    disabled={sendingMessage || !newMessage.trim()}
                  >
                    <PaperPlaneTilt size={20} weight="fill" />
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="dashboard-empty">
              <Hash size={48} weight="light" />
              <h3>Select a channel</h3>
              <p>Choose a channel from the sidebar to start chatting</p>
            </div>
          )}
        </div>

        {/* Thread Panel */}
        {selectedMessageThread && (
          <div className="dashboard-thread">
            <div className="thread-header">
              <h3>Thread</h3>
              <button className="thread-close-btn" onClick={handleCloseMessageThread}>
                <X size={20} />
              </button>
            </div>

            <div className="thread-content">
              {/* Original Message */}
              <div className="dashboard-message original">
                <img
                  src={selectedMessageThread.author?.photo || 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%22 height=%22100%22%3E%3Crect fill=%22%23e0e0e0%22 width=%22100%22 height=%22100%22/%3E%3C/svg%3E'}
                  alt={selectedMessageThread.author?.name}
                  className="message-avatar"
                />
                <div className="message-body">
                  <div className="message-header">
                    <span className="message-author">{selectedMessageThread.author?.name || 'Anonymous'}</span>
                    <span className="message-time">{formatTimeAgo(selectedMessageThread.created_at)}</span>
                  </div>
                  <p className="message-text">{selectedMessageThread.content}</p>
                </div>
              </div>

              <div className="thread-reply-divider">
                <span>{messageThreadReplies.length} {messageThreadReplies.length === 1 ? 'reply' : 'replies'}</span>
              </div>

              {/* Thread Replies */}
              <div className="thread-replies">
                {messageThreadLoading ? (
                  <div className="loading-indicator">
                    <p>Loading replies...</p>
                  </div>
                ) : (
                  messageThreadReplies.map((reply) => (
                    <div key={reply.id} className="dashboard-message">
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
              </div>

              {/* Reply Input */}
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
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;
