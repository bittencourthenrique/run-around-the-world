import { Router } from 'express';
import { DataStorage } from '../utils/dataStorage.js';
import { RouteCalculator } from '../services/routeCalculator.js';
import { ProgressCalculator } from '../services/progressCalculator.js';

const router = Router();
const dataStorage = new DataStorage();
const routeCalculator = new RouteCalculator();
const progressCalculator = new ProgressCalculator();

// Create/update journey route
router.post('/route', async (req, res) => {
  const { userId, startCity, endCity } = req.body;

  if (!userId || !startCity || !endCity) {
    return res
      .status(400)
      .json({ error: 'userId, startCity, and endCity required' });
  }

  try {
    const user = dataStorage.getUser(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Create route
    const route = routeCalculator.createRoute(startCity, endCity);

    // Update user data
    user.selectedRoute = route;
    dataStorage.saveUser(user);

    res.json(route);
  } catch (error: any) {
    console.error('Error creating route:', error);
    res.status(500).json({
      error: 'Failed to create route',
      message: error.message,
    });
  }
});

// Get journey progress
router.get('/progress', (req, res) => {
  const { userId } = req.query;

  if (!userId || typeof userId !== 'string') {
    return res.status(400).json({ error: 'userId required' });
  }

  try {
    const user = dataStorage.getUser(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!user.selectedRoute) {
      return res.status(400).json({ error: 'No route selected' });
    }

    const activityData = dataStorage.getActivities(userId);
    const allActivities = activityData?.activities || [];

    // Filter to only Run activities (exclude activities without type - they're old unverified data)
    const runActivities = allActivities.filter((a) => a.type === 'Run');

    // Calculate progress - ONLY from Run activities
    const progress = progressCalculator.calculateProgressWithStats(
      user.selectedRoute,
      runActivities
    );

    res.json(progress);
  } catch (error: any) {
    console.error('Error getting progress:', error);
    res.status(500).json({
      error: 'Failed to get progress',
      message: error.message,
    });
  }
});

export default router;

