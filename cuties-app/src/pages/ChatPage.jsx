import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { supabase, fetchUserById } from '../lib/supabase';
import { ArrowLeft } from '@phosphor-icons/react';
import './ChatPage.css';

const ChatPage = () => {
  const { userId } = useParams();
  const { currentUser, isAuthenticated, loading } = useApp();
  const [otherUser, setOtherUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [dataLoading, setDataLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);
  const navigate = useNavigate();

  // Load other user's profile and messages
  useEffect(() => {
    const loadChatData = async () => {
      if (!currentUser || !userId) return;

      setDataLoading(true);

      try {
        // Fetch the other user's profile
        const user = await fetchUserById(userId);
        setOtherUser(user);

        // Fetch messages between current user and other user
        const { data: msgs, error } = await supabase
          .from('messages')
          .select('*')
          .or(
            `and(sender_id.eq.${currentUser.id},recipient_id.eq.${userId}),and(sender_id.eq.${userId},recipient_id.eq.${currentUser.id})`
          )
          .order('created_at', { ascending: true });

        if (error) {
          console.error('Error fetching messages:', error);
        } else {
          setMessages(msgs || []);
        }
      } catch (error) {
        console.error('Error loading chat:', error);
      } finally {
        setDataLoading(false);
      }
    };

    if (isAuthenticated && currentUser) {
      loadChatData();
    }
  }, [currentUser, userId, isAuthenticated]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Fix protocol-relative URLs
  const fixPhotoUrl = (url) => {
    if (!url) return 'https://via.placeholder.com/50?text=?';
    if (url.startsWith('//')) return 'https:' + url;
    return url;
  };

  // Format time
  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Format date for date separators
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
    }
  };

  // Send a message
  const handleSend = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || sending) return;

    setSending(true);

    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          sender_id: currentUser.id,
          recipient_id: userId,
          content: inputMessage.trim(),
        })
        .select()
        .single();

      if (error) {
        console.error('Error sending message:', error);
        alert('Failed to send message. Please try again.');
      } else {
        setMessages((prev) => [...prev, data]);
        setInputMessage('');
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  // Wait for session check to complete
  if (loading) {
    return (
      <div className="chat-page">
        <div className="chat-container">
          <p className="loading-text">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    navigate('/login');
    return null;
  }

  if (dataLoading) {
    return (
      <div className="chat-page">
        <div className="chat-container">
          <p className="loading-text">Loading conversation...</p>
        </div>
      </div>
    );
  }

  if (!otherUser) {
    return (
      <div className="chat-page">
        <div className="chat-container">
          <div className="user-not-found">
            <h2>User not found</h2>
            <Link to="/messages">Back to Messages</Link>
          </div>
        </div>
      </div>
    );
  }

  // Group messages by date
  let lastDate = null;

  return (
    <div className="chat-page">
      <div className="chat-container">
        <div className="chat-header">
          <Link to="/messages" className="back-button">
            <ArrowLeft size={20} weight="bold" />
          </Link>
          <Link to={`/user/${otherUser.id}`} className="chat-user-info">
            <img
              src={fixPhotoUrl(otherUser.mainPhoto || otherUser.photos?.[0])}
              alt={otherUser.name}
              className="chat-avatar"
              onError={(e) => {
                e.target.src = 'https://via.placeholder.com/50?text=?';
              }}
            />
            <div className="chat-user-details">
              <h2>{otherUser.name}</h2>
              {otherUser.location && <p>{otherUser.location}</p>}
            </div>
          </Link>
        </div>

        <div className="chat-messages">
          {messages.length === 0 ? (
            <div className="no-messages">
              <p>Start a conversation with {otherUser.name}!</p>
            </div>
          ) : (
            messages.map((msg) => {
              const msgDate = formatDate(msg.created_at);
              const showDateSeparator = msgDate !== lastDate;
              lastDate = msgDate;

              return (
                <div key={msg.id}>
                  {showDateSeparator && (
                    <div className="date-separator">
                      <span>{msgDate}</span>
                    </div>
                  )}
                  <div
                    className={`message ${
                      msg.sender_id === currentUser.id ? 'message-sent' : 'message-received'
                    }`}
                  >
                    <div className="message-content">
                      <p>{msg.content}</p>
                      <span className="message-time">{formatTime(msg.created_at)}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSend} className="chat-input-form">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Type a message..."
            className="chat-input"
            disabled={sending}
          />
          <button type="submit" className="send-button" disabled={sending || !inputMessage.trim()}>
            {sending ? '...' : 'Send'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatPage;
