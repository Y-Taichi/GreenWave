import React, { useState, useEffect } from 'react';
import { Route, Coordinate } from './types';
import { MapBackground } from './components/MapBackground';
import { ExplorerUI } from './components/ExplorerUI';
import { Navigator } from './components/Navigator';
import { SignalRecorder } from './components/SignalRecorder';
import { getRoutes, deleteRoute } from './services/storageService';
import { findNearestRoute } from './services/locationService';

type ViewMode = 'EXPLORE' | 'NAVIGATE' | 'CREATE_ROUTE';

const App: React.FC = () => {
  const [mode, setMode] = useState<ViewMode>('EXPLORE');
  const [routes, setRoutes] = useState<Route[]>([]);
  const [userLocation, setUserLocation] = useState<Coordinate | null>(null);
  
  // Navigation State
  const [activeRouteId, setActiveRouteId] = useState<string | undefined>(undefined);
  
  // Creation State
  const [tempRoute, setTempRoute] = useState<Route | null>(null);

  // Initialization & Geolocation
  useEffect(() => {
    const init = async () => {
        const storedRoutes = await getRoutes();
        setRoutes(storedRoutes);

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const coords = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
                setUserLocation(coords);
                
                // Context-Oriented Auto-Start
                // If we are close to a route, auto-start nav
                const nearest = findNearestRoute(coords, storedRoutes, 100); // 100m threshold
                if (nearest) {
                    console.log("Auto-detected route:", nearest.name);
                    setActiveRouteId(nearest.id);
                    setMode('NAVIGATE');
                }
            },
            (err) => console.warn("Initial location failed", err),
            { enableHighAccuracy: true }
        );
    };

    init();

    // Continuous location tracking
    const watchId = navigator.geolocation.watchPosition(
        (pos) => {
            setUserLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        },
        null,
        { enableHighAccuracy: true, maximumAge: 1000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  const handleSelectRoute = (id: string) => {
      setActiveRouteId(id);
      setMode('NAVIGATE');
  };

  const handleDeleteRoute = async (id: string) => {
      if (confirm("Delete this route?")) {
          await deleteRoute(id);
          const updated = await getRoutes();
          setRoutes(updated);
      }
  };

  const handleBackToExplorer = () => {
      setActiveRouteId(undefined);
      setMode('EXPLORE');
  };

  const handleCreateComplete = async () => {
      setTempRoute(null);
      const updated = await getRoutes();
      setRoutes(updated);
      setMode('EXPLORE');
  };

  // Determine what routes to show on map
  // If creating, show the temp route being drawn.
  // If exploring, show all.
  // If navigating, show active.
  const displayRoutes = mode === 'CREATE_ROUTE' && tempRoute 
      ? [tempRoute] 
      : mode === 'NAVIGATE' && activeRouteId 
        ? routes.filter(r => r.id === activeRouteId)
        : routes;

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-gray-900">
        
        {/* Base Layer: Full Screen Map */}
        <MapBackground 
            userLocation={userLocation}
            routes={displayRoutes}
            activeRouteId={activeRouteId}
            isRecording={mode === 'CREATE_ROUTE'}
        />

        {/* Overlay Layer: Contextual UI */}
        {mode === 'EXPLORE' && (
            <ExplorerUI 
                routes={routes}
                onStartCreate={() => setMode('CREATE_ROUTE')}
                onSelectRoute={handleSelectRoute}
                onDeleteRoute={handleDeleteRoute}
            />
        )}

        {mode === 'NAVIGATE' && activeRouteId && (
            <Navigator 
                routeId={activeRouteId}
                userLocation={userLocation}
                onBack={handleBackToExplorer}
            />
        )}

        {mode === 'CREATE_ROUTE' && (
            <SignalRecorder 
                onBack={handleCreateComplete}
                userLocation={userLocation}
                onRouteUpdated={setTempRoute}
            />
        )}
    </div>
  );
};

export default App;
