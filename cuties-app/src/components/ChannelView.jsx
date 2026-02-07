import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import {
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
  Image,
  Link as LinkIcon,
  File,
  Microphone,
  VideoCamera,
  Gif,
  TwitterLogo,
  At,
  Article,
  CaretDown,
} from '@phosphor-icons/react';
import './ChannelView.css';

const ChannelView = ({
  channels,
  selectedChannel,
  onSelectChannel,
  showCommunityName = false,
  onChannelCreated,
}) => {
  const { currentUser } = useApp();
  const [channelMessages, setChannelMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const messagesEndRef = useRef(null);

  // Thread state
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

  // Load messages when channel changes
  useEffect(() => {
    const loadMessages = async () => {
      if (!selectedChannel) return;

      setMessagesLoading(true);
      setSelectedMessageThread(null);
      try {
        const messages = await fetchChannelMessages(selectedChannel.id);
        setChannelMessages(messages);
      } catch (error) {
        console.error('Error loading messages:', error);
      }
      setMessagesLoading(false);
    };

    loadMessages();
  }, [selectedChannel]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [channelMessages]);

  // Scroll thread to bottom
  useEffect(() => {
    if (threadEndRef.current) {
      threadEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messageThreadReplies]);

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

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentUser || !selectedChannel) return;

    setSendingMessage(true);
    try {
      const message = await sendChannelMessage(
        selectedChannel.id,
        currentUser.id,
        newMessage.trim(),
        attachments.length > 0 ? { attachments } : null
      );
      if (message) {
        setChannelMessages([...channelMessages, message]);
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

  const handleOpenThread = async (message) => {
    setSelectedMessageThread(message);
    setMessageThreadLoading(true);
    try {
      const replies = await fetchMessageReplies(message.id);
      setMessageThreadReplies(replies);
    } catch (error) {
      console.error('Error loading thread:', error);
    }
    setMessageThreadLoading(false);
  };

  const handleSendThreadReply = async (e) => {
    e.preventDefault();
    if (!newMessageThreadReply.trim() || !currentUser || !selectedMessageThread) return;

    try {
      const reply = await createMessageReply(
        selectedMessageThread.id,
        currentUser.id,
        newMessageThreadReply.trim()
      );
      if (reply) {
        setMessageThreadReplies([...messageThreadReplies, reply]);
        setNewMessageThreadReply('');
      }
    } catch (error) {
      console.error('Error sending reply:', error);
    }
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

  if (!selectedChannel) {
    return (
      <div className="channel-view">
        <div className="channel-sidebar">
          <div className="channel-list-header">
            <h3>Channels</h3>
          </div>
          <div className="channel-list">
            {channels.map((channel) => (
              <button
                key={channel.id}
                className="channel-item"
                onClick={() => onSelectChannel(channel)}
              >
                {channel.is_private ? <Lock size={16} /> : <Hash size={16} />}
                <span className="channel-name">{channel.name}</span>
                {showCommunityName && channel.communityName && (
                  <span className="channel-community">{channel.communityName}</span>
                )}
              </button>
            ))}
          </div>
        </div>
        <div className="channel-main">
          <div className="channel-empty">
            <Hash size={48} weight="light" />
            <p>Select a channel to start chatting</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="channel-view">
      <div className="channel-sidebar">
        <div className="channel-list-header">
          <h3>Channels</h3>
        </div>
        <div className="channel-list">
          {channels.map((channel) => (
            <button
              key={channel.id}
              className={`channel-item ${selectedChannel?.id === channel.id ? 'active' : ''}`}
              onClick={() => onSelectChannel(channel)}
            >
              {channel.is_private ? <Lock size={16} /> : <Hash size={16} />}
              <span className="channel-name">{channel.name}</span>
              {showCommunityName && channel.communityName && (
                <span className="channel-community">{channel.communityName}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="channel-main">
        <div className="channel-header">
          <div className="channel-header-info">
            {selectedChannel.is_private ? <Lock size={20} /> : <Hash size={20} />}
            <h2>{selectedChannel.name}</h2>
          </div>
          {showCommunityName && selectedChannel.communityName && (
            <Link
              to={`/community/${selectedChannel.communitySlug}`}
              className="channel-community-link"
            >
              {selectedChannel.communityName}
            </Link>
          )}
        </div>

        <div className="channel-messages">
          {messagesLoading ? (
            <div className="messages-loading">Loading messages...</div>
          ) : channelMessages.length === 0 ? (
            <div className="messages-empty">
              <p>No messages yet. Start the conversation!</p>
            </div>
          ) : (
            channelMessages.map((message) => (
              <div key={message.id} className="message-item">
                <Link to={`/user/${message.user?.id}`} className="message-avatar">
                  <img
                    src={message.user?.photo || 'data:image/svg+xml,...'}
                    alt={message.user?.name}
                  />
                </Link>
                <div className="message-content">
                  <div className="message-header">
                    <Link to={`/user/${message.user?.id}`} className="message-author">
                      {message.user?.name}
                    </Link>
                    <span className="message-time">{formatTimeAgo(message.created_at)}</span>
                  </div>
                  <p className="message-text">{message.content}</p>
                  {message.metadata?.attachments && (
                    <div className="message-attachments">
                      {message.metadata.attachments.map((att, i) => (
                        att.type === 'image' && att.url ? (
                          <img key={i} src={att.url} alt="" className="message-image" />
                        ) : null
                      ))}
                    </div>
                  )}
                  <button
                    className="message-reply-btn"
                    onClick={() => handleOpenThread(message)}
                  >
                    <ChatText size={14} />
                    {message.reply_count > 0 ? `${message.reply_count} replies` : 'Reply'}
                  </button>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        <form className="channel-input-form" onSubmit={handleSendMessage}>
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
      </div>

      {/* Thread Panel */}
      {selectedMessageThread && (
        <div className="thread-panel">
          <div className="thread-header">
            <h3>Thread</h3>
            <button onClick={() => setSelectedMessageThread(null)}>
              <X size={20} />
            </button>
          </div>

          <div className="thread-original">
            <div className="message-item">
              <img
                src={selectedMessageThread.user?.photo || 'data:image/svg+xml,...'}
                alt=""
                className="message-avatar-img"
              />
              <div className="message-content">
                <div className="message-header">
                  <span className="message-author">{selectedMessageThread.user?.name}</span>
                  <span className="message-time">{formatTimeAgo(selectedMessageThread.created_at)}</span>
                </div>
                <p className="message-text">{selectedMessageThread.content}</p>
              </div>
            </div>
          </div>

          <div className="thread-replies">
            {messageThreadLoading ? (
              <div className="thread-loading">Loading replies...</div>
            ) : messageThreadReplies.length === 0 ? (
              <div className="thread-empty">No replies yet</div>
            ) : (
              messageThreadReplies.map((reply) => (
                <div key={reply.id} className="message-item">
                  <img
                    src={reply.user?.photo || 'data:image/svg+xml,...'}
                    alt=""
                    className="message-avatar-img"
                  />
                  <div className="message-content">
                    <div className="message-header">
                      <span className="message-author">{reply.user?.name}</span>
                      <span className="message-time">{formatTimeAgo(reply.created_at)}</span>
                    </div>
                    <p className="message-text">{reply.content}</p>
                  </div>
                </div>
              ))
            )}
            <div ref={threadEndRef} />
          </div>

          <form className="thread-input-form" onSubmit={handleSendThreadReply}>
            <input
              type="text"
              placeholder="Reply..."
              value={newMessageThreadReply}
              onChange={(e) => setNewMessageThreadReply(e.target.value)}
            />
            <button type="submit" disabled={!newMessageThreadReply.trim()}>
              <PaperPlaneTilt size={18} weight="fill" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default ChannelView;
