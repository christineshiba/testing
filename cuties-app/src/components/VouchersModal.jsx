import { useState } from 'react';
import { Link } from 'react-router-dom';
import './VouchersModal.css';

const VouchersModal = ({ isOpen, onClose, vouchersFor, vouchedBy, userName }) => {
  const [activeTab, setActiveTab] = useState('received');

  if (!isOpen) return null;

  const displayList = activeTab === 'received' ? vouchersFor : vouchedBy;

  return (
    <div className="vouchers-modal-overlay" onClick={onClose}>
      <div className="vouchers-modal" onClick={(e) => e.stopPropagation()}>
        <div className="vouchers-modal-header">
          <h2>Vouches</h2>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>

        <div className="vouchers-tabs">
          <button
            className={`vouchers-tab ${activeTab === 'received' ? 'active' : ''}`}
            onClick={() => setActiveTab('received')}
          >
            Vouched for {userName?.split(' ')[0] || 'them'} ({vouchersFor.length})
          </button>
          <button
            className={`vouchers-tab ${activeTab === 'given' ? 'active' : ''}`}
            onClick={() => setActiveTab('given')}
          >
            {userName?.split(' ')[0] || 'They'} vouched for ({vouchedBy.length})
          </button>
        </div>

        <div className="vouchers-list">
          {displayList.length > 0 ? (
            displayList.map((voucher) => (
              <Link
                key={voucher.id}
                to={`/user/${voucher.userId}`}
                className="voucher-item"
                onClick={onClose}
              >
                <img
                  src={voucher.photo || 'https://via.placeholder.com/40?text=?'}
                  alt={voucher.name}
                  className="voucher-avatar"
                />
                <span className="voucher-name">{voucher.name}</span>
              </Link>
            ))
          ) : (
            <p className="no-vouchers">
              {activeTab === 'received'
                ? 'No one has vouched for them yet'
                : "They haven't vouched for anyone yet"}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default VouchersModal;
