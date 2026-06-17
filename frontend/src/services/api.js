import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Attach JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ---------------- AUTH API ----------------
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getCurrentUser: () => api.get('/auth/me')
};

// ---------------- COMPLAINT API ----------------
export const complaintAPI = {
  create: (data) => api.post('/complaints', data),
  getMine: () => api.get('/complaints/my-complaints'),
  getAll: (filters) => api.get('/complaints', { params: filters }),
  getById: (id) => api.get(`/complaints/${id}`),
  getByDepartment: (department) => api.get('/complaints', { params: { department } }),
  updateStatus: (id, newStatus) => {
    // Handle both string and object inputs
    const statusData = typeof newStatus === 'string' 
      ? { status: newStatus } 
      : newStatus;
    return api.patch(`/complaints/${id}/status`, statusData);
  }
};

// ---------------- IMPROVED OSM GEOCODING ----------------
export const geocodeAPI = {
  reverseGeocode: async (lat, lng) => {
    try {
      // OpenStreetMap Nominatim API - Free, no API key required
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;

      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Citizen-Complaint-System/1.0'
        }
      });

      if (!response.data) {
        throw new Error('No geocoding data received');
      }

      const data = response.data;
      const address = data.address || {};

      // Extract locality with comprehensive fallback chain
      const locality = 
        address.suburb ||           // Urban subdivision
        address.neighbourhood ||    // Specific neighborhood
        address.quarter ||          // City quarter
        address.hamlet ||           // Small settlement
        address.village ||          // Village
        address.town ||             // Town
        address.city ||             // City
        address.municipality ||     // Municipality
        address.county ||           // County/District
        address.state_district ||   // State district
        address.state ||            // State (last resort)
        'Location captured';        // Final fallback

      // Extract city/town
      const city = 
        address.city || 
        address.town || 
        address.municipality || 
        '';

      // Extract state
      const state = address.state || '';

      // Extract country
      const country = address.country || '';

      // Build a clean, readable address
      const formattedAddress = data.display_name || 
        `${locality}${city ? ', ' + city : ''}${state ? ', ' + state : ''}`;

      return {
        formatted_address: formattedAddress,
        locality: locality,
        city: city,
        state: state,
        country: country,
        postcode: address.postcode || '',
        road: address.road || '',
        lat: lat,
        lng: lng,
        raw_address: address  // Include raw data for debugging
      };

    } catch (error) {
      console.error('Geocoding error:', error);
      
      // Return fallback with coordinates
      return {
        formatted_address: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
        locality: 'Location captured',
        city: '',
        state: '',
        country: '',
        postcode: '',
        road: '',
        lat: lat,
        lng: lng,
        error: error.message
      };
    }
  }
};

// ---------------- ADMIN API ----------------
export const adminAPI = {
  getAnalytics: () => api.get('/admin/analytics'),
  getAllComplaints: (filters) => api.get('/admin/complaints', { params: filters }),
  getDepartmentStats: () => api.get('/admin/department-stats'),
  getAreaStats: () => api.get('/admin/area-stats'),
  getUserStats: () => api.get('/admin/user-stats')
};

export default api;