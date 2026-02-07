import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { getUserPrivacySetting, updateUserPrivacySetting } from '../lib/supabase';
import { Gear, Globe, Envelope, UsersThree, Check } from '@phosphor-icons/react';
import './SettingsPage.css';

const SettingsPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated, currentUser, loading } = useApp();
  const [privacySetting, setPrivacySetting] = useState('public');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(true);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate('/login');
    }
  }, [loading, isAuthenticated, navigate]);

  // Load current privacy setting
  useEffect(() => {
    const loadPrivacySetting = async () => {
      if (!currentUser) return;

      setLoadingSettings(true);
      try {
        const setting = await getUserPrivacySetting(currentUser.id);
        setPrivacySetting(setting || 'public');
      } catch (error) {
        console.error('Error loading privacy setting:', error);
      }
      setLoadingSettings(false);
    };

    if (currentUser) {
      loadPrivacySetting();
    }
  }, [currentUser]);

  const handlePrivacyChange = async (newSetting) => {
    if (newSetting === privacySetting) return;

    setSaving(true);
    setSaved(false);

    try {
      const success = await updateUserPrivacySetting(currentUser.id, newSetting);
      if (success) {
        setPrivacySetting(newSetting);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch (error) {
      console.error('Error updating privacy setting:', error);
    }

    setSaving(false);
  };

  if (loading || loadingSettings) {
    return (
      <div className="settings-page">
        <div className="settings-container">
          <p className="loading-text">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="settings-page">
      <div className="settings-container">
        <div className="settings-header">
          <h1><Gear size={24} weight="duotone" /> Settings</h1>
        </div>

        <div className="settings-section">
          <h2>Privacy</h2>
          <p className="section-description">
            Control who can discover your profile on Cuties
          </p>

          <div className="privacy-options">
            <button
              className={`privacy-option ${privacySetting === 'public' ? 'selected' : ''}`}
              onClick={() => handlePrivacyChange('public')}
              disabled={saving}
            >
              <div className="privacy-option-icon">
                <Globe size={24} weight="duotone" />
              </div>
              <div className="privacy-option-content">
                <span className="privacy-option-title">Public</span>
                <span className="privacy-option-desc">
                  Anyone can find and view your profile in the directory
                </span>
              </div>
              {privacySetting === 'public' && (
                <Check size={20} weight="bold" className="privacy-check" />
              )}
            </button>

            <button
              className={`privacy-option ${privacySetting === 'email_only' ? 'selected' : ''}`}
              onClick={() => handlePrivacyChange('email_only')}
              disabled={saving}
            >
              <div className="privacy-option-icon">
                <Envelope size={24} weight="duotone" />
              </div>
              <div className="privacy-option-content">
                <span className="privacy-option-title">Discoverable by email</span>
                <span className="privacy-option-desc">
                  Only people who know your email address can find you
                </span>
              </div>
              {privacySetting === 'email_only' && (
                <Check size={20} weight="bold" className="privacy-check" />
              )}
            </button>

            <button
              className={`privacy-option ${privacySetting === 'communities_only' ? 'selected' : ''}`}
              onClick={() => handlePrivacyChange('communities_only')}
              disabled={saving}
            >
              <div className="privacy-option-icon">
                <UsersThree size={24} weight="duotone" />
              </div>
              <div className="privacy-option-content">
                <span className="privacy-option-title">Communities only</span>
                <span className="privacy-option-desc">
                  Only visible to members of your communities
                </span>
              </div>
              {privacySetting === 'communities_only' && (
                <Check size={20} weight="bold" className="privacy-check" />
              )}
            </button>
          </div>

          {saving && (
            <p className="save-status saving">Saving...</p>
          )}
          {saved && (
            <p className="save-status saved">Settings saved</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
