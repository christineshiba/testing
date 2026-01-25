import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { getCommunityBySlug, slugToName } from '../data/communities';
import {
  fetchUsersByCommunity,
  fetchVouchersForUsers,
  joinCommunity,
  leaveCommunity,
  fetchCommunityPosts,
  createCommunityPost,
  likePost,
  unlikePost,
  getPostLikes,
  addPostComment,
  fetchPostComments,
  fetchCommunityMemberCounts,
} from '../lib/supabase';
import { MagnifyingGlass, X, Heart, ChatCircle, PaperPlaneTilt } from '@phosphor-icons/react';
import './CommunityPage.css';

const CommunityPage = () => {
  const { communityId } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, currentUser, loading, refreshCurrentUser } = useApp();
  const [activeTab, setActiveTab] = useState('directory');
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

  // Feed state
  const [posts, setPosts] = useState([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [newPostContent, setNewPostContent] = useState('');
  const [postingLoading, setPostingLoading] = useState(false);
  const [postLikes, setPostLikes] = useState({});
  const [expandedComments, setExpandedComments] = useState({});
  const [postComments, setPostComments] = useState({});
  const [newComments, setNewComments] = useState({});

  // Get community data from slug
  const community = getCommunityBySlug(communityId);
  const communityName = community?.name || slugToName(communityId);

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate('/login');
    }
  }, [loading, isAuthenticated, navigate]);

  // Check if user is a member
  useEffect(() => {
    if (currentUser && communityName) {
      setIsMember(currentUser.communities?.includes(communityName) || false);
    }
  }, [currentUser, communityName]);

  // Load member count
  useEffect(() => {
    const loadMemberCount = async () => {
      const counts = await fetchCommunityMemberCounts();
      setMemberCount(counts[communityName] || 0);
    };
    if (communityName) {
      loadMemberCount();
    }
  }, [communityName]);

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
  }, [communityName, search]);

  const loadMembers = async (reset = false) => {
    if (!communityName) return;

    setMembersLoading(true);
    const currentPage = reset ? 0 : page;
    const results = await fetchUsersByCommunity(communityName, {
      page: currentPage,
      limit: 20,
      search,
    });

    if (reset) {
      setMembers(results);
      setPage(0);
    } else {
      setMembers(prev => [...prev, ...results]);
    }

    // If we got fewer than 20 results, there's no more to load
    setHasMore(results.length === 20);
    setMembersLoading(false);
  };

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

  // Load posts when feed tab is active
  useEffect(() => {
    if (activeTab === 'feed' && communityName) {
      loadPosts();
    }
  }, [activeTab, communityName]);

  const loadPosts = async () => {
    setPostsLoading(true);
    try {
      const fetchedPosts = await fetchCommunityPosts(communityName);
      setPosts(fetchedPosts);

      // Load likes for each post
      if (currentUser) {
        const likesData = {};
        for (const post of fetchedPosts) {
          likesData[post.id] = await getPostLikes(post.id, currentUser.id);
        }
        setPostLikes(likesData);
      }
    } catch (error) {
      console.error('Error loading posts:', error);
    }
    setPostsLoading(false);
  };

  const handleLoadMore = () => {
    setPage(prev => prev + 1);
    loadMembers(false);
  };

  const handleJoinLeave = async () => {
    if (!currentUser) return;

    setJoiningLoading(true);
    try {
      if (isMember) {
        const result = await leaveCommunity(currentUser.id, communityName);
        if (result.success) {
          setIsMember(false);
          setMemberCount(prev => Math.max(0, prev - 1));
          if (refreshCurrentUser) refreshCurrentUser();
        }
      } else {
        const result = await joinCommunity(currentUser.id, communityName);
        if (result.success) {
          setIsMember(true);
          setMemberCount(prev => prev + 1);
          if (refreshCurrentUser) refreshCurrentUser();
        }
      }
    } catch (error) {
      console.error('Error joining/leaving community:', error);
    }
    setJoiningLoading(false);
  };

  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!newPostContent.trim() || !currentUser) return;

    setPostingLoading(true);
    try {
      const newPost = await createCommunityPost(currentUser.id, communityName, newPostContent.trim());
      if (newPost) {
        // Add the post with author info to the top
        setPosts(prev => [{
          ...newPost,
          author: {
            id: currentUser.id,
            name: currentUser.name,
            photo: currentUser.mainPhoto,
          },
        }, ...prev]);
        setNewPostContent('');
        setPostLikes(prev => ({
          ...prev,
          [newPost.id]: { count: 0, userLiked: false },
        }));
      }
    } catch (error) {
      console.error('Error creating post:', error);
    }
    setPostingLoading(false);
  };

  const handleLikePost = async (postId) => {
    if (!currentUser) return;

    const currentLikes = postLikes[postId] || { count: 0, userLiked: false };

    if (currentLikes.userLiked) {
      // Optimistic update
      setPostLikes(prev => ({
        ...prev,
        [postId]: { count: currentLikes.count - 1, userLiked: false },
      }));
      await unlikePost(currentUser.id, postId);
    } else {
      // Optimistic update
      setPostLikes(prev => ({
        ...prev,
        [postId]: { count: currentLikes.count + 1, userLiked: true },
      }));
      await likePost(currentUser.id, postId);
    }
  };

  const handleToggleComments = async (postId) => {
    if (expandedComments[postId]) {
      setExpandedComments(prev => ({ ...prev, [postId]: false }));
    } else {
      setExpandedComments(prev => ({ ...prev, [postId]: true }));
      // Load comments if not already loaded
      if (!postComments[postId]) {
        const comments = await fetchPostComments(postId);
        setPostComments(prev => ({ ...prev, [postId]: comments }));
      }
    }
  };

  const handleAddComment = async (postId) => {
    const content = newComments[postId]?.trim();
    if (!content || !currentUser) return;

    const newComment = await addPostComment(currentUser.id, postId, content);
    if (newComment) {
      setPostComments(prev => ({
        ...prev,
        [postId]: [...(prev[postId] || []), newComment],
      }));
      setNewComments(prev => ({ ...prev, [postId]: '' }));
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
          <div className="community-header-text">
            <h1 className="community-title">{communityName}</h1>
            <p className="community-desc">{community?.description || `Connect with others in the ${communityName} community`}</p>
            <div className="community-header-meta">
              <span className="community-members">
                {memberCount} members
              </span>
              <button
                className={`join-btn ${isMember ? 'member' : ''}`}
                onClick={handleJoinLeave}
                disabled={joiningLoading}
              >
                {joiningLoading ? '...' : isMember ? 'Leave' : 'Join'}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <nav className="community-tabs">
        <button
          className={`community-tab ${activeTab === 'directory' ? 'active' : ''}`}
          onClick={() => setActiveTab('directory')}
        >
          Directory
        </button>
        <button
          className={`community-tab ${activeTab === 'feed' ? 'active' : ''}`}
          onClick={() => setActiveTab('feed')}
        >
          Feed
        </button>
        <button
          className={`community-tab ${activeTab === 'channels' ? 'active' : ''}`}
          onClick={() => setActiveTab('channels')}
        >
          Channels
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
                    src={user.mainPhoto || user.photos?.[0] || 'https://via.placeholder.com/400x400?text=No+Photo'}
                    alt={user.name}
                    onError={(e) => {
                      e.target.src = 'https://via.placeholder.com/400x400?text=No+Photo';
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
                          src={voucher.photo || 'https://via.placeholder.com/28?text=?'}
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

      {/* Feed Tab Content */}
      {activeTab === 'feed' && (
        <div className="community-feed">
          {/* Create Post Form */}
          {isMember && (
            <form className="create-post-form" onSubmit={handleCreatePost}>
              <div className="create-post-header">
                <img
                  src={currentUser?.mainPhoto || 'https://via.placeholder.com/40?text=?'}
                  alt={currentUser?.name}
                  className="create-post-avatar"
                />
                <textarea
                  placeholder={`Share something with ${communityName}...`}
                  value={newPostContent}
                  onChange={(e) => setNewPostContent(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="create-post-actions">
                <button
                  type="submit"
                  className="post-submit-btn"
                  disabled={!newPostContent.trim() || postingLoading}
                >
                  {postingLoading ? 'Posting...' : 'Post'}
                </button>
              </div>
            </form>
          )}

          {!isMember && (
            <div className="join-to-post">
              <p>Join this community to create posts and engage with members.</p>
              <button className="join-btn" onClick={handleJoinLeave} disabled={joiningLoading}>
                {joiningLoading ? '...' : 'Join Community'}
              </button>
            </div>
          )}

          {/* Posts List */}
          {postsLoading ? (
            <div className="loading-indicator">
              <p>Loading posts...</p>
            </div>
          ) : posts.length > 0 ? (
            <div className="posts-list">
              {posts.map((post) => (
                <div key={post.id} className="post-card">
                  <div className="post-header">
                    <Link to={post.author?.id === currentUser?.id ? '/profile' : `/user/${post.author?.id}`}>
                      <img
                        src={post.author?.photo || 'https://via.placeholder.com/40?text=?'}
                        alt={post.author?.name}
                        className="post-avatar"
                      />
                    </Link>
                    <div className="post-meta">
                      <Link
                        to={post.author?.id === currentUser?.id ? '/profile' : `/user/${post.author?.id}`}
                        className="post-author"
                      >
                        {post.author?.name || 'Anonymous'}
                      </Link>
                      <span className="post-time">{formatTimeAgo(post.created_at)}</span>
                    </div>
                  </div>
                  <div className="post-content">
                    {post.content}
                  </div>
                  <div className="post-actions">
                    <button
                      className={`post-action-btn ${postLikes[post.id]?.userLiked ? 'liked' : ''}`}
                      onClick={() => handleLikePost(post.id)}
                    >
                      <Heart size={18} weight={postLikes[post.id]?.userLiked ? 'fill' : 'regular'} />
                      <span>{postLikes[post.id]?.count || 0}</span>
                    </button>
                    <button
                      className="post-action-btn"
                      onClick={() => handleToggleComments(post.id)}
                    >
                      <ChatCircle size={18} />
                      <span>{postComments[post.id]?.length || 0}</span>
                    </button>
                  </div>

                  {/* Comments Section */}
                  {expandedComments[post.id] && (
                    <div className="post-comments">
                      {postComments[post.id]?.map((comment) => (
                        <div key={comment.id} className="comment">
                          <img
                            src={comment.author?.photo || 'https://via.placeholder.com/32?text=?'}
                            alt={comment.author?.name}
                            className="comment-avatar"
                          />
                          <div className="comment-content">
                            <span className="comment-author">{comment.author?.name}</span>
                            <span className="comment-text">{comment.content}</span>
                            <span className="comment-time">{formatTimeAgo(comment.created_at)}</span>
                          </div>
                        </div>
                      ))}

                      {isMember && (
                        <div className="add-comment">
                          <input
                            type="text"
                            placeholder="Write a comment..."
                            value={newComments[post.id] || ''}
                            onChange={(e) => setNewComments(prev => ({ ...prev, [post.id]: e.target.value }))}
                            onKeyPress={(e) => e.key === 'Enter' && handleAddComment(post.id)}
                          />
                          <button onClick={() => handleAddComment(post.id)}>
                            <PaperPlaneTilt size={16} weight="fill" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-feed">
              <p>No posts yet. Be the first to share something!</p>
            </div>
          )}
        </div>
      )}

      {/* Channels Tab Content */}
      {activeTab === 'channels' && (
        <div className="community-channels">
          <div className="channels-placeholder">
            <div className="channels-placeholder-icon">
              <span>Coming Soon</span>
            </div>
            <h3>Community Channels</h3>
            <p>Topic-based channels are coming soon. Stay tuned for focused discussions within your community!</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default CommunityPage;
