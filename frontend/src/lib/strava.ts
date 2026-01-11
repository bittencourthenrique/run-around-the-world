import axios from 'axios';

const API_BASE = '/api';

// Configure axios to handle errors gracefully
axios.defaults.timeout = 15000; // 15 second timeout

// Add response interceptor for better error handling
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.code === 'ECONNREFUSED' || error.message.includes('Network Error')) {
      console.error('Backend server is not running. Please start the backend server.');
    } else if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      console.error('Request timed out. Backend server may not be responding.');
    }
    return Promise.reject(error);
  }
);

export const stravaApi = {
  getAuthUrl: async () => {
    const response = await axios.get(`${API_BASE}/auth/strava/url`);
    return response.data.url;
  },

  getMe: async (userId: string) => {
    const response = await axios.get(`${API_BASE}/auth/me`, {
      params: { userId },
    });
    return response.data;
  },

  syncActivities: async (userId: string) => {
    const response = await axios.post(`${API_BASE}/activities/sync`, {
      userId,
    });
    return response.data;
  },

  getActivities: async (userId: string) => {
    const response = await axios.get(`${API_BASE}/activities`, {
      params: { userId },
    });
    return response.data;
  },

  searchCities: async (query: string, signal?: AbortSignal) => {
    const response = await axios.get(`${API_BASE}/cities/search`, {
      params: { q: query },
      signal,
    });
    return response.data;
  },

  getCitySuggestions: async (startCity: string, distance?: number) => {
    const response = await axios.get(`${API_BASE}/cities/suggestions`, {
      params: { startCity, distance },
    });
    return response.data;
  },

  getRoutes: async (startCity: string, totalDistance: number) => {
    const response = await axios.get(`${API_BASE}/cities/routes`, {
      params: { startCity, totalDistance },
    });
    return response.data;
  },

  getProgress: async (userId: string) => {
    const response = await axios.get(`${API_BASE}/journey/progress`, {
      params: { userId },
    });
    return response.data;
  },
};

