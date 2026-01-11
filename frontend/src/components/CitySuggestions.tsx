import { useState, useEffect } from 'react';
import { stravaApi } from '../lib/strava';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import type { City, CitySuggestion } from '../types';

interface CitySuggestionsProps {
  startCity: City;
  totalDistance: number;
  onSelect: (city: City) => void;
}

export function CitySuggestions({ startCity, totalDistance, onSelect }: CitySuggestionsProps) {
  const [suggestions, setSuggestions] = useState<CitySuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    loadSuggestions();
  }, [startCity, totalDistance]);

  const loadSuggestions = async () => {
    setLoading(true);
    try {
      // Use a more generous multiplier - show cities up to 3x the distance
      // This ensures users see options even if they're close to a city
      const maxDistance = Math.max(totalDistance * 3, 1000); // At least 1000km
      const data = await stravaApi.getCitySuggestions(startCity.name, maxDistance);
      setSuggestions(data.suggestions || []);
    } catch (error) {
      console.error('Error loading suggestions:', error);
    } finally {
      setLoading(false);
    }
  };

  const displayedSuggestions = showAll ? suggestions : suggestions.slice(0, 10);

  if (loading) {
    return <div className="text-gray-400">Loading suggestions...</div>;
  }

  if (suggestions.length === 0) {
    return (
      <div className="text-gray-400">
        No cities found within your distance range. Try increasing your total distance!
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Destination Cities</CardTitle>
        <p className="text-sm text-gray-400">
          Cities you could reach with your current distance ({totalDistance.toFixed(1)} km)
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {displayedSuggestions.map((city, index) => (
            <button
              key={index}
              onClick={() => onSelect(city)}
              className="w-full text-left p-4 rounded-lg border border-gray-800 hover:border-orange-600 hover:bg-gray-800 transition-colors"
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-medium text-white">{city.name}</div>
                  {(city.state || city.country) && (
                    <div className="text-sm text-gray-400">
                      {[city.state, city.country].filter(Boolean).join(', ')}
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-orange-600 font-semibold">
                    {city.distance.toFixed(1)} km
                  </div>
                  <div className="text-xs text-gray-400">
                    {((city.distance / totalDistance) * 100).toFixed(0)}% of your distance
                  </div>
                </div>
              </div>
            </button>
          ))}
          {suggestions.length > 10 && !showAll && (
            <Button
              variant="outline"
              onClick={() => setShowAll(true)}
              className="w-full mt-4"
            >
              Show All ({suggestions.length} cities)
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

