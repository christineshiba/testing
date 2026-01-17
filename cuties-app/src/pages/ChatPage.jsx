import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import './ChatPage.css';

const ChatPage = () => {
  const { userId } = useParams();
  const { users, messages, sendMessage, isAuthenticated } = useApp();
  const [inputMessage, setInputMessage] = useState('');
  const messagesEndRef = useRef(null);
  const navigate = useNavigate();

  if (!isAuthenticated) {
    navigate('/login');
    return null;
  }

  const user = users.find(u => u.id === parseInt(userId));
  const chatMessages = messages[userId] || [];

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = (e) => {
    e.preventDefault();
    if (inputMessage.trim()) {
      sendMessage(parseInt(userId), inputMessage);
      setInputMessage('');
    }
  };

  if (!user) {
    return (
      <div className="chat-page">
        <div className="user-not-found">
          <h2>User not found</h2>
          <Link to="/matches">Back to Matches</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-page">
      <div className="chat-container">
        <div className="chat-header">
          <Link to="/matches" className="back-button">
            ← Back
          </Link>
          <div className="chat-user-info">
            <img src={user.photos[0]} alt={user.name} className="chat-avatar" />
            <div>
              <h2>{user.name}</h2>
              <p>{user.location}</p>
            </div>
          </div>
        </div>

        <div className="chat-messages">
          {chatMessages.length === 0 ? (
            <div className="no-messages">
              <p>You matched with {user.name}! 💕</p>
              <p>Say hi and start a conversation!</p>
            </div>
          ) : (
            chatMessages.map((msg) => (
              <div
                key={msg.id}
                className={`message ${msg.sender === 'me' ? 'message-sent' : 'message-received'}`}
              >
                <div className="message-content">
                  <p>{msg.text}</p>
                  <span className="message-time">
                    {new Date(msg.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              </div>
            ))
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
          />
          <button type="submit" className="send-button">
            Send
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatPage;
