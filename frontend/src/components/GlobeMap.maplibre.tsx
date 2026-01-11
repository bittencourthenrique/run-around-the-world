// BACKUP: MapLibre GL JS Implementation
// This is a backup of the working MapLibre implementation
// To rollback: Rename this file to GlobeMap.tsx and rename GlobeMap.tsx to GlobeMap.d3.tsx

import { useEffect, useRef, useState } from 'react';
import type { Route } from '../types';
import maplibregl from 'maplibre-gl';

interface GlobeMapProps {
  routes: Route[];
  startCity: { lat: number; lng: number; name: string } | null;
  selectedRouteIndex: number | null;
  onRouteClick: (routeIndex: number) => void;
}

const ROUTE_COLORS = [
  '#ff6b35', // Orange
  '#3b82f6', // Blue
  '#10b981', // Green
  '#a855f7', // Purple
  '#f59e0b', // Yellow
];

export function GlobeMap({ routes, startCity, selectedRouteIndex, onRouteClick }: GlobeMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    const initializeMap = () => {
      if (!mapContainer.current || map.current) return;

      try {
        // Use MapLibre's official globe style which supports vector tiles and globe projection
        // This is the recommended way to display a globe according to MapLibre documentation
        // See: https://maplibre.org/maplibre-gl-js/docs/
        map.current = new maplibregl.Map({
          container: mapContainer.current,
          style: 'https://demotiles.maplibre.org/globe.json', // Vector tile style that supports globe projection
          center: [-50, -15], // Default: Brazil/South America
          zoom: 2,
          pitch: 0,
          bearing: 0,
          ...({ projection: 'globe' } as any), // Enable globe projection
        } as any);

        map.current.on('load', () => {
          setMapLoaded(true);
          setError(null);
        });

        map.current.on('error', (e: any) => {
          console.error('MapLibre error:', e);
          setError('Failed to load map. Please refresh the page.');
        });

        map.current.on('style.load', () => {
          setMapLoaded(true);
        });
      } catch (err: any) {
        console.error('Error initializing map:', err);
        setError(`Failed to initialize map: ${err.message || 'Unknown error'}`);
      }
    };

    // Wait for container to have dimensions
    const checkDimensions = () => {
      if (mapContainer.current && mapContainer.current.offsetWidth > 0 && mapContainer.current.offsetHeight > 0) {
        initializeMap();
      } else {
        // Retry after a short delay
        setTimeout(checkDimensions, 100);
      }
    };

    checkDimensions();

    return () => {
      // Cleanup markers
      markersRef.current.forEach(marker => marker.remove());
      markersRef.current = [];
      
      // Cleanup map
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  // Update routes when they change
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    // Clean up old routes that no longer exist
    if (routes.length === 0 || !startCity) {
      // Remove all route layers and sources
      // Use a safe approach to find existing route layers
      const maxRoutes = 10; // Reasonable upper limit
      for (let i = 0; i < maxRoutes; i++) {
        const routeId = `route-${i}`;
        if (map.current?.getLayer(routeId)) {
          map.current.removeLayer(routeId);
        }
        if (map.current?.getSource(routeId)) {
          map.current.removeSource(routeId);
        }
      }
      return;
    }

    if (!startCity) return;

    const mapInstance = map.current;

    // Add or update route sources and layers
    routes.forEach((route, index) => {
      const routeId = `route-${index}`;
      const isSelected = selectedRouteIndex === index;
      const color = ROUTE_COLORS[index % ROUTE_COLORS.length];
      const opacity = isSelected ? 1 : 0.6;
      const lineWidth = isSelected ? 4 : 2;

      // Create GeoJSON LineString for the route arc
      // For globe view, we'll create a great circle arc
      const coordinates = createGreatCircleArc(
        [startCity.lng, startCity.lat],
        [route.endCity.lng, route.endCity.lat]
      );

      const geoJson: GeoJSON.FeatureCollection = {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties: {
              routeIndex: index,
              color,
            },
            geometry: {
              type: 'LineString',
              coordinates,
            },
          },
        ],
      };

      // Add or update source
      const source = mapInstance.getSource(routeId) as maplibregl.GeoJSONSource;
      if (source) {
        source.setData(geoJson);
      } else {
        mapInstance.addSource(routeId, {
          type: 'geojson',
          data: geoJson,
        });
      }

      // Add or update layer
      if (!mapInstance.getLayer(routeId)) {
        mapInstance.addLayer({
          id: routeId,
          type: 'line',
          source: routeId,
          layout: {
            'line-join': 'round',
            'line-cap': 'round',
          },
          paint: {
            'line-color': color,
            'line-width': lineWidth,
            'line-opacity': opacity,
            'line-dasharray': [0.4, 0.1],
          },
        });
      } else {
        // Update existing layer
        mapInstance.setPaintProperty(routeId, 'line-color', color);
        mapInstance.setPaintProperty(routeId, 'line-width', lineWidth);
        mapInstance.setPaintProperty(routeId, 'line-opacity', opacity);
      }
    });

    // Add click handler for routes
    const handleRouteClick = (e: maplibregl.MapMouseEvent) => {
      const features = mapInstance.queryRenderedFeatures(e.point, {
        layers: routes.map((_, i) => `route-${i}`),
      });

      if (features.length > 0) {
        const feature = features[0];
        const routeIndex = feature.properties?.routeIndex;
        if (typeof routeIndex === 'number') {
          onRouteClick(routeIndex);
        }
      }
    };

    mapInstance.on('click', handleRouteClick);

    return () => {
      mapInstance.off('click', handleRouteClick);
    };
  }, [routes, startCity, selectedRouteIndex, mapLoaded, onRouteClick]);

  // Update markers for cities
  useEffect(() => {
    if (!map.current || !mapLoaded || !startCity || routes.length === 0) {
      // Remove all markers
      markersRef.current.forEach(marker => marker.remove());
      markersRef.current = [];
      return;
    }

    const mapInstance = map.current;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Add start city marker
    const startMarkerEl = document.createElement('div');
    startMarkerEl.className = 'custom-marker start-marker';
    startMarkerEl.style.width = '12px';
    startMarkerEl.style.height = '12px';
    startMarkerEl.style.borderRadius = '50%';
    startMarkerEl.style.backgroundColor = '#4ade80';
    startMarkerEl.style.border = '2px solid white';
    startMarkerEl.style.cursor = 'pointer';
    startMarkerEl.title = startCity.name;

    const startMarker = new maplibregl.Marker({
      element: startMarkerEl,
      anchor: 'center',
    })
      .setLngLat([startCity.lng, startCity.lat])
      .addTo(mapInstance);

    markersRef.current.push(startMarker);

    // Add destination city markers
    routes.forEach((route, index) => {
      const isSelected = selectedRouteIndex === index;
      const color = ROUTE_COLORS[index % ROUTE_COLORS.length];

      const markerEl = document.createElement('div');
      markerEl.className = 'custom-marker destination-marker';
      markerEl.style.width = isSelected ? '14px' : '10px';
      markerEl.style.height = isSelected ? '14px' : '10px';
      markerEl.style.borderRadius = '50%';
      markerEl.style.backgroundColor = isSelected ? color : '#6b7280';
      markerEl.style.border = '2px solid white';
      markerEl.style.cursor = 'pointer';
      markerEl.title = route.endCity.name;

      const marker = new maplibregl.Marker({
        element: markerEl,
        anchor: 'center',
      })
        .setLngLat([route.endCity.lng, route.endCity.lat])
        .addTo(mapInstance);

      markerEl.addEventListener('click', () => {
        onRouteClick(index);
      });

      markersRef.current.push(marker);
    });
  }, [routes, startCity, selectedRouteIndex, mapLoaded, onRouteClick]);

  // Camera positioning
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    if (startCity && routes.length > 0) {
      // Calculate bounds from all cities
      const allLats = [startCity.lat, ...routes.map(r => r.endCity.lat)];
      const allLngs = [startCity.lng, ...routes.map(r => r.endCity.lng)];

      const minLat = Math.min(...allLats);
      const maxLat = Math.max(...allLats);
      const minLng = Math.min(...allLngs);
      const maxLng = Math.max(...allLngs);

      const centerLat = (minLat + maxLat) / 2;
      const centerLng = (minLng + maxLng) / 2;

      map.current.flyTo({
        center: [centerLng, centerLat],
        zoom: 2.5,
        duration: 1000,
      });
    } else {
      // Default view - show Brazil/South America
      map.current.flyTo({
        center: [-50, -15],
        zoom: 2.5,
        duration: 1000,
      });
    }
  }, [routes, startCity, mapLoaded]);

  // Animate dashed lines
  useEffect(() => {
    if (!map.current || !mapLoaded || routes.length === 0) return;

    let animationFrame: number;
    let startTime = Date.now();
    const dashLength = 0.4;
    const gapLength = 0.1;
    const totalLength = dashLength + gapLength;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = (elapsed / 2000) % 1; // 2000ms animation cycle
      const offset = progress * totalLength;

      routes.forEach((_, index) => {
        const routeId = `route-${index}`;
        if (map.current?.getLayer(routeId)) {
          // Create animated dash pattern by shifting segments
          if (offset < dashLength) {
            // First part of cycle: dash is shrinking from start
            map.current.setPaintProperty(routeId, 'line-dasharray', [
              dashLength - offset,
              gapLength + offset,
            ]);
          } else {
            // Second part: gap is moving
            const gapOffset = offset - dashLength;
            map.current.setPaintProperty(routeId, 'line-dasharray', [
              0,
              gapLength - gapOffset,
              dashLength,
              gapOffset,
            ]);
          }
        }
      });

      animationFrame = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [routes, mapLoaded]);

  if (error) {
    return (
      <div
        className="w-full h-full bg-black flex items-center justify-center"
        style={{
          minHeight: '600px',
          height: '600px',
          width: '100%',
          position: 'relative',
        }}
      >
        <div className="text-red-400 text-center p-4">
          <div className="text-lg font-semibold mb-2">Map Error</div>
          <div className="text-sm">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={mapContainer}
      className="w-full h-full bg-black"
      style={{
        minHeight: '600px',
        height: '600px',
        width: '100%',
        position: 'relative',
      }}
    />
  );
}

// Helper function to create a great circle arc between two points using spherical interpolation
function createGreatCircleArc(
  start: [number, number],
  end: [number, number],
  numPoints: number = 50
): [number, number][] {
  const coordinates: [number, number][] = [start];

  // Convert degrees to radians
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const toDeg = (rad: number) => (rad * 180) / Math.PI;

  const lat1 = toRad(start[1]);
  const lon1 = toRad(start[0]);
  const lat2 = toRad(end[1]);
  const lon2 = toRad(end[0]);

  const d = Math.acos(
    Math.sin(lat1) * Math.sin(lat2) +
      Math.cos(lat1) * Math.cos(lat2) * Math.cos(lon2 - lon1)
  );

  for (let i = 1; i < numPoints; i++) {
    const fraction = i / numPoints;
    const A = Math.sin((1 - fraction) * d) / Math.sin(d);
    const B = Math.sin(fraction * d) / Math.sin(d);

    const x =
      A * Math.cos(lat1) * Math.cos(lon1) + B * Math.cos(lat2) * Math.cos(lon2);
    const y =
      A * Math.cos(lat1) * Math.sin(lon1) + B * Math.cos(lat2) * Math.sin(lon2);
    const z = A * Math.sin(lat1) + B * Math.sin(lat2);

    const lat = Math.atan2(z, Math.sqrt(x * x + y * y));
    const lon = Math.atan2(y, x);

    coordinates.push([toDeg(lon), toDeg(lat)]);
  }

  coordinates.push(end);
  return coordinates;
}

