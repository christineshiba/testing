import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Compass, Plus } from '@phosphor-icons/react';
import CommunitiesContent from './CommunitiesContent';
import DirectoryContent from './DirectoryContent';
import CreateCommunityModal from '../components/CreateCommunityModal';
import './ExplorePage.css';

const ExplorePage = () => {
  const { isAuthenticated, currentUser } = useApp();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'communities';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  return (
    <div className="explore-page">
      <div className="explore-header">
        <div className="explore-header-top">
          <div className="explore-header-text">
            <h1><Compass size={22} weight="duotone" className="explore-icon" /> Explore</h1>
          </div>
          {isAuthenticated && activeTab === 'communities' && (
            <button
              className="create-community-btn"
              onClick={() => setShowCreateModal(true)}
            >
              <Plus size={14} weight="bold" />
              Create community
            </button>
          )}
        </div>

        <div className="explore-tabs">
          <button
            className={`explore-tab ${activeTab === 'communities' ? 'active' : ''}`}
            onClick={() => handleTabChange('communities')}
          >
            Communities
          </button>
          <button
            className={`explore-tab ${activeTab === 'directory' ? 'active' : ''}`}
            onClick={() => handleTabChange('directory')}
          >
            Directory
          </button>
        </div>
      </div>

      <div className="explore-container">
        <div className="explore-content">
          {activeTab === 'communities' ? (
            <CommunitiesContent />
          ) : (
            <DirectoryContent />
          )}
        </div>
      </div>

      <CreateCommunityModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        userId={currentUser?.id}
      />
    </div>
  );
};

export default ExplorePage;
