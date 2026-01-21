import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';
import './EditProfilePage.css';

const COMMUNITIES = [
  'Crypto', 'Farcaster', 'Fractal', 'FuturePARTS', 'Outdoor climbing',
  'SF Commons', 'Solarpunk', 'Vibecamp', 'Vitapets', 'Vincelator', 'Megavn', 'Ipro', 'Sori'
];

const HERE_FOR_OPTIONS = [
  { id: 'love', label: 'Love', icon: '❤️' },
  { id: 'friends', label: 'Friends', icon: '👥' },
  { id: 'collaboration', label: 'Collaboration', icon: '🤝' }
];

const EditProfilePage = () => {
  const { currentUser, isAuthenticated, updateUser, logout } = useApp();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: currentUser?.name || '',
    hereFor: currentUser?.hereFor || ['Friends'],
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
    mainPhoto: currentUser?.photos?.[0] || '',
    height: currentUser?.height || '',
    tweets: currentUser?.tweets || ['', '', ''],
    spotify: currentUser?.spotify || '',
    youtubeEmbed: currentUser?.youtube || '',
    projects: currentUser?.projects || [{ title: '', link: '', description: '' }],
    morePhotos: currentUser?.morePhotos || [],
    freeformDescription: currentUser?.freeformDescription || '',
    profileSettings: currentUser?.profileSettings || {},
    promptQuestion: currentUser?.promptQuestion || '',
  });

  const [expandedSections, setExpandedSections] = useState({
    additional: true, aboutMe: true, projects: true, morePhotos: true, freeform: true, settings: true
  });

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

  const toggleCommunity = (community) => {
    setFormData(prev => ({
      ...prev,
      communities: prev.communities.includes(community)
        ? prev.communities.filter(c => c !== community)
        : [...prev.communities, community]
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
      projects: [...prev.projects, { title: '', link: '', description: '' }]
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
      height: formData.height,
      tweets: formData.tweets,
      spotify: formData.spotify,
      youtube: formData.youtubeEmbed,
      projects: formData.projects,
      morePhotos: formData.morePhotos,
      freeformDescription: formData.freeformDescription,
      profileSettings: formData.profileSettings,
      promptQuestion: formData.promptQuestion,
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
                  {opt.icon} {opt.label}
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
              <span className="social-icon">𝕏</span>
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
              <span className="social-icon">📷</span>
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
              <span className="social-icon">📝</span>
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
              <span className="social-icon">▶️</span>
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
            <div className="communities-list">
              {COMMUNITIES.map(community => (
                <div key={community} className="community-row">
                  <span className="community-icon">{community.charAt(0)}</span>
                  <span className="community-name">{community}</span>
                  <input
                    type="checkbox"
                    checked={formData.communities.includes(community)}
                    onChange={() => toggleCommunity(community)}
                  />
                </div>
              ))}
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
          Everything below this point is optional 👇
        </div>

        {/* Additional Information */}
        <div className="form-card collapsible">
          <div className="section-header" onClick={() => toggleSection('additional')}>
            <h2 className="section-title">Additional information</h2>
            <span className={`chevron ${expandedSections.additional ? 'up' : ''}`}>▼</span>
          </div>
          {expandedSections.additional && (
            <div className="section-body">
              <div className="field-group">
                <label className="field-label">Height</label>
                <div className="height-buttons">
                  {['S', 'M', 'T', '+'].map(h => (
                    <button
                      key={h}
                      type="button"
                      className={`height-btn ${formData.height === h ? 'active' : ''}`}
                      onClick={() => setFormData(prev => ({ ...prev, height: h }))}
                    >{h}</button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* About Me */}
        <div className="form-card collapsible">
          <div className="section-header" onClick={() => toggleSection('aboutMe')}>
            <h2 className="section-title">About me</h2>
            <span className={`chevron ${expandedSections.aboutMe ? 'up' : ''}`}>▼</span>
          </div>
          {expandedSections.aboutMe && (
            <div className="section-body">
              <div className="field-group">
                <label className="field-label">A few tweets of mine</label>
                {formData.tweets.map((tweet, idx) => (
                  <input
                    key={idx}
                    type="text"
                    value={tweet}
                    onChange={(e) => handleTweetChange(idx, e.target.value)}
                    className="text-input"
                    placeholder="https://x.com/..."
                  />
                ))}
              </div>
              <div className="field-group">
                <label className="field-label">Currently listening on Spotify</label>
                <input
                  type="text"
                  name="spotify"
                  value={formData.spotify}
                  onChange={handleChange}
                  className="text-input"
                  placeholder="https://open.spotify.com/..."
                />
              </div>
              <div className="field-group">
                <label className="field-label">Embed Youtube video</label>
                <input
                  type="text"
                  name="youtubeEmbed"
                  value={formData.youtubeEmbed}
                  onChange={handleChange}
                  className="text-input"
                  placeholder="https://youtube.com/..."
                />
              </div>
            </div>
          )}
        </div>

        {/* My Projects */}
        <div className="form-card collapsible">
          <div className="section-header" onClick={() => toggleSection('projects')}>
            <h2 className="section-title">My Projects</h2>
            <span className={`chevron ${expandedSections.projects ? 'up' : ''}`}>▼</span>
          </div>
          {expandedSections.projects && (
            <div className="section-body">
              <div className="projects-grid">
                {formData.projects.map((project, idx) => (
                  <div key={idx} className="project-edit-card">
                    <div className="project-image-placeholder">
                      <span>Cuties!</span>
                    </div>
                    <div className="project-fields">
                      <label>Title</label>
                      <input
                        type="text"
                        value={project.title}
                        onChange={(e) => handleProjectChange(idx, 'title', e.target.value)}
                        className="text-input small"
                        placeholder="Project title"
                      />
                      <label>Link</label>
                      <input
                        type="text"
                        value={project.link}
                        onChange={(e) => handleProjectChange(idx, 'link', e.target.value)}
                        className="text-input small"
                        placeholder="https://..."
                      />
                      <label>Description</label>
                      <textarea
                        value={project.description}
                        onChange={(e) => handleProjectChange(idx, 'description', e.target.value)}
                        className="textarea-input"
                        placeholder="Description..."
                        rows="2"
                      />
                      <button type="button" className="delete-btn" onClick={() => deleteProject(idx)}>
                        🗑 Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <button type="button" className="add-btn" onClick={addProject}>Add one</button>
            </div>
          )}
        </div>

        {/* More Photos */}
        <div className="form-card collapsible">
          <div className="section-header" onClick={() => toggleSection('morePhotos')}>
            <h2 className="section-title">More photos</h2>
            <span className={`chevron ${expandedSections.morePhotos ? 'up' : ''}`}>▼</span>
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
                          ×
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
            <span className={`chevron ${expandedSections.freeform ? 'up' : ''}`}>▼</span>
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
            <span className={`chevron ${expandedSections.settings ? 'up' : ''}`}>▼</span>
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

        {/* Danger Zone */}
        <div className="danger-zone">
          <button type="button" className="secondary-btn">Remove from directory</button>
          <button type="button" className="danger-btn" onClick={() => { logout(); navigate('/'); }}>
            Delete account
          </button>
        </div>

        {/* Footer */}
        <footer className="edit-footer">
          <div className="footer-content">
            <div className="footer-brand">
              <span className="footer-logo">Cuties!</span>
              <span className="footer-tagline">made by @christinewi</span>
            </div>
            <div className="footer-links">
              <div className="footer-col">
                <span>Product</span>
                <a href="#">Overview</a>
                <a href="#">Customers</a>
              </div>
              <div className="footer-col">
                <span>Company</span>
                <a href="#">About</a>
                <a href="#">Jobs</a>
              </div>
              <div className="footer-col">
                <span>Support</span>
                <a href="#">FAQs</a>
                <a href="#">Contact Us</a>
              </div>
              <div className="footer-col">
                <span>Legal</span>
                <a href="#">Terms</a>
                <a href="#">Privacy</a>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default EditProfilePage;
