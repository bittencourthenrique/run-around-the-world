import { useState, useEffect } from 'react';
import { stravaApi } from '../lib/strava';
import type { UserData } from '../types';

export function useStravaAuth() {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    // Check for userId in URL params (from OAuth callback)
    const urlParams = new URLSearchParams(window.location.search);
    const userId = urlParams.get('userId');
    const authStatus = urlParams.get('auth');
    const error = urlParams.get('error');

    // Handle error from OAuth callback
    if (error) {
      let errorMessage = 'Authentication failed';
      if (error === 'no_code') {
        errorMessage = 'No authorization code received from Strava. Please try again.';
      } else if (error === 'auth_failed') {
        errorMessage = 'Failed to authenticate with Strava. Please check your credentials and try again.';
      } else {
        errorMessage = `Authentication error: ${error}`;
      }
      setAuthError(errorMessage);
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
      setLoading(false);
      return;
    }

    if (authStatus === 'success' && userId) {
      // Store userId in localStorage
      localStorage.setItem('strava_userId', userId);
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
      setAuthError(null); // Clear any previous errors
      loadUser(userId);
    } else {
      // Try to load from localStorage
      const storedUserId = localStorage.getItem('strava_userId');
      if (storedUserId) {
        loadUser(storedUserId);
      } else {
        setLoading(false);
      }
    }
  }, []);

  const loadUser = async (userId: string) => {
    try {
      const userData = await stravaApi.getMe(userId);
      setUser(userData);
    } catch (error) {
      console.error('Failed to load user:', error);
      localStorage.removeItem('strava_userId');
    } finally {
      setLoading(false);
    }
  };

  const connectStrava = async () => {
    try {
      const authUrl = await stravaApi.getAuthUrl();
      window.location.href = authUrl;
    } catch (error) {
      console.error('Failed to get auth URL:', error);
      throw error; // Re-throw so the component can handle it
    }
  };

  const logout = () => {
    localStorage.removeItem('strava_userId');
    setUser(null);
  };

  const reloadUser = async () => {
    const storedUserId = localStorage.getItem('strava_userId');
    if (storedUserId) {
      await loadUser(storedUserId);
    }
  };

  return {
    user,
    loading,
    connectStrava,
    logout,
    reloadUser,
    isAuthenticated: !!user,
    authError,
    clearAuthError: () => setAuthError(null),
  };
}

