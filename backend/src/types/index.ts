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
  polyline: [number, number][]; // [lat, lng] points
  totalDistance: number; // km
}

export interface UserData {
  userId: string;
  stravaAccessToken: string;
  stravaRefreshToken: string;
  tokenExpiresAt: number;
  selectedRoute?: Route;
  totalDistance: number; // accumulated from all activities (km)
  lastSyncAt?: number; // timestamp
}

export interface Activity {
  id: number;
  distance: number; // meters
  movingTime: number; // seconds
  averageSpeed: number; // m/s
  totalElevationGain: number; // meters
  startDate: string; // ISO date
  type: string; // Activity type (e.g., "Run", "Ride", "Swim")
}

export interface ActivityData {
  userId: string;
  activities: Activity[];
}

export interface StravaTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  athlete: {
    id: number;
  };
}

export interface StravaActivity {
  id: number;
  distance: number;
  moving_time: number;
  average_speed: number;
  total_elevation_gain: number;
  start_date: string;
  type: string; // Activity type (e.g., "Run", "Ride", "Swim")
}

export interface JourneyProgress {
  currentPosition: [number, number]; // [lat, lng]
  distanceTraveled: number; // km
  distanceRemaining: number; // km
  progressPercentage: number;
  stats: {
    totalDistance: number; // km
    totalTime: number; // seconds
    averagePace: number; // min/km
    totalElevationGain: number; // meters
  };
}

