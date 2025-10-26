// API Configuration for production deployment
export const API_CONFIG = {
  // Production API URL (Vercel)
  // Use import.meta.env for Vite instead of process.env
  baseUrl: import.meta.env.PROD 
    ? 'https://promessisposi-io.vercel.app'
    : '',
  
  // Helper function to build API URLs
  getApiUrl: (endpoint: string) => {
    const base = API_CONFIG.baseUrl;
    return `${base}${endpoint}`;
  }
};

// Helper function for API calls with correct URL
export const apiCall = async (endpoint: string, options: RequestInit = {}) => {
  const url = API_CONFIG.getApiUrl(endpoint);
  
  const defaultOptions: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    credentials: 'include',
  };
  
  // Add admin token if available
  const adminToken = localStorage.getItem('adminToken');
  if (adminToken) {
    defaultOptions.headers = {
      ...defaultOptions.headers,
      'Authorization': `Bearer ${adminToken}`,
    };
  }
  
  return fetch(url, { ...defaultOptions, ...options });
};