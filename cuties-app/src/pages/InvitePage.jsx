import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';
import { Link, Check, Copy } from '@phosphor-icons/react';
import './InvitePage.css';

const COMMUNITIES = [
  'Tpot', 'Vibecamp', 'Fractal', 'SF Commons', 'Crypto', 'Farcaster',
  'Outdoor climbing', 'Solarpunk', 'FuturePARTS', 'Interintellect'
];

const InvitePage = () => {
  const { currentUser, isAuthenticated, loading } = useApp();
  const navigate = useNavigate();
  const [copiedLink, setCopiedLink] = useState(null);
  const [selectedCommunity, setSelectedCommunity] = useState('');

  const generateInviteLink = (community = null) => {
    const baseUrl = window.location.origin;
    const params = new URLSearchParams();
    params.set('from', currentUser?.name || 'A friend');
    if (community) {
      params.set('community', community);
    }
    return `${baseUrl}/welcome?${params.toString()}`;
  };

  const copyToClipboard = async (link, type) => {
    try {
      await navigator.clipboard.writeText(link);
      setCopiedLink(type);
      setTimeout(() => setCopiedLink(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleCopyGeneral = () => {
    const link = generateInviteLink();
    copyToClipboard(link, 'general');
  };

  const handleCopyCommunity = () => {
    if (!selectedCommunity) return;
    const link = generateInviteLink(selectedCommunity);
    copyToClipboard(link, 'community');
  };

  if (loading) {
    return (
      <div className="invite-page">
        <div className="invite-container">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    navigate('/login');
    return null;
  }

  return (
    <div className="invite-page">
      <div className="invite-container">
        <div className="invite-header">
          <h1>Invite Friends</h1>
          <p>Share cuties with your friends and grow the community!</p>
        </div>

        {/* General Invite */}
        <div className="invite-card">
          <div className="invite-card-header">
            <Link size={24} className="invite-card-icon" />
            <h2>General Invite</h2>
          </div>
          <p className="invite-card-description">
            Invite anyone to join cuties. They'll see a personalized welcome from you.
          </p>
          <div className="invite-link-preview">
            <code>{generateInviteLink()}</code>
          </div>
          <button
            className={`copy-btn ${copiedLink === 'general' ? 'copied' : ''}`}
            onClick={handleCopyGeneral}
          >
            {copiedLink === 'general' ? (
              <><Check size={18} weight="bold" /> Copied!</>
            ) : (
              <><Copy size={18} /> Copy invite link</>
            )}
          </button>
        </div>

        {/* Community Invite */}
        <div className="invite-card">
          <div className="invite-card-header">
            <Link size={24} className="invite-card-icon" />
            <h2>Community Invite</h2>
          </div>
          <p className="invite-card-description">
            Invite someone to a specific community within cuties.
          </p>

          <div className="community-selector">
            <label>Select a community</label>
            <select
              value={selectedCommunity}
              onChange={(e) => setSelectedCommunity(e.target.value)}
              className="community-select"
            >
              <option value="">Choose a community...</option>
              {COMMUNITIES.map(community => (
                <option key={community} value={community}>{community}</option>
              ))}
            </select>
          </div>

          {selectedCommunity && (
            <>
              <div className="invite-link-preview">
                <code>{generateInviteLink(selectedCommunity)}</code>
              </div>
              <button
                className={`copy-btn ${copiedLink === 'community' ? 'copied' : ''}`}
                onClick={handleCopyCommunity}
              >
                {copiedLink === 'community' ? (
                  <><Check size={18} weight="bold" /> Copied!</>
                ) : (
                  <><Copy size={18} /> Copy {selectedCommunity} invite link</>
                )}
              </button>
            </>
          )}
        </div>

        {/* How it works */}
        <div className="invite-info">
          <h3>How it works</h3>
          <ol>
            <li>Copy an invite link above</li>
            <li>Share it with a friend</li>
            <li>They'll see a personalized welcome page with your name</li>
            <li>They can sign up and join the community!</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default InvitePage;
