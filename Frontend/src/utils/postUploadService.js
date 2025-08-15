// src/utils/postUploadService.js

import axios from 'axios';
import { CONFIG } from 'src/config-global'; // or your path

export default async function postUploadService(endpoint, formData, config = {}) {
  try {
    // Use your configured backend base URL (dev, prod, etc)
    const baseUrl = CONFIG.site.serverUrl; // e.g., 'http://localhost:4000'
    const url = endpoint.startsWith('http')
      ? endpoint
      : `${baseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

    // Get token from storage (adjust as needed for your app)
    const token = sessionStorage.getItem('jwt_access_token');

    // Build headers
    const headers = {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(config.headers || {}),
      // Don't set 'Content-Type', axios will handle for FormData!
    };

    // Make POST request with FormData and provided config
    const response = await axios.post(url, formData, {
      ...config,
      headers,
    });

    return response.data;
  } catch (error) {
    // Optional: You can throw or return false/standard error
    console.error('File upload error:', error?.response?.data || error.message);
    throw error;
  }
}
