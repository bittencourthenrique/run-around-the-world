import type { City, Route } from '../types';

// Calculate great-circle distance between two points (Haversine formula)
// Returns distance in kilometers
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

// Generate a polyline between two cities (straight line, interpolated)
function generatePolyline(startCity: City, endCity: City, stepKm: number = 10): [number, number][] {
  const totalDistance = calculateDistance(
    startCity.lat,
    startCity.lng,
    endCity.lat,
    endCity.lng
  );

  const numPoints = Math.max(2, Math.ceil(totalDistance / stepKm));
  const polyline: [number, number][] = [];

  for (let i = 0; i <= numPoints; i++) {
    const fraction = i / numPoints;
    const lat = startCity.lat + (endCity.lat - startCity.lat) * fraction;
    const lng = startCity.lng + (endCity.lng - startCity.lng) * fraction;
    polyline.push([lat, lng]);
  }

  return polyline;
}

// Create a route between two cities (for preview)
export function createPreviewRoute(startCity: City, endCity: City): Route {
  const totalDistance = calculateDistance(
    startCity.lat,
    startCity.lng,
    endCity.lat,
    endCity.lng
  );
  const polyline = generatePolyline(startCity, endCity);

  return {
    startCity,
    endCity,
    polyline,
    totalDistance,
  };
}

