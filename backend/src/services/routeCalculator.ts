import type { City, Route } from '../types/index.js';

export class RouteCalculator {
  // Calculate great-circle distance between two points (Haversine formula)
  // Returns distance in kilometers
  calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(lat2 - lat1);
    const dLng = this.toRad(lng2 - lng1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  // Generate a polyline between two cities (straight line, interpolated)
  // Returns array of [lat, lng] points
  generatePolyline(startCity: City, endCity: City, stepKm: number = 10): [number, number][] {
    const totalDistance = this.calculateDistance(
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

  // Create a route between two cities
  createRoute(startCity: City, endCity: City): Route {
    const totalDistance = this.calculateDistance(
      startCity.lat,
      startCity.lng,
      endCity.lat,
      endCity.lng
    );
    const polyline = this.generatePolyline(startCity, endCity);

    return {
      startCity,
      endCity,
      polyline,
      totalDistance,
    };
  }

  // Find cities within a certain distance from a starting point
  findCitiesWithinDistance(
    startCity: City,
    cities: City[],
    maxDistance: number
  ): Array<City & { distance: number }> {
    return cities
      .map((city) => ({
        ...city,
        distance: this.calculateDistance(
          startCity.lat,
          startCity.lng,
          city.lat,
          city.lng
        ),
      }))
      .filter((city) => city.distance <= maxDistance && city.distance > 0)
      .sort((a, b) => a.distance - b.distance);
  }

  // Select diverse routes (different directions/distances) from available cities
  selectDiverseRoutes(
    startCity: City,
    cities: Array<City & { distance: number }>,
    count: number
  ): Array<City & { distance: number }> {
    if (cities.length === 0) return [];
    if (cities.length <= count) return cities;

    type CityWithBearing = City & { distance: number; bearing: number; originalIndex: number };
    const selected: CityWithBearing[] = [];
    const used = new Set<number>();

    // Calculate bearing (direction) for each city
    const citiesWithBearing: CityWithBearing[] = cities.map((city, idx) => ({
      ...city,
      bearing: this.calculateBearing(
        startCity.lat,
        startCity.lng,
        city.lat,
        city.lng
      ),
      originalIndex: idx,
    }));

    // First, select cities at different distance ranges
    const distanceRanges = [
      { min: 0, max: 0.2 }, // 0-20% of max distance
      { min: 0.2, max: 0.4 }, // 20-40%
      { min: 0.4, max: 0.6 }, // 40-60%
      { min: 0.6, max: 0.8 }, // 60-80%
      { min: 0.8, max: 1.0 }, // 80-100%
    ];

    const maxDist = Math.max(...cities.map((c) => c.distance));

    for (const range of distanceRanges.slice(0, count)) {
      const candidates = citiesWithBearing
        .filter(
          (city) =>
            !used.has(city.originalIndex) &&
            city.distance >= range.min * maxDist &&
            city.distance <= range.max * maxDist
        )
        .sort((a, b) => a.distance - b.distance);

      if (candidates.length > 0) {
        const selectedCity = candidates[0];
        selected.push(selectedCity);
        used.add(selectedCity.originalIndex);
      }
    }

    // If we don't have enough, fill with remaining cities sorted by bearing diversity
    while (selected.length < count && selected.length < cities.length) {
      const remaining = citiesWithBearing.filter(
        (city) => !used.has(city.originalIndex)
      );

      if (remaining.length === 0) break;

      // Find city with most different bearing from already selected
      let bestCity = remaining[0];
      let maxBearingDiff = 0;

      for (const candidate of remaining) {
        const minBearingDiff = selected.length > 0
          ? Math.min(
              ...selected.map((s) => {
                const diff = Math.abs(candidate.bearing - s.bearing);
                return Math.min(diff, 360 - diff); // Handle wrap-around
              })
            )
          : 180;

        if (minBearingDiff > maxBearingDiff) {
          maxBearingDiff = minBearingDiff;
          bestCity = candidate;
        }
      }

      selected.push(bestCity);
      used.add(bestCity.originalIndex);
    }

    // Remove bearing and originalIndex before returning
    return selected.slice(0, count).map(({ bearing, originalIndex, ...city }) => city);
  }

  // Calculate bearing (direction) from point A to point B in degrees
  private calculateBearing(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
  ): number {
    const dLng = this.toRad(lng2 - lng1);
    const lat1Rad = this.toRad(lat1);
    const lat2Rad = this.toRad(lat2);

    const y = Math.sin(dLng) * Math.cos(lat2Rad);
    const x =
      Math.cos(lat1Rad) * Math.sin(lat2Rad) -
      Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLng);

    const bearing = Math.atan2(y, x);
    return ((bearing * 180) / Math.PI + 360) % 360; // Convert to degrees and normalize
  }
}

