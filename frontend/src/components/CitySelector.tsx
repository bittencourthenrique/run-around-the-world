import { useState, useEffect, useRef } from 'react';
import { stravaApi } from '../lib/strava';
import { Input } from './ui/input';
import type { City } from '../types';

interface CitySelectorProps {
  onSelect: (city: City) => void;
  onClear?: () => void;
  label: string;
  placeholder?: string;
}

export function CitySelector({ onSelect, onClear, label, placeholder = 'Search for a city...' }: CitySelectorProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<City[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCity, setSelectedCity] = useState<City | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      setError(null);
      return;
    }

    // Don't search if query exactly matches selected city name (prevents dropdown from reappearing after selection)
    if (selectedCity && query.trim() === selectedCity.name.trim()) {
      setResults([]);
      setError(null);
      return;
    }

    // Cancel previous request if it exists
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new AbortController for this request
    abortControllerRef.current = new AbortController();
    const currentAbortController = abortControllerRef.current;

    const timeoutId = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const cities = await stravaApi.searchCities(query, currentAbortController.signal);
        
        // Check if request was aborted
        if (currentAbortController.signal.aborted) {
          return;
        }
        
        if (cities.length === 0) {
          setError('No cities found. Try adding the country name (e.g., "Porto Alegre, Brazil").');
        } else {
          setError(null);
        }
        setResults(cities);
      } catch (error: any) {
        // Ignore abort errors
        if (error.name === 'AbortError' || currentAbortController.signal.aborted) {
          return;
        }
        console.error('Error searching cities:', error);
        setError('Failed to search cities. Please try again.');
        setResults([]);
      } finally {
        if (!currentAbortController.signal.aborted) {
          setLoading(false);
        }
      }
    }, 200); // Reduced delay for faster response

    return () => {
      clearTimeout(timeoutId);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [query, selectedCity]);

  const handleSelect = (city: City) => {
    setSelectedCity(city);
    setQuery(city.name);
    setResults([]);
    onSelect(city);
  };

  const performSearch = async () => {
    if (query.length < 2) return;

    // Cancel previous request if it exists
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new AbortController for this request
    abortControllerRef.current = new AbortController();
    const currentAbortController = abortControllerRef.current;

    setLoading(true);
    setError(null);
    setSelectedCity(null); // Clear selection to allow new search

    try {
      const cities = await stravaApi.searchCities(query, currentAbortController.signal);
      
      // Check if request was aborted
      if (currentAbortController.signal.aborted) {
        return;
      }
      
      if (cities.length === 0) {
        setError('No cities found. Try adding the country name (e.g., "Porto Alegre, Brazil").');
      } else {
        setError(null);
      }
      setResults(cities);
    } catch (error: any) {
      // Ignore abort errors
      if (error.name === 'AbortError' || currentAbortController.signal.aborted) {
        return;
      }
      console.error('Error searching cities:', error);
      setError('Failed to search cities. Please try again.');
      setResults([]);
    } finally {
      if (!currentAbortController.signal.aborted) {
        setLoading(false);
      }
    }
  };

  const handleSearchClick = () => {
    performSearch();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      performSearch();
    }
  };

  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-white tracking-[0.21px]">{label}</label>
      <div className="relative">
        <button
          type="button"
          onClick={handleSearchClick}
          className="absolute left-3 top-1/2 transform -translate-y-1/2 cursor-pointer hover:opacity-80 transition-opacity"
          aria-label="Search"
        >
          <svg className="w-5 h-5 text-[#9db2d0]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </button>
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full pl-10 pr-10 bg-[#4965fa] border-0 text-white placeholder:text-white/70 focus-visible:ring-0 focus-visible:ring-offset-0 shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] h-[36px] text-sm rounded-none"
        />
        {query && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setQuery('');
              setSelectedCity(null);
              setResults([]);
              setError(null);
              onClear?.();
            }}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 cursor-pointer hover:opacity-80 transition-opacity"
            aria-label="Clear city"
          >
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
        {results.length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-[#4965fa] rounded-none max-h-60 overflow-auto">
            {results.map((city, index) => (
              <button
                key={`${city.name}-${city.lat}-${city.lng}-${index}`}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleSelect(city);
                }}
                onMouseDown={(e) => {
                  e.preventDefault(); // Prevent input blur
                }}
                className={`w-full text-left px-2 py-2 text-sm text-white transition-colors cursor-pointer ${
                  index < results.length - 1 ? 'border-b border-[#7187ff]' : ''
                }`}
                type="button"
              >
                <div className="font-semibold text-sm leading-[21px] tracking-[0.07px]">{city.name}</div>
                {city.country && (
                  <div className="text-xs text-[#c2cce9] leading-4 tracking-[0.18px]">
                    {city.country}
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
        {loading && (
          <div className="absolute right-12 top-1/2 transform -translate-y-1/2 text-white/70 text-sm pointer-events-none">Loading...</div>
        )}
        {error && !loading && results.length === 0 && query.length >= 2 && (
          <div className="absolute left-0 right-0 mt-1 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-800 z-40">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}

