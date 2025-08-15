import React from 'react';
import { createRoot } from 'react-dom/client';
import { SessionExpiredDialog } from 'src/components/custom-dialog';
import { paths } from 'src/routes/paths';
import { STORAGE_KEY } from './constant';

// Function to show session expired dialog
export function showSessionExpiredDialog() {
  // Create a container div
  const container = document.createElement('div');
  document.body.appendChild(container);
  
  // Create root for React 18
  const root = createRoot(container);

  const handleSignIn = () => {
    sessionStorage.removeItem(STORAGE_KEY);
    window.location.replace(paths.auth.jwt.signIn);
    cleanup();
  };

  const handleClose = () => {
    // Don't allow closing without action for security
    handleSignIn();
  };

  const cleanup = () => {
    setTimeout(() => {
      root.unmount();
      document.body.removeChild(container);
    }, 100);
  };

  // Render the dialog without theme wrapper - let it inherit from document
  root.render(
    <SessionExpiredDialog
      open
      onClose={handleClose}
      onSignIn={handleSignIn}
    />
  );
}
