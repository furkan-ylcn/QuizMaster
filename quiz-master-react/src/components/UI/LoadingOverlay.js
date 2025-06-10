import React from 'react';
import { useLoading } from '../../hooks/hooks';

const LoadingOverlay = () => {
  const { loading } = useLoading();

  // Render nothing if not loading
  if (!loading) return null;

  // Show loading spinner and message when loading
  return (
    <div className="loading-overlay">
      <div className="spinner"></div>
      <p>Loading...</p>
    </div>
  );
};

export default LoadingOverlay;