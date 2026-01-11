import { useState, useEffect } from 'react';
import { useStravaAuth } from './hooks/useStravaAuth';
import { StravaAuth } from './components/StravaAuth';
import { JourneySetup } from './components/JourneySetup';
import { GlobeMap } from './components/GlobeMap';
import { ErrorBoundary } from './components/ErrorBoundary';
import { RouteSidebar } from './components/RouteSidebar';
import { Button } from './components/ui/button';
import { stravaApi } from './lib/strava';
import { ProgressCalculator } from './lib/progressCalculator';
import type { Route, City, JourneyProgress, Activity } from './types';

const MIN_ROUTE_DISTANCE_KM = 300;

function App() {
  const { user, loading: authLoading, logout } = useStravaAuth();
  const [syncing, setSyncing] = useState(false);
  const [startCity, setStartCity] = useState<City | null>(null);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState<number | null>(null);
  const [selectedRouteProgress, setSelectedRouteProgress] = useState<JourneyProgress | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [journeySetupResetKey, setJourneySetupResetKey] = useState(0);

  useEffect(() => {
    // Load activities when user is available
    if (user?.userId) {
      loadActivities();
    }
  }, [user?.userId]);

  const loadActivities = async () => {
    if (!user?.userId) return;
    try {
      const data = await stravaApi.getActivities(user.userId);
      setActivities(data.activities || []);
    } catch (error) {
      console.error('Failed to load activities:', error);
    }
  };

  const handleSync = async () => {
    if (!user?.userId) return;
    setSyncing(true);
    try {
      await stravaApi.syncActivities(user.userId);
      await loadActivities();
    } finally {
      setSyncing(false);
    }
  };

  const handleStartCitySelected = (city: City) => {
    setStartCity({ lat: city.lat, lng: city.lng, name: city.name });
    setSelectedRouteIndex(null);
    setSelectedRouteProgress(null);
  };

  const handleCloseSidebar = () => {
    // Clear everything and reset map to default view
    setStartCity(null);
    setRoutes([]);
    setSelectedRouteIndex(null);
    setSelectedRouteProgress(null);
    // Reset JourneySetup component state
    setJourneySetupResetKey(prev => prev + 1);
  };

  const handleRoutesLoaded = async (loadedRoutes: Route[]) => {
    // Filter routes to only include those with distance > 300km
    const filteredRoutes = loadedRoutes.filter(route => route.totalDistance > MIN_ROUTE_DISTANCE_KM);
    
    setRoutes(filteredRoutes);
    
    // Always select a route - default to longest route
    if (filteredRoutes.length > 0) {
      // Find the longest route (highest totalDistance)
      const longestRouteIndex = filteredRoutes.reduce((maxIndex, route, index) => {
        return route.totalDistance > filteredRoutes[maxIndex].totalDistance ? index : maxIndex;
      }, 0);
      
      setSelectedRouteIndex(longestRouteIndex);
      const route = filteredRoutes[longestRouteIndex];
      
      // Wait for activities to be available, then calculate progress
      // Filter to only Run activities
      const runActivities = activities.filter((a) => a.type === 'Run');
      
      // Calculate progress for the default route
      const calculator = new ProgressCalculator();
      const progress = calculator.calculateProgressWithStats(route, runActivities);
      setSelectedRouteProgress(progress);
    } else {
      setSelectedRouteIndex(null);
      setSelectedRouteProgress(null);
    }
  };
  
  // Recalculate progress when activities change and a route is selected
  useEffect(() => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/8b4404c8-093b-4c62-bed3-4866f34fd0a2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.tsx:100',message:'Progress useEffect triggered',data:{selectedRouteIndex,hasRoute:!!(selectedRouteIndex !== null && routes[selectedRouteIndex]),routesLength:routes.length,activitiesLength:activities.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'F'})}).catch(()=>{});
    // #endregion
    
    if (selectedRouteIndex !== null && routes[selectedRouteIndex] && activities.length > 0) {
      const route = routes[selectedRouteIndex];
      const runActivities = activities.filter((a) => a.type === 'Run');
      const calculator = new ProgressCalculator();
      const progress = calculator.calculateProgressWithStats(route, runActivities);
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/8b4404c8-093b-4c62-bed3-4866f34fd0a2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.tsx:108',message:'Setting progress',data:{selectedRouteIndex,routeDistance:route.totalDistance,progressTotalTime:progress.stats.totalTime,progressAvgPace:progress.stats.averagePace,runActivitiesCount:runActivities.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'F'})}).catch(()=>{});
      // #endregion
      
      setSelectedRouteProgress(progress);
    } else if (selectedRouteIndex === null) {
      setSelectedRouteProgress(null);
    }
  }, [activities, selectedRouteIndex, routes]);

  const handleRouteClick = async (routeIndex: number) => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/8b4404c8-093b-4c62-bed3-4866f34fd0a2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.tsx:110',message:'handleRouteClick called',data:{routeIndex,routesLength:routes.length,currentSelectedRouteIndex:selectedRouteIndex,routeExists:!!routes[routeIndex],routeDistance:routes[routeIndex]?.totalDistance},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    // Always select the clicked route (no deselection)
    setSelectedRouteIndex(routeIndex);
    // Progress will be recalculated by the useEffect when selectedRouteIndex changes
  };


  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <StravaAuth />;
  }

  return (
    <div className="min-h-screen flex flex-col relative" style={{ backgroundColor: '#3756FB', color: 'white' }}>
      {/* Floating buttons in top-right */}
      <div className="absolute top-7 right-7 z-20 flex gap-5 items-center">
        <Button
          variant="outline"
          onClick={handleSync}
          disabled={syncing}
          size="sm"
          className="bg-[#f1f5f9] text-[#0f172a] hover:bg-[#e2e8f0] border-0 h-9 px-4 py-1.5 text-sm font-normal rounded-none"
        >
          {syncing ? 'Syncing...' : 'Sync Activity'}
        </Button>
        <Button 
          variant="ghost" 
          onClick={logout} 
          size="sm"
          className="border border-[#e2e8f0] bg-white/0 hover:bg-white/10 h-9 w-9 p-2 rounded-none"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </Button>
      </div>

      <div className="flex-1 relative" style={{ height: '100vh' }}>
        {/* Globe - full height */}
        <div className="absolute inset-0">
          <ErrorBoundary
            fallback={
              <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: '#3756FB' }}>
                <div className="text-white text-center p-4">
                  <div className="text-lg font-semibold mb-2">Map Loading...</div>
                  <div className="text-sm">The map is initializing. If this persists, please refresh the page.</div>
                </div>
              </div>
            }
          >
            <GlobeMap
              routes={routes}
              startCity={startCity}
              selectedRouteIndex={selectedRouteIndex}
              onRouteClick={handleRouteClick}
            />
          </ErrorBoundary>
        </div>

        {/* Search card in top-left - always visible to show searched city and results */}
        <div className="absolute top-7 left-7 z-10">
          <JourneySetup
            totalDistance={user.totalDistance}
            onStartCitySelected={handleStartCitySelected}
            onRoutesLoaded={handleRoutesLoaded}
            resetKey={journeySetupResetKey}
            filteredRoutesCount={routes.length}
          />
        </div>

        {/* Route card on right side - always show when routes exist and one is selected */}
        {selectedRouteIndex !== null && routes[selectedRouteIndex] && (
          <div className="absolute top-7 right-7 z-30">
            {/* #region agent log */}
            {(() => { fetch('http://127.0.0.1:7242/ingest/8b4404c8-093b-4c62-bed3-4866f34fd0a2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.tsx:190',message:'Rendering RouteSidebar',data:{selectedRouteIndex,routesLength:routes.length,hasRoute:!!routes[selectedRouteIndex],hasProgress:!!selectedRouteProgress},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{}); return null; })()}
            {/* #endregion */}
            <RouteSidebar
              route={routes[selectedRouteIndex]}
              progress={selectedRouteProgress}
              totalDistance={user.totalDistance}
              onClose={handleCloseSidebar}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
