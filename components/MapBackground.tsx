import React, { useEffect, useRef } from 'react';
import { Route, Coordinate } from '../types';

// Declare Leaflet types globally since we are loading via CDN
declare global {
  interface Window {
    L: any;
  }
}

interface Props {
  userLocation: Coordinate | null;
  routes: Route[];
  activeRouteId?: string;
  isRecording?: boolean;
}

export const MapBackground: React.FC<Props> = ({ userLocation, routes, activeRouteId, isRecording }) => {
  const mapRef = useRef<any>(null);
  const userMarkerRef = useRef<any>(null);
  const routeLayersRef = useRef<Map<string, any>>(new Map());
  const mapContainerId = 'map-container';

  // Initialize Map
  useEffect(() => {
    if (!window.L || mapRef.current) return;

    const initialLat = userLocation?.latitude || 35.6812; // Default Tokyo
    const initialLng = userLocation?.longitude || 139.7671;

    // Create Map
    const map = window.L.map(mapContainerId, {
      zoomControl: false,
      attributionControl: false,
      zoomSnap: 0.5,
    }).setView([initialLat, initialLng], 16);

    // Add Dark Mode Tile Layer (CartoDB Dark Matter)
    window.L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 20,
      subdomains: 'abcd'
    }).addTo(map);

    mapRef.current = map;

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []); // Run once

  // Update User Marker & View
  useEffect(() => {
    if (!mapRef.current || !userLocation) return;

    const { latitude, longitude } = userLocation;

    if (!userMarkerRef.current) {
      // Create custom pulsing icon for user
      const userIcon = window.L.divIcon({
        className: 'user-marker',
        html: `<div class="w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-[0_0_15px_rgba(59,130,246,0.5)] relative">
                 <div class="absolute inset-0 bg-blue-500 rounded-full animate-ping opacity-75"></div>
               </div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8]
      });

      userMarkerRef.current = window.L.marker([latitude, longitude], { icon: userIcon }).addTo(mapRef.current);
    } else {
      userMarkerRef.current.setLatLng([latitude, longitude]);
    }

    // If navigating or recording, follow the user closely
    if (activeRouteId || isRecording) {
        mapRef.current.panTo([latitude, longitude], { animate: true, duration: 1 });
    }
  }, [userLocation, activeRouteId, isRecording]);

  // Render Routes
  useEffect(() => {
    if (!mapRef.current) return;

    // Clear existing layers not in new routes list
    routeLayersRef.current.forEach((layer, id) => {
       if (!routes.find(r => r.id === id)) {
           mapRef.current.removeLayer(layer);
           routeLayersRef.current.delete(id);
       }
    });

    routes.forEach(route => {
      const isActive = route.id === activeRouteId;
      
      // 1. Draw Polyline for path
      const pathCoords = route.path?.length 
        ? route.path.map(c => [c.latitude, c.longitude]) 
        : route.signals.map(s => [s.location.latitude, s.location.longitude]);

      if (pathCoords.length > 1) {
          let polyline = routeLayersRef.current.get(`poly-${route.id}`);
          if (!polyline) {
              polyline = window.L.polyline(pathCoords, {
                  color: isActive ? '#3B82F6' : '#4B5563',
                  weight: isActive ? 6 : 4,
                  opacity: isActive ? 0.9 : 0.4,
                  smoothFactor: 1
              }).addTo(mapRef.current);
              routeLayersRef.current.set(`poly-${route.id}`, polyline);
          } else {
              polyline.setStyle({
                  color: isActive ? '#3B82F6' : '#4B5563',
                  weight: isActive ? 6 : 4,
                  opacity: isActive ? 0.9 : 0.4
              });
          }
      }

      // 2. Draw Signals
      route.signals.forEach(signal => {
        const signalKey = `sig-${signal.id}`;
        let marker = routeLayersRef.current.get(signalKey);
        
        if (!marker) {
            const signalIcon = window.L.divIcon({
                className: 'signal-icon',
                html: `<div class="w-3 h-3 rounded-full ${isActive ? 'bg-green-400' : 'bg-gray-500'} border border-black"></div>`,
                iconSize: [12, 12],
                iconAnchor: [6, 6]
            });
            
            marker = window.L.marker([signal.location.latitude, signal.location.longitude], { icon: signalIcon }).addTo(mapRef.current);
            routeLayersRef.current.set(signalKey, marker);
        }
      });
    });

  }, [routes, activeRouteId]);

  return <div id="map-container" />;
};
