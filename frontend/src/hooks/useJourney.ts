import { useState, useEffect, useCallback } from 'react';
import { stravaApi } from '../lib/strava';
import type { JourneyProgress } from '../types';

export function useJourney(userId: string | null) {
  const [progress, setProgress] = useState<JourneyProgress | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProgress = useCallback(async () => {
    if (!userId) return;

    setLoading(true);
    setError(null);
    try {
      const progressData = await stravaApi.getProgress(userId);
      setProgress(progressData);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load progress');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) {
      loadProgress();
    }
  }, [userId, loadProgress]);

  const syncActivities = useCallback(async () => {
    if (!userId) return;

    setLoading(true);
    setError(null);
    try {
      await stravaApi.syncActivities(userId);
      await loadProgress();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to sync activities');
    } finally {
      setLoading(false);
    }
  }, [userId, loadProgress]);

  return {
    progress,
    loading,
    error,
    syncActivities,
    refresh: loadProgress,
  };
}

