export interface City {
  name: string;
  lat: number;
  lng: number;
  country?: string;
  state?: string;
}

export interface Route {
  startCity: City;
  endCity: City;
  polyline: [number, number][];
  totalDistance: number;
}

export interface UserData {
  userId: string;
  selectedRoute?: Route;
  totalDistance: number;
  lastSyncAt?: number;
}

export interface Activity {
  id: number;
  distance: number;
  movingTime: number;
  averageSpeed: number;
  totalElevationGain: number;
  startDate: string;
  type: string; // Activity type (e.g., "Run", "Ride", "Swim")
}

export interface JourneyProgress {
  currentPosition: [number, number];
  distanceTraveled: number;
  distanceRemaining: number;
  progressPercentage: number;
  stats: {
    totalDistance: number;
    totalTime: number;
    averagePace: number;
    totalElevationGain: number;
  };
}

export interface CitySuggestion extends City {
  distance: number;
}

export interface RouteOption {
  route: Route;
  isSelected?: boolean;
}

