import { paths } from 'src/routes/paths';

import packageJson from '../package.json';

// ----------------------------------------------------------------------

export const CONFIG = {
  site: {
    name: 'DREAM',
    // serverUrl: import.meta.env.VITE_SERVER_URL ?? 'http://3.15.29.232:4000',
    // serverUrl: import.meta.env.VITE_SERVER_URL ?? 'http://localhost:4000',
    // serverUrl: import.meta.env.VITE_SERVER_URL ?? 'http://localhost:4020',
    // serverUrl: import.meta.env.VITE_SERVER_URL ?? 'http://52.203.77.78:4000',
    serverUrl: import.meta.env.VITE_SERVER_URL ?? 'https://dream.uniflo.ai/api',
    assetURL: import.meta.env.VITE_ASSET_URL ?? '',
    basePath: import.meta.env.VITE_BASE_PATH ?? '',
    version: packageJson.version,
  },
  /**
   * Auth
   * @method jwt | amplify | firebase | supabase | auth0
   */
  auth: {
    method: 'jwt',
    skip: false,
    redirectPath: paths.dashboard.root,
  },
};


export const PATH_AFTER_LOGIN = paths.dashboard.root; // as '/dashboard'
