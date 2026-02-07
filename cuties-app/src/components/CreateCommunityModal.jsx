import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Camera, Globe, UsersThree, Lock, ArrowRight, ArrowLeft, User, CurrencyDollar, Repeat, CreditCard } from '@phosphor-icons/react';
import { createCommunity, isCutiesAdmin } from '../lib/supabase';
import { useApp } from '../context/AppContext';
import './CreateCommunityModal.css';

const CreateCommunityModal = ({ isOpen, onClose, userId }) => {
  const navigate = useNavigate();
  const { currentUser } = useApp();
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [photo, setPhoto] = useState('');
  const [visibility, setVisibility] = useState('public'); // 'public' | 'semi-public' | 'private'
  const [isCutiesOfficial, setIsCutiesOfficial] = useState(true); // Default to Cuties for admins
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  // Pricing state
  const [hasPaidMembership, setHasPaidMembership] = useState(false);
  const [membershipType, setMembershipType] = useState('one_time'); // 'one_time' | 'subscription'
  const [membershipPrice, setMembershipPrice] = useState('');
  const [subscriptionInterval, setSubscriptionInterval] = useState('monthly'); // 'monthly' | 'yearly'

  const isAdmin = isCutiesAdmin(currentUser);

  // Pricing step only for semi-public and private communities
  const showPricingStep = visibility === 'semi-public' || visibility === 'private';
  const totalSteps = showPricingStep ? 3 : 2;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !userId) return;

    setCreating(true);
    setError('');

    // Only admins can create Cuties official communities
    const officialStatus = isAdmin ? isCutiesOfficial : false;

    // Build pricing options (only for semi-public/private with paid membership)
    const pricingOptions = (showPricingStep && hasPaidMembership) ? {
      hasPaidMembership: true,
      membershipType,
      membershipPrice: parseFloat(membershipPrice) || 0,
      subscriptionInterval: membershipType === 'subscription' ? subscriptionInterval : null,
    } : null;

    const { data, error: createError } = await createCommunity(
      name.trim(),
      description.trim(),
      visibility,
      userId,
      photo || null,
      officialStatus,
      pricingOptions
    );

    if (createError) {
      if (createError.code === '23505') {
        setError('A community with this name already exists');
      } else {
        setError(createError.message || 'Failed to create community');
      }
      setCreating(false);
      return;
    }

    // Success - navigate to the new community
    handleClose();
    navigate(`/community/${data.slug}`);
  };

  const handleClose = () => {
    setStep(1);
    setName('');
    setDescription('');
    setPhoto('');
    setVisibility('public');
    setIsCutiesOfficial(true);
    setHasPaidMembership(false);
    setMembershipType('one_time');
    setMembershipPrice('');
    setSubscriptionInterval('monthly');
    setError('');
    onClose();
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhoto(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleNextStep = () => {
    if (step === 1 && name.trim()) {
      setStep(2);
      setError('');
    } else if (step === 2) {
      if (showPricingStep) {
        setStep(3);
      }
      setError('');
    }
  };

  const handlePrevStep = () => {
    if (step === 2) {
      setStep(1);
    } else if (step === 3) {
      setStep(2);
    }
    setError('');
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content create-community-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Create a Community</h3>
          <button className="modal-close" onClick={handleClose}>
            <X size={20} />
          </button>
        </div>

        {/* Step indicator */}
        <div className="step-indicator">
          <div className={`step ${step >= 1 ? 'active' : ''}`}>
            <span className="step-number">1</span>
            <span className="step-label">Details</span>
          </div>
          <div className="step-line" />
          <div className={`step ${step >= 2 ? 'active' : ''}`}>
            <span className="step-number">2</span>
            <span className="step-label">Privacy</span>
          </div>
          {showPricingStep && (
            <>
              <div className="step-line" />
              <div className={`step ${step >= 3 ? 'active' : ''}`}>
                <span className="step-number">3</span>
                <span className="step-label">Pricing</span>
              </div>
            </>
          )}
        </div>

        <form onSubmit={handleSubmit}>
          {/* Step 1: Photo, Name, Description */}
          {step === 1 && (
            <div className="form-step">
              <div className="form-group">
                <label>Community Photo (optional)</label>
                <label className="photo-upload-area">
                  {photo ? (
                    <img src={photo} alt="Community" className="photo-preview" />
                  ) : (
                    <div className="photo-placeholder">
                      <Camera size={24} />
                      <span>Add photo</span>
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden-input"
                  />
                </label>
              </div>

              <div className="form-group">
                <label htmlFor="community-name">Community Name</label>
                <input
                  id="community-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. NYC Founders"
                  required
                  maxLength={50}
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label htmlFor="community-description">Description (optional)</label>
                <textarea
                  id="community-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What's this community about?"
                  rows={3}
                  maxLength={200}
                />
              </div>

              {error && (
                <div className="form-error">
                  {error}
                </div>
              )}

              <div className="form-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handleClose}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleNextStep}
                  disabled={!name.trim()}
                >
                  Next
                  <ArrowRight size={16} weight="bold" />
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Privacy Settings */}
          {step === 2 && (
            <div className="form-step">
              {/* Cuties vs Personal - only for admins */}
              {isAdmin && (
                <div className="form-group creator-type-options">
                  <label>Create as</label>
                  <div className="creator-type-cards">
                    <button
                      type="button"
                      className={`creator-type-card ${isCutiesOfficial ? 'selected' : ''}`}
                      onClick={() => setIsCutiesOfficial(true)}
                    >
                      <span className="cuties-icon">🍊</span>
                      <div className="creator-type-content">
                        <span className="creator-type-title">Cuties</span>
                        <span className="creator-type-desc">Official platform community</span>
                      </div>
                    </button>
                    <button
                      type="button"
                      className={`creator-type-card ${!isCutiesOfficial ? 'selected' : ''}`}
                      onClick={() => setIsCutiesOfficial(false)}
                    >
                      <User size={20} weight="duotone" />
                      <div className="creator-type-content">
                        <span className="creator-type-title">Personal</span>
                        <span className="creator-type-desc">Created by you</span>
                      </div>
                    </button>
                  </div>
                </div>
              )}

              <div className="form-group visibility-options">
                <label>Who can join this community?</label>
                <div className="visibility-cards">
                  <button
                    type="button"
                    className={`visibility-card ${visibility === 'public' ? 'selected' : ''}`}
                    onClick={() => setVisibility('public')}
                  >
                    <Globe size={24} weight="duotone" />
                    <div className="visibility-card-content">
                      <span className="visibility-card-title">Public</span>
                      <span className="visibility-card-desc">Anyone can join and see all content</span>
                    </div>
                  </button>
                  <button
                    type="button"
                    className={`visibility-card ${visibility === 'semi-public' ? 'selected' : ''}`}
                    onClick={() => setVisibility('semi-public')}
                  >
                    <UsersThree size={24} weight="duotone" />
                    <div className="visibility-card-content">
                      <span className="visibility-card-title">Semi-public</span>
                      <span className="visibility-card-desc">Discoverable, but requires approval to join</span>
                    </div>
                  </button>
                  <button
                    type="button"
                    className={`visibility-card ${visibility === 'private' ? 'selected' : ''}`}
                    onClick={() => setVisibility('private')}
                  >
                    <Lock size={24} weight="duotone" />
                    <div className="visibility-card-content">
                      <span className="visibility-card-title">Private</span>
                      <span className="visibility-card-desc">Hidden from search, invite link only</span>
                    </div>
                  </button>
                </div>
              </div>

              {error && (
                <div className="form-error">
                  {error}
                </div>
              )}

              <div className="form-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handlePrevStep}
                >
                  <ArrowLeft size={16} weight="bold" />
                  Back
                </button>
                {showPricingStep ? (
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={handleNextStep}
                  >
                    Next
                    <ArrowRight size={16} weight="bold" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={creating}
                  >
                    {creating ? 'Creating...' : 'Create Community'}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Pricing (only for semi-public and private) */}
          {step === 3 && showPricingStep && (
            <div className="form-step">
              <div className="form-group pricing-toggle">
                <label className="toggle-label">
                  <input
                    type="checkbox"
                    checked={hasPaidMembership}
                    onChange={(e) => setHasPaidMembership(e.target.checked)}
                  />
                  <span className="toggle-text">
                    <CurrencyDollar size={20} weight="duotone" />
                    Require payment to join
                  </span>
                </label>
                <span className="toggle-hint">
                  Charge members a fee for access to this community
                </span>
              </div>

              {hasPaidMembership && (
                <>
                  <div className="form-group membership-type-options">
                    <label>Payment type</label>
                    <div className="membership-type-cards">
                      <button
                        type="button"
                        className={`membership-type-card ${membershipType === 'one_time' ? 'selected' : ''}`}
                        onClick={() => setMembershipType('one_time')}
                      >
                        <CreditCard size={20} weight="duotone" />
                        <div className="membership-type-content">
                          <span className="membership-type-title">One-time</span>
                          <span className="membership-type-desc">Pay once for lifetime access</span>
                        </div>
                      </button>
                      <button
                        type="button"
                        className={`membership-type-card ${membershipType === 'subscription' ? 'selected' : ''}`}
                        onClick={() => setMembershipType('subscription')}
                      >
                        <Repeat size={20} weight="duotone" />
                        <div className="membership-type-content">
                          <span className="membership-type-title">Subscription</span>
                          <span className="membership-type-desc">Recurring payment for access</span>
                        </div>
                      </button>
                    </div>
                  </div>

                  <div className="form-group price-input-group">
                    <label htmlFor="membership-price">
                      {membershipType === 'one_time' ? 'Price' : 'Price per period'}
                    </label>
                    <div className="price-input-wrapper">
                      <span className="currency-symbol">$</span>
                      <input
                        id="membership-price"
                        type="number"
                        min="0"
                        step="0.01"
                        value={membershipPrice}
                        onChange={(e) => setMembershipPrice(e.target.value)}
                        placeholder="0.00"
                      />
                      {membershipType === 'subscription' && (
                        <select
                          value={subscriptionInterval}
                          onChange={(e) => setSubscriptionInterval(e.target.value)}
                          className="interval-select"
                        >
                          <option value="monthly">/ month</option>
                          <option value="yearly">/ year</option>
                        </select>
                      )}
                    </div>
                  </div>
                </>
              )}

              {error && (
                <div className="form-error">
                  {error}
                </div>
              )}

              <div className="form-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handlePrevStep}
                >
                  <ArrowLeft size={16} weight="bold" />
                  Back
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={creating || (hasPaidMembership && !membershipPrice)}
                >
                  {creating ? 'Creating...' : 'Create Community'}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default CreateCommunityModal;
