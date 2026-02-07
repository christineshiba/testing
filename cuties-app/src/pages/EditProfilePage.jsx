import { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';
import {
  Heart, UsersThree, Handshake, XLogo, InstagramLogo, Article, YoutubeLogo,
  CaretDown, Trash, X, ArrowDown, MagnifyingGlass, SpotifyLogo
} from '@phosphor-icons/react';
import { fetchAllCommunityNames } from '../lib/supabase';
import './EditProfilePage.css';

const HERE_FOR_OPTIONS = [
  { id: 'love', label: 'Love', Icon: Heart },
  { id: 'friends', label: 'Friends', Icon: UsersThree },
  { id: 'collaboration', label: 'Collaboration', Icon: Handshake }
];

const MONOGAMY_OPTIONS = [
  'Monogamous',
  'Polyamorous',
  'Open to mono or poly',
  'Monogamish'
];

const SEXUALITY_OPTIONS = [
  'Straight',
  'Gay',
  'Bisexual',
  'Queer',
  'Trans + Straight',
  'Trans + Lesbian/Gay',
  'Trans + Bisexual',
  'Trans + Queer',
  'Other'
];

const KIDS_OPTIONS = [
  'Wants kids',
  'No kids',
  'Unsure',
  'Has kids, wants more',
  'Has kids, no more',
  'Has kids, might want more',
  'Other'
];

const DRUGS_OPTIONS = [
  'No drugs',
  'Yes drugs',
  'ehhh/sure drugs',
  'fuck yeah drugs',
  'prefer not to answer'
];

const EditProfilePage = () => {
  const { currentUser, isAuthenticated, updateUser, logout, loading } = useApp();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: currentUser?.name || '',
    hereFor: currentUser?.hereFor || [],
    quickBio: currentUser?.quickBio || currentUser?.bio || '',
    age: currentUser?.age || '',
    gender: currentUser?.gender || 'She / Her',
    location: currentUser?.location || '',
    twitter: currentUser?.socials?.twitter || '',
    instagram: currentUser?.socials?.instagram || '',
    substack: currentUser?.socials?.substack || '',
    youtubeChannel: currentUser?.socials?.youtube || '',
    hobbies: currentUser?.interests?.join(', ') || '',
    communities: currentUser?.communities || [],
    mainPhoto: currentUser?.mainPhoto || currentUser?.photos?.[0] || '',
    heightFeet: currentUser?.heightFeet || '',
    heightInches: currentUser?.heightInches || '',
    tweets: currentUser?.tweets || ['', '', ''],
    spotify: currentUser?.spotify || '',
    youtubeEmbed: currentUser?.youtube || '',
    projects: currentUser?.projects || [{ title: '', link: '', description: '', image: '' }],
    morePhotos: currentUser?.morePhotos || [],
    freeformDescription: currentUser?.freeformDescription || '',
    profileSettings: currentUser?.profileSettings || {},
    promptQuestion: currentUser?.promptQuestion || '',
    monogamy: currentUser?.monoPoly || '',
    sexuality: currentUser?.sexuality || '',
    kids: currentUser?.kids || '',
    drugs: currentUser?.drugs || '',
  });

  const [expandedSections, setExpandedSections] = useState({
    dating: true, aboutMe: true, projects: true, morePhotos: true, freeform: true, settings: true
  });

  // Communities state
  const [allCommunities, setAllCommunities] = useState([]);
  const [communitySearch, setCommunitySearch] = useState('');
  const [showCommunityDropdown, setShowCommunityDropdown] = useState(false);
  const communityDropdownRef = useRef(null);

  // Fetch all communities on mount
  useEffect(() => {
    const loadCommunities = async () => {
      const communities = await fetchAllCommunityNames();
      setAllCommunities(communities);
    };
    loadCommunities();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (communityDropdownRef.current && !communityDropdownRef.current.contains(event.target)) {
        setShowCommunityDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter communities based on search
  const filteredCommunities = allCommunities.filter(c =>
    c.toLowerCase().includes(communitySearch.toLowerCase()) &&
    !formData.communities.includes(c)
  );

  const addCommunity = (community) => {
    setFormData(prev => ({
      ...prev,
      communities: [...prev.communities, community]
    }));
    setCommunitySearch('');
    setShowCommunityDropdown(false);
  };

  const removeCommunity = (community) => {
    setFormData(prev => ({
      ...prev,
      communities: prev.communities.filter(c => c !== community)
    }));
  };

  // Wait for session check to complete
  if (loading) {
    return (
      <div className="edit-profile-page">
        <div className="edit-container">
          <p style={{ textAlign: 'center', padding: '3rem' }}>Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !currentUser) {
    navigate('/login');
    return null;
  }

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const toggleHereFor = (option) => {
    setFormData(prev => ({
      ...prev,
      hereFor: prev.hereFor.includes(option)
        ? prev.hereFor.filter(o => o !== option)
        : [...prev.hereFor, option]
    }));
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleTweetChange = (idx, value) => {
    setFormData(prev => {
      const newTweets = [...prev.tweets];
      newTweets[idx] = value;
      return { ...prev, tweets: newTweets };
    });
  };

  const handleProjectChange = (idx, field, value) => {
    setFormData(prev => {
      const newProjects = [...prev.projects];
      newProjects[idx] = { ...newProjects[idx], [field]: value };
      return { ...prev, projects: newProjects };
    });
  };

  const addProject = () => {
    setFormData(prev => ({
      ...prev,
      projects: [...prev.projects, { title: '', link: '', description: '', image: '' }]
    }));
  };

  const deleteProject = (idx) => {
    setFormData(prev => ({
      ...prev,
      projects: prev.projects.filter((_, i) => i !== idx)
    }));
  };

  const handleMainPhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, mainPhoto: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleMorePhotoUpload = (idx, e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => {
          const newPhotos = [...prev.morePhotos];
          newPhotos[idx] = reader.result;
          return { ...prev, morePhotos: newPhotos };
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const removeMorePhoto = (idx) => {
    setFormData(prev => {
      const newPhotos = [...prev.morePhotos];
      newPhotos[idx] = null;
      return { ...prev, morePhotos: newPhotos };
    });
  };

  const handleSave = () => {
    updateUser({
      name: formData.name,
      hereFor: formData.hereFor,
      quickBio: formData.quickBio,
      bio: formData.quickBio,
      age: parseInt(formData.age) || currentUser.age,
      gender: formData.gender,
      location: formData.location,
      socials: {
        twitter: formData.twitter,
        instagram: formData.instagram,
        substack: formData.substack,
        youtube: formData.youtubeChannel,
      },
      interests: formData.hobbies.split(',').map(i => i.trim()).filter(i => i),
      communities: formData.communities,
      photos: [formData.mainPhoto].filter(p => p),
      heightFeet: parseInt(formData.heightFeet) || null,
      heightInches: parseInt(formData.heightInches) || 0,
      tweets: formData.tweets,
      spotify: formData.spotify,
      youtube: formData.youtubeEmbed,
      projects: formData.projects,
      morePhotos: formData.morePhotos,
      freeformDescription: formData.freeformDescription,
      profileSettings: formData.profileSettings,
      promptQuestion: formData.promptQuestion,
      monoPoly: formData.monogamy,
      sexuality: formData.sexuality,
      kids: formData.kids,
      drugs: formData.drugs,
    });
    navigate('/profile');
  };

  return (
    <div className="edit-profile-page">
      <div className="edit-container">
        <h1 className="page-title">Create Profile</h1>
        <p className="page-subtitle">Recommend filling out on desktop</p>

        {/* Name */}
        <div className="form-card">
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className="name-input"
            placeholder="Your name"
          />

          {/* Here for */}
          <div className="field-group">
            <label className="field-label">Here for</label>
            <div className="here-for-buttons">
              {HERE_FOR_OPTIONS.map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  className={`here-for-btn ${formData.hereFor.includes(opt.label) ? 'active' : ''} ${opt.id}`}
                  onClick={() => toggleHereFor(opt.label)}
                >
                  <opt.Icon size={16} weight={formData.hereFor.includes(opt.label) ? 'fill' : 'regular'} /> {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Bio */}
          <div className="field-group">
            <label className="field-label">Quick Bio</label>
            <input
              type="text"
              name="quickBio"
              value={formData.quickBio}
              onChange={handleChange}
              className="text-input"
              placeholder="LA webcomer"
            />
          </div>
        </div>

        {/* Basics */}
        <div className="form-card">
          <h2 className="section-title">Basics</h2>

          <div className="field-group">
            <label className="field-label">Age, Gender Identity, Location *</label>
            <p className="field-hint">If you don't see your location</p>
            <div className="row-inputs">
              <input
                type="number"
                name="age"
                value={formData.age}
                onChange={handleChange}
                className="small-input"
                placeholder="26"
                min="18"
              />
              <select
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                className="select-input"
              >
                <option value="She / Her">She / Her</option>
                <option value="He / Him">He / Him</option>
                <option value="They / Them">They / Them</option>
                <option value="Other">Other</option>
              </select>
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleChange}
                className="flex-input"
                placeholder="New York, NY, USA"
              />
            </div>
          </div>

          <div className="field-group">
            <label className="field-label">Socials</label>
            <div className="social-input-row">
              <XLogo size={18} className="social-icon" />
              <input
                type="text"
                name="twitter"
                value={formData.twitter}
                onChange={handleChange}
                className="text-input"
                placeholder="username"
              />
            </div>
            <div className="social-input-row">
              <InstagramLogo size={18} className="social-icon" />
              <input
                type="text"
                name="instagram"
                value={formData.instagram}
                onChange={handleChange}
                className="text-input"
                placeholder="username"
              />
            </div>
            <div className="social-input-row">
              <Article size={18} className="social-icon" />
              <input
                type="text"
                name="substack"
                value={formData.substack}
                onChange={handleChange}
                className="text-input"
                placeholder="substack username"
              />
            </div>
            <div className="social-input-row">
              <YoutubeLogo size={18} className="social-icon" />
              <input
                type="text"
                name="youtubeChannel"
                value={formData.youtubeChannel}
                onChange={handleChange}
                className="text-input"
                placeholder="channel name"
              />
            </div>
          </div>

          <div className="field-group">
            <label className="field-label">Hobbies and Interests*</label>
            <p className="field-hint">Provide top interests separated with commas</p>
            <input
              type="text"
              name="hobbies"
              value={formData.hobbies}
              onChange={handleChange}
              className="text-input"
              placeholder="AI, filmmaking, experience design, community building"
            />
          </div>

          {/* Communities */}
          <div className="field-group">
            <label className="field-label">Communities</label>

            {/* Selected communities as tags */}
            {formData.communities.length > 0 && (
              <div className="selected-communities">
                {formData.communities.map(community => (
                  <span key={community} className="community-tag">
                    {community}
                    <button
                      type="button"
                      onClick={() => removeCommunity(community)}
                      className="community-tag-remove"
                    >
                      <X size={14} weight="bold" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Searchable dropdown */}
            <div className="community-dropdown-container" ref={communityDropdownRef}>
              <div className="community-search-input">
                <MagnifyingGlass size={18} className="community-search-icon" />
                <input
                  type="text"
                  placeholder="Search communities to join..."
                  value={communitySearch}
                  onChange={(e) => {
                    setCommunitySearch(e.target.value);
                    setShowCommunityDropdown(true);
                  }}
                  onFocus={() => setShowCommunityDropdown(true)}
                />
              </div>

              {showCommunityDropdown && (communitySearch || filteredCommunities.length > 0) && (
                <div className="community-dropdown">
                  {filteredCommunities.length > 0 ? (
                    filteredCommunities.slice(0, 10).map(community => (
                      <button
                        key={community}
                        type="button"
                        className="community-dropdown-item"
                        onClick={() => addCommunity(community)}
                      >
                        <span className="community-icon">{community.charAt(0).toUpperCase()}</span>
                        <span>{community}</span>
                      </button>
                    ))
                  ) : communitySearch ? (
                    <div className="community-dropdown-empty">
                      No communities found matching "{communitySearch}"
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Photo */}
        <div className="form-card">
          <h2 className="section-title">Main photo*</h2>
          <p className="field-hint">Use a landscape photo for optimal cropping</p>
          <label className="main-photo-preview">
            {formData.mainPhoto ? (
              <img src={formData.mainPhoto} alt="Main" />
            ) : (
              <div className="photo-placeholder">Click to upload</div>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={handleMainPhotoUpload}
              className="file-input-hidden"
            />
          </label>
          <input
            type="text"
            name="mainPhoto"
            value={formData.mainPhoto}
            onChange={handleChange}
            className="text-input"
            placeholder="Or paste image URL"
          />
        </div>

        {/* Save Button */}
        <button type="button" className="save-button" onClick={handleSave}>Save</button>

        {/* Optional Divider */}
        <div className="optional-divider">
          Everything below this point is optional <ArrowDown size={16} />
        </div>

        {/* Dating */}
        <div className="form-card collapsible">
          <div className="section-header" onClick={() => toggleSection('dating')}>
            <h2 className="section-title">Dating</h2>
            <CaretDown size={18} className={`chevron ${expandedSections.dating ? 'up' : ''}`} />
          </div>
          {expandedSections.dating && (
            <div className="section-body">
              <div className="preferences-grid">
                {/* Monogamy */}
                <div className="preference-column">
                  {MONOGAMY_OPTIONS.map(opt => (
                    <label key={opt} className="radio-option">
                      <input
                        type="radio"
                        name="monogamy"
                        checked={formData.monogamy === opt}
                        onChange={() => setFormData(prev => ({ ...prev, monogamy: opt }))}
                      />
                      <span>{opt}</span>
                    </label>
                  ))}
                </div>

                {/* Sexuality */}
                <div className="preference-column">
                  {SEXUALITY_OPTIONS.map(opt => (
                    <label key={opt} className="radio-option">
                      <input
                        type="radio"
                        name="sexuality"
                        checked={formData.sexuality === opt}
                        onChange={() => setFormData(prev => ({ ...prev, sexuality: opt }))}
                      />
                      <span>{opt}</span>
                    </label>
                  ))}
                </div>

                {/* Kids */}
                <div className="preference-column">
                  {KIDS_OPTIONS.map(opt => (
                    <label key={opt} className="radio-option">
                      <input
                        type="radio"
                        name="kids"
                        checked={formData.kids === opt}
                        onChange={() => setFormData(prev => ({ ...prev, kids: opt }))}
                      />
                      <span>{opt}</span>
                    </label>
                  ))}
                </div>

                {/* Drugs */}
                <div className="preference-column">
                  {DRUGS_OPTIONS.map(opt => (
                    <label key={opt} className="radio-option">
                      <input
                        type="radio"
                        name="drugs"
                        checked={formData.drugs === opt}
                        onChange={() => setFormData(prev => ({ ...prev, drugs: opt }))}
                      />
                      <span>{opt}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Height */}
              <div className="field-group" style={{ marginTop: '1.5rem' }}>
                <label className="field-label">Height</label>
                <div className="height-inputs">
                  <input
                    type="number"
                    name="heightFeet"
                    value={formData.heightFeet}
                    onChange={handleChange}
                    className="height-input"
                    placeholder="5"
                    min="3"
                    max="8"
                  />
                  <span className="height-label">ft</span>
                  <input
                    type="number"
                    name="heightInches"
                    value={formData.heightInches}
                    onChange={handleChange}
                    className="height-input"
                    placeholder="6"
                    min="0"
                    max="11"
                  />
                  <span className="height-label">in</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* About Me */}
        <div className="form-card collapsible">
          <div className="section-header" onClick={() => toggleSection('aboutMe')}>
            <h2 className="section-title">About me</h2>
            <CaretDown size={18} className={`chevron ${expandedSections.aboutMe ? 'up' : ''}`} />
          </div>
          {expandedSections.aboutMe && (
            <div className="section-body">
              <div className="field-group">
                <label className="field-label">A few tweets of mine</label>
                {formData.tweets.map((tweet, idx) => (
                  <div key={idx} className="media-input-row">
                    <XLogo size={20} weight="fill" className="media-icon" />
                    <input
                      type="text"
                      value={tweet}
                      onChange={(e) => handleTweetChange(idx, e.target.value)}
                      className="text-input"
                      placeholder="Paste tweet URL"
                    />
                  </div>
                ))}
              </div>
              <div className="field-group">
                <label className="field-label">Currently listening on Spotify</label>
                <div className="media-input-row">
                  <SpotifyLogo size={20} weight="fill" className="media-icon" />
                  <input
                    type="text"
                    name="spotify"
                    value={formData.spotify}
                    onChange={handleChange}
                    className="text-input"
                    placeholder="Paste Spotify track or playlist URL"
                  />
                </div>
              </div>
              <div className="field-group">
                <label className="field-label">Embed Youtube video</label>
                <div className="media-input-row">
                  <YoutubeLogo size={20} weight="fill" className="media-icon" />
                  <input
                    type="text"
                    name="youtubeEmbed"
                    value={formData.youtubeEmbed}
                    onChange={handleChange}
                    className="text-input"
                    placeholder="Paste YouTube video URL"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* My Projects */}
        <div className="form-card collapsible">
          <div className="section-header" onClick={() => toggleSection('projects')}>
            <h2 className="section-title">My Projects</h2>
            <CaretDown size={18} className={`chevron ${expandedSections.projects ? 'up' : ''}`} />
          </div>
          {expandedSections.projects && (
            <div className="section-body">
              <div className="projects-grid-elegant">
                {formData.projects.map((project, idx) => (
                  <div key={idx} className="project-card-elegant">
                    <button type="button" className="project-card-delete" onClick={() => deleteProject(idx)}>
                      <X size={16} weight="bold" />
                    </button>
                    <label className="project-card-image">
                      {project.image ? (
                        <img src={project.image} alt={project.title || 'Project'} />
                      ) : (
                        <span className="project-image-placeholder">+ Add image</span>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              handleProjectChange(idx, 'image', reader.result);
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                        className="file-input-hidden"
                      />
                    </label>
                    <div className="project-card-content">
                      <input
                        type="text"
                        value={project.title}
                        onChange={(e) => handleProjectChange(idx, 'title', e.target.value)}
                        className="project-title-input"
                        placeholder="Project name"
                      />
                      <input
                        type="text"
                        value={project.link}
                        onChange={(e) => handleProjectChange(idx, 'link', e.target.value)}
                        className="project-link-input"
                        placeholder="projecturl.com"
                      />
                      <input
                        type="text"
                        value={project.description}
                        onChange={(e) => handleProjectChange(idx, 'description', e.target.value)}
                        className="project-desc-input"
                        placeholder="Brief description..."
                      />
                    </div>
                  </div>
                ))}
                <button type="button" className="project-card-add" onClick={addProject}>
                  <span>+</span>
                  <span>Add project</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* More Photos */}
        <div className="form-card collapsible">
          <div className="section-header" onClick={() => toggleSection('morePhotos')}>
            <h2 className="section-title">More photos</h2>
            <CaretDown size={18} className={`chevron ${expandedSections.morePhotos ? 'up' : ''}`} />
          </div>
          {expandedSections.morePhotos && (
            <div className="section-body">
              <div className="photos-grid">
                {[0, 1, 2, 3].map(idx => (
                  <div key={idx} className="photo-upload-wrapper">
                    {formData.morePhotos[idx] ? (
                      <div className="photo-preview">
                        <img src={formData.morePhotos[idx]} alt={`Photo ${idx + 1}`} />
                        <button
                          type="button"
                          className="remove-photo-btn"
                          onClick={() => removeMorePhoto(idx)}
                        >
                          <X size={16} weight="bold" />
                        </button>
                      </div>
                    ) : (
                      <label className="photo-upload-box">
                        <span>+</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleMorePhotoUpload(idx, e)}
                          className="file-input-hidden"
                        />
                      </label>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Freeform Description */}
        <div className="form-card collapsible">
          <div className="section-header" onClick={() => toggleSection('freeform')}>
            <h2 className="section-title">Freeform description</h2>
            <CaretDown size={18} className={`chevron ${expandedSections.freeform ? 'up' : ''}`} />
          </div>
          {expandedSections.freeform && (
            <div className="section-body">
              <textarea
                name="freeformDescription"
                value={formData.freeformDescription}
                onChange={handleChange}
                className="freeform-textarea"
                placeholder="Write about yourself..."
                rows="8"
              />
            </div>
          )}
        </div>

        {/* Profile Settings */}
        <div className="form-card collapsible">
          <div className="section-header" onClick={() => toggleSection('settings')}>
            <h2 className="section-title">Profile settings</h2>
            <CaretDown size={18} className={`chevron ${expandedSections.settings ? 'up' : ''}`} />
          </div>
          {expandedSections.settings && (
            <div className="section-body">
              <label className="checkbox-row">
                <input type="checkbox" />
                <span>Allow people to say that I'm interested before matching</span>
              </label>
              <label className="checkbox-row">
                <input type="checkbox" />
                <span>Let me know when someone views my profile (anonymously)</span>
              </label>
              <label className="checkbox-row">
                <input type="checkbox" />
                <span>Show my Cuties supporter badge on my profile</span>
              </label>
              <div className="field-group">
                <label className="field-label">Add a question or prompt for people to answer</label>
                <input
                  type="text"
                  name="promptQuestion"
                  value={formData.promptQuestion}
                  onChange={handleChange}
                  className="text-input"
                  placeholder="What drives you to me?"
                />
              </div>
              <p className="required-note">*Make sure you filled out all required fields</p>
            </div>
          )}
        </div>

        {/* Save Button */}
        <button type="button" className="save-button" onClick={handleSave}>Save</button>

        {/* Account Actions */}
        <div className="account-actions-row">
          <button type="button" className="flat-btn" onClick={() => { logout(); navigate('/'); }}>
            Log out
          </button>
          <button type="button" className="flat-btn">Remove from directory</button>
          <button type="button" className="flat-btn danger">
            Delete account
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditProfilePage;
