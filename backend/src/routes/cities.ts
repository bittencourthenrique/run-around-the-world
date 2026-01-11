import { Router } from 'express';
import { GeocodingService } from '../services/geocoding.js';
import { RouteCalculator } from '../services/routeCalculator.js';

const router = Router();
const geocodingService = new GeocodingService();
const routeCalculator = new RouteCalculator();

// Search for cities
router.get('/search', async (req, res) => {
  const { q } = req.query;

  if (!q || typeof q !== 'string') {
    return res.status(400).json({ error: 'Query parameter "q" required' });
  }

  try {
    const cities = await geocodingService.searchCity(q);
    res.json(cities);
  } catch (error: any) {
    console.error('Error searching cities:', error);
    res.status(500).json({
      error: 'Failed to search cities',
      message: error.message,
    });
  }
});

// Get exactly 4 route options based on user's total distance
router.get('/routes', async (req, res) => {
  const { startCity, totalDistance } = req.query;

  if (!startCity || typeof startCity !== 'string') {
    return res.status(400).json({ error: 'startCity parameter required' });
  }

  if (!totalDistance) {
    return res.status(400).json({ error: 'totalDistance parameter required' });
  }

  const userTotalDistance = parseFloat(totalDistance as string); // km

  try {
    // Get starting city coordinates
    const startCityData = await geocodingService.getCityCoordinates(startCity);
    if (!startCityData) {
      return res.status(404).json({ error: 'Starting city not found' });
    }

    // Get major cities
    const majorCities = geocodingService.getMajorCities();

    // Find cities within user's total distance (only routes they've already completed)
    const citiesWithinDistance = routeCalculator.findCitiesWithinDistance(
      startCityData,
      majorCities,
      userTotalDistance
    );

    // Filter out the start city itself (distance < 5km) and ensure diversity
    const filteredCities = citiesWithinDistance.filter(
      (city) => city.distance >= 5 && city.distance <= userTotalDistance
    );

    // Select 4 diverse routes
    const selectedRoutes = routeCalculator.selectDiverseRoutes(
      startCityData,
      filteredCities,
      4
    );

    // Create route objects for each destination
    const routes = selectedRoutes.map((city) => {
      const route = routeCalculator.createRoute(startCityData, city);
      return {
        ...route,
        distance: city.distance, // Include calculated distance
      };
    });

    res.json({
      startCity: startCityData,
      routes: routes,
    });
  } catch (error: any) {
    console.error('Error getting routes:', error);
    res.status(500).json({
      error: 'Failed to get routes',
      message: error.message,
    });
  }
});

export default router;

