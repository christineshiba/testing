import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import {
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from '../lib/supabase';
import { Heart, ChatCircle, HandWaving, Handshake, Bell, Check } from '@phosphor-icons/react';
import './NotificationsPage.css';

const NotificationsPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated, currentUser, loading } = useApp();
  const [notifications, setNotifications] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(true);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate('/login');
    }
  }, [loading, isAuthenticated, navigate]);

  useEffect(() => {
    const loadNotifications = async () => {
      if (!currentUser) return;

      setNotificationsLoading(true);
      const data = await fetchNotifications(currentUser.id);
      setNotifications(data);
      setNotificationsLoading(false);
    };

    if (currentUser) {
      loadNotifications();
    }
  }, [currentUser]);

  const handleMarkAsRead = async (notificationId) => {
    const success = await markNotificationRead(notificationId);
    if (success) {
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      );
    }
  };

  const handleMarkAllRead = async () => {
    const success = await markAllNotificationsRead(currentUser.id);
    if (success) {
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    }
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

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'like':
        return <Heart size={20} weight="fill" className="notif-icon like" />;
      case 'message':
        return <ChatCircle size={20} weight="fill" className="notif-icon message" />;
      case 'interest':
        return <HandWaving size={20} weight="fill" className="notif-icon interest" />;
      case 'vouch':
        return <Handshake size={20} weight="fill" className="notif-icon vouch" />;
      default:
        return <Bell size={20} weight="fill" className="notif-icon" />;
    }
  };

  const getNotificationMessage = (notification) => {
    const name = notification.fromUser?.name || 'Someone';
    switch (notification.type) {
      case 'like':
        return <><strong>{name}</strong> liked your profile</>;
      case 'message':
        return <><strong>{name}</strong> sent you a message</>;
      case 'interest':
        return <><strong>{name}</strong> indicated interest in you</>;
      case 'vouch':
        return <><strong>{name}</strong> vouched for you</>;
      case 'match':
        return <>You matched with <strong>{name}</strong>!</>;
      default:
        return notification.message || 'New notification';
    }
  };

  const getNotificationLink = (notification) => {
    if (notification.link) return notification.link;
    if (notification.fromUser) {
      if (notification.type === 'message') {
        return `/chat/${notification.fromUser.id}`;
      }
      return `/user/${notification.fromUser.id}`;
    }
    return null;
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  if (loading) {
    return (
      <div className="notifications-page">
        <div className="notifications-container">
          <p className="loading-text">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="notifications-page">
      <div className="notifications-container">
        <div className="notifications-header">
          <h1>Notifications</h1>
          {unreadCount > 0 && (
            <button className="mark-all-read-btn" onClick={handleMarkAllRead}>
              <Check size={16} /> Mark all as read
            </button>
          )}
        </div>

        {notificationsLoading ? (
          <p className="loading-text">Loading notifications...</p>
        ) : notifications.length === 0 ? (
          <div className="empty-state">
            <Bell size={48} weight="light" />
            <h3>No notifications yet</h3>
            <p>When someone likes you, messages you, or indicates interest, you'll see it here.</p>
          </div>
        ) : (
          <div className="notifications-list">
            {notifications.map((notification) => {
              const link = getNotificationLink(notification);
              const content = (
                <>
                  <div className="notif-icon-wrapper">
                    {notification.fromUser?.photo ? (
                      <img
                        src={notification.fromUser.photo}
                        alt={notification.fromUser.name}
                        className="notif-avatar"
                      />
                    ) : (
                      <div className="notif-avatar-placeholder">
                        {getNotificationIcon(notification.type)}
                      </div>
                    )}
                    <div className="notif-type-badge">
                      {getNotificationIcon(notification.type)}
                    </div>
                  </div>
                  <div className="notif-content">
                    <p className="notif-message">{getNotificationMessage(notification)}</p>
                    <span className="notif-time">{formatTimeAgo(notification.created_at)}</span>
                  </div>
                  {!notification.is_read && (
                    <div className="unread-dot" />
                  )}
                </>
              );

              return link ? (
                <Link
                  key={notification.id}
                  to={link}
                  className={`notification-item ${!notification.is_read ? 'unread' : ''}`}
                  onClick={() => handleMarkAsRead(notification.id)}
                >
                  {content}
                </Link>
              ) : (
                <div
                  key={notification.id}
                  className={`notification-item ${!notification.is_read ? 'unread' : ''}`}
                  onClick={() => handleMarkAsRead(notification.id)}
                >
                  {content}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;
