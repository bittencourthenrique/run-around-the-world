import { useState } from 'react';
import { useStravaAuth } from '../hooks/useStravaAuth';
import { Button } from './ui/button';

export function StravaAuth() {
  const { connectStrava, loading, isAuthenticated, authError, clearAuthError } = useStravaAuth();
  const [error, setError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  // Use authError from hook if available, otherwise use local error
  const displayError = authError || error;

  if (loading) {
    return null; // Loading is handled by parent (LoadingScreen)
  }

  if (isAuthenticated) {
    return null; // Let the main app render
  }

  const handleConnect = async () => {
    setError(null);
    clearAuthError(); // Clear any previous auth errors
    setIsConnecting(true); // Show loading spinner immediately
    
    try {
      await connectStrava();
      // Note: If connectStrava succeeds, it redirects to Strava, so we won't reach here
      // But if there's an error, we'll catch it below
    } catch (err: any) {
      setIsConnecting(false); // Hide spinner on error
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
    <div className="flex items-start justify-center min-h-screen pt-20">
      <div className="text-center space-y-6 -mt-7">
        <h1 
          className="text-4xl font-bold text-white"
          style={{ 
            marginBottom: '0px',
            marginTop: '0px',
            maxWidth: '469px',
            fontSize: '40px',
            lineHeight: '50px'
          }}
        >
          How far across the world did you run?
        </h1>
        <p 
          className="text-white/80 text-sm mb-8"
          style={{ 
            fontSize: '14px',
            marginTop: '8px'
          }}
        >
          Transform your Strava distance into a real-world path.
        </p>
        <Button
          onClick={handleConnect}
          disabled={loading || isConnecting}
          size="lg"
          className="bg-white hover:bg-gray-100 text-black border-0 rounded-none px-4 text-sm disabled:opacity-50 font-bold relative"
          style={{ 
            borderWidth: 0, 
            borderColor: 'rgba(0, 0, 0, 0)', 
            borderStyle: 'none', 
            borderImage: 'none',
            borderRadius: 0,
            borderTopLeftRadius: 0,
            borderTopRightRadius: 0,
            borderBottomRightRadius: 0,
            borderBottomLeftRadius: 0,
            fontSize: '14px',
            paddingTop: '10px',
            paddingBottom: '10px',
            paddingLeft: '16px',
            paddingRight: '16px',
            marginTop: '16px',
            width: '192px'
          }}
        >
          {isConnecting ? (
            <span className="flex items-center justify-center">
              <svg
                className="animate-spin h-5 w-5 text-black mr-2"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Connecting...
            </span>
          ) : (
            'Connect with Strava'
          )}
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

