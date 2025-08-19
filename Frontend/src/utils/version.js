// Version utility to get app version information

// Import package.json to get version info
import packageJson from '../../package.json';

/**
 * Get application version information
 * @returns {Object} Version information object
 */
export const getVersionInfo = () => {
  // Get build time from build-time injection or environment variables
  let buildTime = 'Development';
  let buildHash = 'local';
  
  try {
    // Check if build-time variables are available
    if (typeof window !== 'undefined' && window.__BUILD_TIME__) {
      buildTime = new Date(window.__BUILD_TIME__).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } else if (import.meta.env.VITE_BUILD_TIME) {
      buildTime = new Date(import.meta.env.VITE_BUILD_TIME).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
    
    if (typeof window !== 'undefined' && window.__BUILD_HASH__) {
      buildHash = window.__BUILD_HASH__;
    } else if (import.meta.env.VITE_BUILD_HASH) {
      buildHash = import.meta.env.VITE_BUILD_HASH;
    }
  } catch (error) {
    console.warn('Build info not available:', error);
  }
    
  const environment = import.meta.env.MODE || 'development';
  
  return {
    version: packageJson.version,
    buildTime,
    buildHash: buildHash.substring(0, 7), // Short hash
    environment,
    name: 'Dream Workflow System'
  };
};

/**
 * Get version string for display
 * @returns {string} Formatted version string
 */
export const getVersionString = () => {
  const info = getVersionInfo();
  return `v${info.version}`;
};

/**
 * Get full version string with build info
 * @returns {string} Detailed version string
 */
export const getFullVersionString = () => {
  const info = getVersionInfo();
  return `v${info.version} (${info.buildHash})`;
};

/**
 * Get build information
 * @returns {string} Build information string
 */
export const getBuildInfo = () => {
  const info = getVersionInfo();
  return `${info.environment} • ${info.buildTime}`;
};

export default {
  getVersionInfo,
  getVersionString,
  getFullVersionString,
  getBuildInfo
};
