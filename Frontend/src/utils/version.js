// Version utility to get app version information

// Import package.json to get version info
import packageJson from '../../package.json';

/**
 * Get application version information
 * @returns {Object} Version information object
 */
export const getVersionInfo = () => {
  // Get build time from build-time injection or environment variables
  const buildTime = typeof __BUILD_TIME__ !== 'undefined' 
    ? new Date(__BUILD_TIME__).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    : import.meta.env.VITE_BUILD_TIME || 'Development';
    
  const buildHash = typeof __BUILD_HASH__ !== 'undefined' 
    ? __BUILD_HASH__ 
    : import.meta.env.VITE_BUILD_HASH || 'local';
    
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
