import { Router } from 'express';
import { StravaService } from '../services/strava.js';
import { DataStorage } from '../utils/dataStorage.js';

const router = Router();
const stravaService = new StravaService();
const dataStorage = new DataStorage();

// Get Strava OAuth URL
router.get('/strava/url', (req, res) => {
  const authUrl = stravaService.getAuthUrl();
  res.json({ url: authUrl });
});

// Handle Strava OAuth callback
router.get('/strava/callback', async (req, res) => {
  const { code, error } = req.query;

  console.log('OAuth callback received:', { code: code ? 'present' : 'missing', error });

  if (error) {
    console.error('OAuth error from Strava:', error);
    return res.redirect(`${process.env.FRONTEND_URL}?error=${error}`);
  }

  if (!code) {
    console.error('No authorization code received');
    return res.redirect(`${process.env.FRONTEND_URL}?error=no_code`);
  }

  try {
    console.log('Exchanging code for token...');
    const tokenResponse = await stravaService.exchangeCodeForToken(code as string);
    const userId = tokenResponse.athlete.id.toString();
    console.log('Token exchange successful, userId:', userId);

    // Save user data
    const existingUser = dataStorage.getUser(userId);
    const userData = {
      userId,
      stravaAccessToken: tokenResponse.access_token,
      stravaRefreshToken: tokenResponse.refresh_token,
      tokenExpiresAt: tokenResponse.expires_at,
      totalDistance: existingUser?.totalDistance || 0,
      selectedRoute: existingUser?.selectedRoute,
      lastSyncAt: existingUser?.lastSyncAt,
    };

    dataStorage.saveUser(userData);

    // Redirect to frontend with success
    res.redirect(`${process.env.FRONTEND_URL}?auth=success&userId=${userId}`);
  } catch (error: any) {
    console.error('Error in OAuth callback:', error);
    console.error('Error details:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
    });
    const errorMessage = error.response?.data?.message || error.message || 'auth_failed';
    res.redirect(`${process.env.FRONTEND_URL}?error=${encodeURIComponent(errorMessage)}`);
  }
});

// Get current user
router.get('/me', (req, res) => {
  const userId = req.query.userId as string;
  if (!userId) {
    return res.status(400).json({ error: 'userId required' });
  }

  const user = dataStorage.getUser(userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  // Recalculate totalDistance from stored Run activities to ensure accuracy
  const activityData = dataStorage.getActivities(userId);
  if (activityData && activityData.activities) {
    const runActivities = activityData.activities.filter((a) => a.type === 'Run');
    const calculatedDistance = runActivities.reduce((sum, a) => sum + a.distance, 0) / 1000; // Convert to km
    
    // Update user's totalDistance if it's different (or if it was 0)
    if (user.totalDistance !== calculatedDistance) {
      user.totalDistance = calculatedDistance;
      dataStorage.saveUser(user);
    }
  }

  // Don't send tokens to frontend
  const { stravaAccessToken, stravaRefreshToken, ...safeUser } = user;
  res.json(safeUser);
});

export default router;

