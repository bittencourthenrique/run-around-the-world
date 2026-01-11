import { useState } from 'react';
import { useStravaAuth } from '../hooks/useStravaAuth';
import { Button } from './ui/button';

export function StravaAuth() {
  const { connectStrava, loading, isAuthenticated, authError, clearAuthError } = useStravaAuth();
  const [error, setError] = useState<string | null>(null);

  // Use authError from hook if available, otherwise use local error
  const displayError = authError || error;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  if (isAuthenticated) {
    return null; // Let the main app render
  }

  const handleConnect = async () => {
    setError(null);
    clearAuthError(); // Clear any previous auth errors
    try {
      await connectStrava();
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.message || 'Failed to connect to Strava';
      if (errorMsg.includes('ECONNREFUSED') || errorMsg.includes('Network Error')) {
        setError('Backend server is not running. Please start the backend server on port 3001.');
      } else if (errorMsg.includes('timeout') || err.code === 'ECONNABORTED') {
        setError('Request timed out. Please make sure the backend server is running on port 3001 and try again.');
      } else {
        setError(errorMsg);
      }
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-black">
      <div className="text-center space-y-6 p-8">
        <h1 className="text-4xl font-bold text-white mb-2">
          Strava Journey
        </h1>
        <p className="text-gray-400 text-lg mb-8">
          Transform your running data into a visual geographic journey
        </p>
        <Button
          onClick={handleConnect}
          disabled={loading}
          size="lg"
          className="bg-orange-600 hover:bg-orange-700 text-white px-8 py-6 text-lg disabled:opacity-50"
        >
          {loading ? 'Connecting...' : 'Connect with Strava'}
        </Button>
        {displayError && (
          <div className="mt-4 p-4 bg-red-900/20 border border-red-800 rounded-lg text-red-400 text-sm max-w-md mx-auto">
            {displayError}
            <button
              onClick={() => {
                setError(null);
                clearAuthError();
              }}
              className="mt-2 text-red-300 hover:text-red-200 underline text-xs"
            >
              Dismiss
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

