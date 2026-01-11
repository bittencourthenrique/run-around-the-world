import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import type { JourneyProgress, Route } from '../types';

interface JourneyStatsProps {
  progress: JourneyProgress | null;
  route: Route | null;
}

export function JourneyStats({ progress, route }: JourneyStatsProps) {
  if (!progress || !route) {
    return null;
  }

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const formatPace = (minPerKm: number): string => {
    const minutes = Math.floor(minPerKm);
    const seconds = Math.floor((minPerKm - minutes) * 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')} /km`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Journey Progress</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm text-gray-400 mb-1">
              <span>Progress</span>
              <span>{progress.progressPercentage.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-800 rounded-full h-2">
              <div
                className="bg-orange-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress.progressPercentage}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-gray-400">Distance Traveled</div>
              <div className="text-2xl font-bold text-white">
                {progress.distanceTraveled.toFixed(1)} km
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-400">Distance Remaining</div>
              <div className="text-2xl font-bold text-white">
                {progress.distanceRemaining.toFixed(1)} km
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-400">Total Distance</div>
              <div className="text-xl font-semibold text-white">
                {progress.stats.totalDistance.toFixed(1)} km
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-400">Total Time</div>
              <div className="text-xl font-semibold text-white">
                {formatTime(progress.stats.totalTime)}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-400">Average Pace</div>
              <div className="text-xl font-semibold text-white">
                {progress.stats.averagePace > 0
                  ? formatPace(progress.stats.averagePace)
                  : 'N/A'}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-400">Elevation Gain</div>
              <div className="text-xl font-semibold text-white">
                {progress.stats.totalElevationGain.toFixed(0)} m
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-800">
            <div className="text-sm text-gray-400">Route</div>
            <div className="text-white font-medium">
              {route.startCity.name} → {route.endCity.name}
            </div>
            <div className="text-sm text-gray-400">
              Total route distance: {route.totalDistance.toFixed(1)} km
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

