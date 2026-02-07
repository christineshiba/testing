import './Loading.css';

/**
 * Spinner - Simple rotating spinner
 * @param {string} size - 'sm' | 'md' | 'lg' (default: 'md')
 * @param {string} className - Additional CSS classes
 */
export const Spinner = ({ size = 'md', className = '' }) => {
  const sizeClass = size === 'sm' ? 'spinner-sm' : size === 'lg' ? 'spinner-lg' : '';
  return <div className={`spinner ${sizeClass} ${className}`} />;
};

/**
 * LoadingOverlay - Centered loading state for pages/sections
 * @param {string} message - Optional loading message
 */
export const LoadingOverlay = ({ message = 'Loading...' }) => (
  <div className="loading-overlay fade-in">
    <Spinner size="lg" />
    {message && <p className="loading-message">{message}</p>}
  </div>
);

/**
 * Skeleton - Placeholder for content while loading
 * @param {string} variant - 'text' | 'avatar' | 'card' | 'image'
 * @param {number} count - Number of skeleton items to render
 * @param {string} className - Additional CSS classes
 */
export const Skeleton = ({ variant = 'text', count = 1, className = '' }) => {
  const items = Array.from({ length: count }, (_, i) => i);

  const getVariantClass = () => {
    switch (variant) {
      case 'avatar': return 'skeleton skeleton-avatar';
      case 'card': return 'skeleton skeleton-card';
      case 'image': return 'skeleton skeleton-image';
      case 'text':
      default: return 'skeleton skeleton-text';
    }
  };

  return (
    <>
      {items.map((i) => (
        <div key={i} className={`${getVariantClass()} ${className}`} />
      ))}
    </>
  );
};

/**
 * SkeletonCard - Full card skeleton for directory/grid layouts
 */
export const SkeletonCard = () => (
  <div className="skeleton-card-wrapper">
    <Skeleton variant="image" className="skeleton-card-image" />
    <div className="skeleton-card-content">
      <Skeleton variant="text" className="skeleton-title" />
      <Skeleton variant="text" count={2} />
      <div className="skeleton-badges">
        <Skeleton variant="text" className="skeleton-badge" />
        <Skeleton variant="text" className="skeleton-badge" />
      </div>
    </div>
  </div>
);

/**
 * ButtonLoading - Inline button loading state
 * Use by adding 'btn-loading' class to button
 */
export const ButtonLoading = ({ children, loading, className = '', ...props }) => (
  <button className={`${className} ${loading ? 'btn-loading' : ''}`} disabled={loading} {...props}>
    {children}
  </button>
);

/**
 * PageLoading - Full page loading state
 */
export const PageLoading = ({ message }) => (
  <div className="page-loading">
    <LoadingOverlay message={message} />
  </div>
);

export default {
  Spinner,
  LoadingOverlay,
  Skeleton,
  SkeletonCard,
  ButtonLoading,
  PageLoading,
};
