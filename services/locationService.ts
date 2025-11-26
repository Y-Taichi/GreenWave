import { Coordinate, Route } from '../types';

const R = 6371e3; // Earth radius in meters

// Haversine formula to calculate distance between two coordinates
export const calculateDistance = (coord1: Coordinate, coord2: Coordinate): number => {
  const lat1 = (coord1.latitude * Math.PI) / 180;
  const lat2 = (coord2.latitude * Math.PI) / 180;
  const deltaLat = ((coord2.latitude - coord1.latitude) * Math.PI) / 180;
  const deltaLon = ((coord2.longitude - coord1.longitude) * Math.PI) / 180;

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
};

// Simple Moving Average for speed smoothing
export const calculateSmoothedSpeed = (speedHistory: number[]): number => {
  if (speedHistory.length === 0) return 0;
  const sum = speedHistory.reduce((a, b) => a + b, 0);
  return sum / speedHistory.length;
};

// Find the nearest route within a specific threshold (e.g., 50 meters)
export const findNearestRoute = (
  userLocation: Coordinate,
  routes: Route[],
  thresholdMeters: number = 50
): Route | null => {
  let bestRoute: Route | null = null;
  let minDistance = Infinity;

  for (const route of routes) {
    // Check distance to any signal in the route
    // In a more advanced version, we would check distance to the polyline (path)
    for (const signal of route.signals) {
      const dist = calculateDistance(userLocation, signal.location);
      if (dist < thresholdMeters && dist < minDistance) {
        minDistance = dist;
        bestRoute = route;
      }
    }
  }

  return bestRoute;
};
