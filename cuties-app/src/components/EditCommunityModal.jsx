import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Camera, Trash, WarningCircle } from '@phosphor-icons/react';
import { uploadCommunityPhoto, updateCommunity, deleteCommunity } from '../lib/supabase';
import './EditCommunityModal.css';

const EditCommunityModal = ({ isOpen, onClose, community, onUpdate }) => {
  const navigate = useNavigate();
  const [photo, setPhoto] = useState(community?.photo || null);
  const [photoFile, setPhotoFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const fileInputRef = useRef(null);

  if (!isOpen || !community) return null;

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      // Preview the image
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhoto(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');

    try {
      let photoUrl = community.photo;

      // Upload new photo if selected
      if (photoFile) {
        photoUrl = await uploadCommunityPhoto(photoFile, community.id);
        if (!photoUrl) {
          setError('Failed to upload photo. Please try again.');
          setSaving(false);
          return;
        }
      }

      // Update community
      const { data, error: updateError } = await updateCommunity(community.id, {
        photo: photoUrl,
      });

      if (updateError) {
        setError('Failed to update community. Please try again.');
        setSaving(false);
        return;
      }

      // Notify parent of update
      if (onUpdate) {
        onUpdate({ ...community, photo: photoUrl });
      }

      onClose();
    } catch (err) {
      console.error('Error saving community:', err);
      setError('An unexpected error occurred.');
    }

    setSaving(false);
  };

  const handleDelete = async () => {
    setDeleting(true);
    setError('');

    try {
      const { error: deleteError } = await deleteCommunity(community.id);

      if (deleteError) {
        setError('Failed to delete community. Please try again.');
        setDeleting(false);
        return;
      }

      onClose();
      navigate('/my-communities');
    } catch (err) {
      console.error('Error deleting community:', err);
      setError('An unexpected error occurred.');
      setDeleting(false);
    }
  };

  // Generate gradient class based on community name
  const gradientIndex = community.name ? (community.name.charCodeAt(0) % 6) + 1 : 1;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content edit-community-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Edit Community</h3>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="edit-community-form">
          {error && <div className="form-error">{error}</div>}

          {/* Photo Upload */}
          <div className="form-group">
            <label>Community Photo</label>
            <div className="photo-edit-area">
              <div
                className={`photo-preview-container ${!photo ? `gradient-${gradientIndex}` : ''}`}
                onClick={() => fileInputRef.current?.click()}
              >
                {photo ? (
                  <img src={photo} alt="" className="photo-preview" />
                ) : (
                  <div className="photo-placeholder-icon">
                    <Camera size={32} weight="light" />
                  </div>
                )}
                <div className="photo-overlay">
                  <Camera size={20} />
                  <span>Change</span>
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="hidden-input"
              />
              <p className="photo-hint">Click to upload a new photo</p>
            </div>
          </div>

          {/* Community Info (read-only) */}
          <div className="form-group">
            <label>Community Name</label>
            <div className="readonly-field">{community.name}</div>
          </div>

          {community.description && (
            <div className="form-group">
              <label>Description</label>
              <div className="readonly-field">{community.description}</div>
            </div>
          )}

          {/* Actions */}
          <div className="form-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={handleSave}
              disabled={saving || (!photoFile)}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>

          {/* Danger Zone */}
          <div className="danger-zone">
            <h4>Danger Zone</h4>
            {!showDeleteConfirm ? (
              <button
                type="button"
                className="delete-btn"
                onClick={() => setShowDeleteConfirm(true)}
              >
                <Trash size={16} />
                Delete Community
              </button>
            ) : (
              <div className="delete-confirm">
                <div className="delete-warning">
                  <WarningCircle size={20} />
                  <p>Are you sure? This action cannot be undone. All channels, messages, and members will be permanently deleted.</p>
                </div>
                <div className="delete-actions">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={deleting}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn-danger"
                    onClick={handleDelete}
                    disabled={deleting}
                  >
                    {deleting ? 'Deleting...' : 'Yes, Delete'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditCommunityModal;
