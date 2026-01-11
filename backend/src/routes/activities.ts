import { Router } from 'express';
import { StravaService } from '../services/strava.js';
import { DataStorage } from '../utils/dataStorage.js';
import type { Activity } from '../types/index.js';

const router = Router();
const stravaService = new StravaService();
const dataStorage = new DataStorage();

// Sync activities from Strava
router.post('/sync', async (req, res) => {
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'userId required' });
  }

  try {
    const user = dataStorage.getUser(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if token needs refresh
    let accessToken = user.stravaAccessToken;
    if (Date.now() / 1000 >= user.tokenExpiresAt) {
      const tokenResponse = await stravaService.refreshAccessToken(
        user.stravaRefreshToken
      );
      accessToken = tokenResponse.access_token;
      user.stravaAccessToken = tokenResponse.access_token;
      user.stravaRefreshToken = tokenResponse.refresh_token;
      user.tokenExpiresAt = tokenResponse.expires_at;
      dataStorage.saveUser(user);
    }

    // Check if we need a full sync (if user has 0 distance but has activities, they might be missing type field)
    const existingData = dataStorage.getActivities(userId);
    const existingActivities = existingData?.activities || [];
    const hasActivitiesWithoutType = existingActivities.some((a) => !a.type);
    const needsFullSync = user.totalDistance === 0 && existingActivities.length > 0;

    // Get activities - do full sync if needed to populate type fields for old activities
    const after = (needsFullSync || hasActivitiesWithoutType) 
      ? undefined  // Full sync to get all activities and populate type fields
      : (user.lastSyncAt ? Math.floor(user.lastSyncAt / 1000) : undefined);

    const stravaActivities = await stravaService.getAllActivities(
      accessToken,
      after
    );

    // Filter to only include Run activities
    const runActivities = stravaActivities.filter(
      (activity) => activity.type === 'Run'
    );

    // Convert to our Activity format
    const newActivities: Activity[] = runActivities.map((activity) => ({
      id: activity.id,
      distance: activity.distance,
      movingTime: activity.moving_time,
      averageSpeed: activity.average_speed,
      totalElevationGain: activity.total_elevation_gain,
      startDate: activity.start_date,
      type: activity.type,
    }));

    // Merge with existing activities
    const activityMap = new Map<number, Activity>();

    // If doing full sync, replace all activities with fresh data that includes type
    // Otherwise, merge existing with new
    if (needsFullSync || hasActivitiesWithoutType) {
      // Full sync: only keep Run activities with proper type fields
      newActivities.forEach((activity) => {
        activityMap.set(activity.id, activity);
      });
    } else {
      // Incremental sync: merge existing with new
    existingActivities.forEach((activity) => {
      activityMap.set(activity.id, activity);
    });
    newActivities.forEach((activity) => {
      activityMap.set(activity.id, activity);
    });
    }

    const allActivities = Array.from(activityMap.values());

    // Filter to only Run activities for calculations and storage
    // If doing full sync, we only have Run activities anyway
    // If doing incremental sync, filter out any non-Run activities
    const runActivitiesOnly = allActivities.filter((a) => a.type === 'Run');

    // Save only Run activities (to ensure data consistency)
    dataStorage.saveActivities({
      userId,
      activities: runActivitiesOnly,
    });

    // Update user's total distance - ONLY from Run activities
    const totalDistance =
      runActivitiesOnly.reduce((sum, a) => sum + a.distance, 0) / 1000; // Convert to km
    user.totalDistance = totalDistance;
    user.lastSyncAt = Date.now();
    dataStorage.saveUser(user);

    res.json({
      synced: newActivities.length,
      total: runActivitiesOnly.length,
      totalDistance,
    });
  } catch (error: any) {
    console.error('Error syncing activities:', error);
    res.status(500).json({
      error: 'Failed to sync activities',
      message: error.message,
    });
  }
});

// Get user activities
router.get('/', (req, res) => {
  const userId = req.query.userId as string;
  if (!userId) {
    return res.status(400).json({ error: 'userId required' });
  }

  const activityData = dataStorage.getActivities(userId);
  if (!activityData) {
    return res.json({ activities: [] });
  }

  res.json(activityData);
});

export default router;

