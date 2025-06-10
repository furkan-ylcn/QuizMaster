import React from 'react';
import { useToast } from '../../contexts/ToastContext';

const ToastContainer = () => {
  const { toasts, removeToast } = useToast();

  // Render all toasts and allow clicking to remove
  return (
    <div className="toast-container">
      {toasts.map((toast, index) => (
        <div 
          key={`toast-${toast.id}-${index}`} // Unique key for each toast
          className={`toast ${toast.type}`}
          onClick={() => removeToast(toast.id)}
        >
          {toast.message}
        </div>
      ))}
    </div>
  );
};

export default ToastContainer;