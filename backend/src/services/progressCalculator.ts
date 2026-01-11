import type { Route, Activity, JourneyProgress } from '../types/index.js';

export class ProgressCalculator {
  // Calculate distance between two points on the route polyline
  private calculateSegmentDistance(
    point1: [number, number],
    point2: [number, number]
  ): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(point2[0] - point1[0]);
    const dLng = this.toRad(point2[1] - point1[1]);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(point1[0])) *
        Math.cos(this.toRad(point2[0])) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  // Calculate current position along the route based on distance traveled
  calculateProgress(
    route: Route,
    distanceTraveled: number // km
  ): JourneyProgress {
    const polyline = route.polyline;
    let remainingDistance = distanceTraveled;
    let currentIndex = 0;

    // Find which segment of the polyline we're on
    for (let i = 0; i < polyline.length - 1; i++) {
      const segmentDistance = this.calculateSegmentDistance(
        polyline[i],
        polyline[i + 1]
      );

      if (remainingDistance <= segmentDistance) {
        // We're on this segment
        currentIndex = i;
        break;
      }

      remainingDistance -= segmentDistance;
      currentIndex = i + 1;
    }

    // If we've traveled beyond the route, we're at the destination
    if (currentIndex >= polyline.length - 1) {
      return {
        currentPosition: polyline[polyline.length - 1],
        distanceTraveled: route.totalDistance,
        distanceRemaining: 0,
        progressPercentage: 100,
        stats: {
          totalDistance: distanceTraveled,
          totalTime: 0,
          averagePace: 0,
          totalElevationGain: 0,
        },
      };
    }

    // Interpolate position within the current segment
    const segmentStart = polyline[currentIndex];
    const segmentEnd = polyline[currentIndex + 1];
    const segmentDistance = this.calculateSegmentDistance(segmentStart, segmentEnd);
    const fraction = remainingDistance / segmentDistance;

    const currentLat = segmentStart[0] + (segmentEnd[0] - segmentStart[0]) * fraction;
    const currentLng = segmentStart[1] + (segmentEnd[1] - segmentStart[1]) * fraction;

    const distanceRemaining = route.totalDistance - distanceTraveled;
    const progressPercentage = Math.min(
      100,
      (distanceTraveled / route.totalDistance) * 100
    );

    return {
      currentPosition: [currentLat, currentLng],
      distanceTraveled,
      distanceRemaining: Math.max(0, distanceRemaining),
      progressPercentage,
      stats: {
        totalDistance: distanceTraveled,
        totalTime: 0,
        averagePace: 0,
        totalElevationGain: 0,
      },
    };
  }

  // Calculate aggregated stats from activities
  calculateStats(activities: Activity[]): {
    totalDistance: number; // km
    totalTime: number; // seconds
    averagePace: number; // min/km
    totalElevationGain: number; // meters
  } {
    const totalDistance = activities.reduce(
      (sum, activity) => sum + activity.distance,
      0
    ) / 1000; // Convert meters to km

    const totalTime = activities.reduce(
      (sum, activity) => sum + activity.movingTime,
      0
    );

    const averagePace = totalDistance > 0 ? totalTime / 60 / totalDistance : 0; // min/km

    const totalElevationGain = activities.reduce(
      (sum, activity) => sum + activity.totalElevationGain,
      0
    );

    return {
      totalDistance,
      totalTime,
      averagePace,
      totalElevationGain,
    };
  }

  // Calculate progress with stats
  calculateProgressWithStats(
    route: Route,
    activities: Activity[]
  ): JourneyProgress {
    const stats = this.calculateStats(activities);
    const progress = this.calculateProgress(route, stats.totalDistance);

    return {
      ...progress,
      stats,
    };
  }
}

