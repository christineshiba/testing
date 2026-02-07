import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { getInviteByCode, redeemInvite } from '../lib/supabase';
import { Users, Lock, CheckCircle, XCircle } from '@phosphor-icons/react';
import './JoinCommunityPage.css';

const JoinCommunityPage = () => {
  const { inviteCode } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, currentUser, loading: authLoading } = useApp();

  const [invite, setInvite] = useState(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const loadInvite = async () => {
      if (!inviteCode) {
        setError('Invalid invite link');
        setLoading(false);
        return;
      }

      const inviteData = await getInviteByCode(inviteCode);

      if (!inviteData) {
        setError('This invite link is invalid or has expired');
        setLoading(false);
        return;
      }

      setInvite(inviteData);
      setLoading(false);
    };

    loadInvite();
  }, [inviteCode]);

  const handleJoin = async () => {
    if (!currentUser || !invite) return;

    setJoining(true);
    setError('');

    const { data, error: joinError, alreadyMember } = await redeemInvite(inviteCode, currentUser.id);

    if (joinError) {
      setError(joinError.message || 'Failed to join community');
      setJoining(false);
      return;
    }

    if (alreadyMember) {
      // Redirect to community if already a member
      navigate(`/community/${data.slug}`);
      return;
    }

    setSuccess(true);
    setJoining(false);

    // Redirect to community after short delay
    setTimeout(() => {
      navigate(`/community/${data.slug}`);
    }, 2000);
  };

  // Show loading while checking auth
  if (authLoading || loading) {
    return (
      <div className="join-page">
        <div className="join-container">
          <div className="join-loading">
            <p>Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !invite) {
    return (
      <div className="join-page">
        <div className="join-container">
          <div className="join-card error">
            <XCircle size={48} weight="fill" className="error-icon" />
            <h2>Invalid Invite</h2>
            <p>{error}</p>
            <Link to="/" className="btn-primary">
              Go Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="join-page">
        <div className="join-container">
          <div className="join-card success">
            <CheckCircle size={48} weight="fill" className="success-icon" />
            <h2>Welcome!</h2>
            <p>You've joined {invite.community.name}</p>
            <p className="redirect-text">Redirecting to the community...</p>
          </div>
        </div>
      </div>
    );
  }

  // Not authenticated - prompt to sign in
  if (!isAuthenticated) {
    return (
      <div className="join-page">
        <div className="join-container">
          <div className="join-card">
            <div className="join-community-icon">
              {invite?.community?.is_private ? (
                <Lock size={32} weight="fill" />
              ) : (
                <Users size={32} weight="fill" />
              )}
            </div>
            <h2>Join {invite?.community?.name}</h2>
            {invite?.community?.description && (
              <p className="join-description">{invite.community.description}</p>
            )}
            <div className="join-auth-prompt">
              <p>Sign in to join this community</p>
              <div className="join-auth-buttons">
                <Link to="/login" className="btn-primary">
                  Sign In
                </Link>
                <Link to="/signup" className="btn-secondary">
                  Create Account
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Authenticated - show join button
  return (
    <div className="join-page">
      <div className="join-container">
        <div className="join-card">
          <div className="join-community-icon">
            {invite?.community?.is_private ? (
              <Lock size={32} weight="fill" />
            ) : (
              <Users size={32} weight="fill" />
            )}
          </div>
          <h2>Join {invite?.community?.name}</h2>
          {invite?.community?.description && (
            <p className="join-description">{invite.community.description}</p>
          )}

          {invite?.community?.is_private && (
            <div className="join-private-badge">
              <Lock size={14} />
              <span>Private Community</span>
            </div>
          )}

          {error && (
            <div className="join-error">
              {error}
            </div>
          )}

          <button
            className="btn-primary join-btn"
            onClick={handleJoin}
            disabled={joining}
          >
            {joining ? 'Joining...' : 'Join Community'}
          </button>

          <p className="join-note">
            You'll be added as a member of this community
          </p>
        </div>
      </div>
    </div>
  );
};

export default JoinCommunityPage;
