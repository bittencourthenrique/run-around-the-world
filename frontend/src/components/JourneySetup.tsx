import { useState, useEffect, useRef } from 'react';
import { stravaApi } from '../lib/strava';
import { CitySelector } from './CitySelector';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import type { City, Route } from '../types';

interface JourneySetupProps {
  totalDistance: number;
  onStartCitySelected: (city: City) => void;
  onRoutesLoaded?: (routes: Route[]) => void;
  resetKey?: number; // Key to force reset when changed
  filteredRoutesCount?: number; // Count of routes after filtering (e.g., >300km)
}

export function JourneySetup({ totalDistance, onStartCitySelected, onRoutesLoaded, resetKey, filteredRoutesCount }: JourneySetupProps) {
  const [startCity, setStartCity] = useState<City | null>(null);
  const [loading, setLoading] = useState(false);
  const [showLoadingIndicator, setShowLoadingIndicator] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [routes, setRoutes] = useState<Route[]>([]);
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Reset state when resetKey changes
  useEffect(() => {
    if (resetKey !== undefined && resetKey > 0) {
      setStartCity(null);
      setRoutes([]);
      setError(null);
      setLoading(false);
      setShowLoadingIndicator(false);
      // Clear any pending timeout
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }
    }
  }, [resetKey]);

  useEffect(() => {
    if (startCity) {
      loadRoutes();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startCity]);

  const loadRoutes = async () => {
    if (!startCity) return;

    setLoading(true);
    setError(null);
    setShowLoadingIndicator(false);

    // Clear any existing timeout
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = null;
    }

    // Set timeout to show loading indicator after 500ms
    loadingTimeoutRef.current = setTimeout(() => {
      setShowLoadingIndicator(true);
    }, 500);

    try {
      const data = await stravaApi.getRoutes(startCity.name, totalDistance);
      
      // Clear timeout if request completes before 500ms
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }
      
      if (data.routes && data.routes.length > 0) {
        setRoutes(data.routes);
        onRoutesLoaded?.(data.routes);
      } else {
        setError(`No routes found within your distance range (${totalDistance.toFixed(1)} km). Try selecting a different starting city or sync more activities.`);
      }
    } catch (err: any) {
      // Clear timeout on error
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }
      console.error('Error loading routes:', err);
      const errorMsg = err.response?.data?.error || 'Failed to load routes';
      setError(errorMsg);
      if (errorMsg.includes('not found')) {
        setError('Starting city not found. Please try a different city name.');
      }
    } finally {
      setLoading(false);
      setShowLoadingIndicator(false);
    }
  };

  const handleCitySelect = (city: City) => {
    setStartCity(city);
    onStartCitySelected(city);
  };

  const handleCityClear = () => {
    setStartCity(null);
    setRoutes([]);
    setError(null);
    // Clear any pending timeout
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = null;
    }
    setShowLoadingIndicator(false);
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="backdrop-blur-[3.25px] bg-[rgba(55,86,251,0.6)] rounded-none p-5 w-[259px]" style={{ boxSizing: 'content-box' }}>
      <h2 className="text-white text-xl font-semibold mb-6 leading-normal tracking-normal">
        How far across the world did you run?
      </h2>
      <div className="space-y-6">
        <CitySelector
          label="Search for city"
          placeholder="e.g., New York..."
          onSelect={handleCitySelect}
          onClear={handleCityClear}
        />

        {loading && showLoadingIndicator && (
          <div className="space-y-1.5">
            <p className="text-white text-[10px] leading-normal">Calculating distances...</p>
            <div className="bg-[#def1ff] h-1 rounded-[20px] relative overflow-hidden">
              <div className="absolute bg-[#4965fa] h-1 rounded-[20px] animate-progress" style={{ width: '60%' }}></div>
            </div>
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-800">
            {error}
          </div>
        )}

        {startCity && !loading && !error && (filteredRoutesCount !== undefined ? filteredRoutesCount > 0 : routes.length > 0) && (
          <div className="flex items-center gap-2">
            <div className="w-6 h-6">
              <svg className="w-full h-full" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="#E5A971" stroke="#E5A971" strokeWidth="1"/>
                <path d="M9 12l2 2 4-4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <p className="text-white text-xs font-bold leading-normal">
              {filteredRoutesCount !== undefined ? filteredRoutesCount : routes.length} route{(filteredRoutesCount !== undefined ? filteredRoutesCount : routes.length) !== 1 ? 's' : ''} found
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

