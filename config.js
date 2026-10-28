// Centralized API configuration for full-stack integration
let baseUrl = typeof window !== 'undefined' 
  ? '/api' 
  : (process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000/api');

// Auto-heal URL: if it's set but missing '/api' at the end, append it automatically
if (baseUrl && !baseUrl.endsWith('/api') && !baseUrl.endsWith('/api/')) {
  baseUrl = baseUrl.replace(/\/$/, '') + '/api';
}

export const API_BASE_URL = baseUrl;



export const getHeaders = () => {
  const token = localStorage.getItem('vaugun_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
};
