// Current: D3.js implementation
// Backup: GlobeMap.maplibre.tsx (MapLibre GL JS)
// To rollback: Rename GlobeMap.maplibre.tsx to GlobeMap.tsx and rename this file to GlobeMap.d3.tsx

import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import type { Route } from '../types';
import activatedPinUrl from '../assets/activated-pin.svg?url';
import nonActivatedPinUrl from '../assets/non-activated-pin.svg?url';

interface GlobeMapProps {
  routes: Route[];
  startCity: { lat: number; lng: number; name: string } | null;
  selectedRouteIndex: number | null;
  onRouteClick: (routeIndex: number) => void;
  isInteractive?: boolean; // Default: true
  initialRotation?: [number, number]; // For homepage view
  initialScale?: number; // Optional homepage zoom
  initialTranslateY?: number; // Optional custom Y translation for positioning
  onLoadComplete?: () => void; // Callback when globe finishes loading
  isAuthenticated?: boolean; // Whether user is authenticated - affects globe size
}

const ROUTE_COLORS = [
  '#ff6b35', // Orange
  '#3b82f6', // Blue
  '#10b981', // Green
  '#a855f7', // Purple
  '#f59e0b', // Yellow
];

interface DotData {
  lng: number;
  lat: number;
}

interface RouteArc {
  index: number;
  coordinates: [number, number][];
  color: string;
  isSelected: boolean;
}

interface MarkerData {
  lng: number;
  lat: number;
  routeIndex?: number;
  isStart: boolean;
  color: string;
}

export function GlobeMap({ 
  routes, 
  startCity, 
  selectedRouteIndex, 
  onRouteClick,
  isInteractive = true,
  initialRotation,
  initialScale,
  initialTranslateY,
  onLoadComplete,
  isAuthenticated = false
}: GlobeMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Store data for rendering and click detection
  const landFeaturesRef = useRef<any>(null);
  const countryBordersRef = useRef<any>(null);
  const allDotsRef = useRef<DotData[]>([]);
  const routeArcsRef = useRef<RouteArc[]>([]);
  const markersRef = useRef<MarkerData[]>([]);
  const projectionRef = useRef<d3.GeoOrthographic | null>(null);
  const rotationRef = useRef<[number, number]>([0, 0]);
  const scaleRef = useRef<number>(200);
  const defaultScaleRef = useRef<number>(200);
  const autoRotateRef = useRef<boolean>(true);
  const isDraggingRef = useRef<boolean>(false);
  const animationFrameRef = useRef<number | null>(null);
  const dashOffsetRef = useRef<number>(0);
  const initialTranslateYRatioRef = useRef<number | null>(null);
  const translateYRef = useRef<number>(0);
  
  // Pin images
  const activatedPinImageRef = useRef<HTMLImageElement | null>(null);
  const nonActivatedPinImageRef = useRef<HTMLImageElement | null>(null);
  
  // Refs to access current values in event handlers
  const selectedRouteIndexRef = useRef<number | null>(selectedRouteIndex);
  const onRouteClickRef = useRef(onRouteClick);
  const startCityRef = useRef(startCity);
  const routesRef = useRef<Route[]>([]);
  
  // Keep refs in sync with props
  useEffect(() => {
    selectedRouteIndexRef.current = selectedRouteIndex;
    onRouteClickRef.current = onRouteClick;
    startCityRef.current = startCity;
    routesRef.current = routes;
  }, [selectedRouteIndex, onRouteClick, startCity, routes]);

  // Helper function to create a great circle arc (reused from MapLibre version)
  const createGreatCircleArc = (
    start: [number, number],
    end: [number, number],
    numPoints: number = 50
  ): [number, number][] => {
    const coordinates: [number, number][] = [start];

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
  };

  // Point in polygon check (from V0 example)
  const pointInPolygon = (point: [number, number], polygon: number[][]): boolean => {
    const [x, y] = point;
    let inside = false;

    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const [xi, yi] = polygon[i];
      const [xj, yj] = polygon[j];

      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
        inside = !inside;
      }
    }

    return inside;
  };

  const pointInFeature = (point: [number, number], feature: any): boolean => {
    const geometry = feature.geometry;

    if (geometry.type === 'Polygon') {
      const coordinates = geometry.coordinates;
      if (!pointInPolygon(point, coordinates[0])) {
        return false;
      }
      for (let i = 1; i < coordinates.length; i++) {
        if (pointInPolygon(point, coordinates[i])) {
          return false;
        }
      }
      return true;
    } else if (geometry.type === 'MultiPolygon') {
      for (const polygon of geometry.coordinates) {
        if (pointInPolygon(point, polygon[0])) {
          let inHole = false;
          for (let i = 1; i < polygon.length; i++) {
            if (pointInPolygon(point, polygon[i])) {
              inHole = true;
              break;
            }
          }
          if (!inHole) {
            return true;
          }
        }
      }
      return false;
    }

    return false;
  };

  const generateDotsInPolygon = (feature: any, dotSpacing = 16) => {
    const dots: [number, number][] = [];
    const bounds = d3.geoBounds(feature);
    const [[minLng, minLat], [maxLng, maxLat]] = bounds;

    const stepSize = dotSpacing * 0.08;
    let pointsGenerated = 0;

    for (let lng = minLng; lng <= maxLng; lng += stepSize) {
      for (let lat = minLat; lat <= maxLat; lat += stepSize) {
        const point: [number, number] = [lng, lat];
        if (pointInFeature(point, feature)) {
          dots.push(point);
          pointsGenerated++;
        }
      }
    }

    return dots;
  };

  // Render function
  const render = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext('2d');
    if (!context || !projectionRef.current) return;
    
    // Don't render if land data isn't loaded yet
    if (!landFeaturesRef.current) return;

    const containerWidth = canvas.width / (window.devicePixelRatio || 1);
    const containerHeight = canvas.height / (window.devicePixelRatio || 1);
    const projection = projectionRef.current;
    const path = d3.geoPath().projection(projection).context(context);

    // Clear canvas
    context.clearRect(0, 0, canvas.width, canvas.height);

    const currentScale = projection.scale();
    const scaleFactor = currentScale / scaleRef.current;

    // Draw ocean (globe background) - transparent to show page background
    // Use the same translate Y as the projection to align the circle with the globe
    const translate = projection.translate();
    const circleX = translate[0];
    const circleY = translate[1];
    context.beginPath();
    context.arc(circleX, circleY, currentScale, 0, 2 * Math.PI);
    // Don't fill - let the page background show through
    context.strokeStyle = '#ffffff';
    context.lineWidth = 2 * scaleFactor;
    context.globalAlpha = 1.0;
    context.stroke();
    context.globalAlpha = 1.0; // Reset alpha

    // Draw graticule
    const graticule = d3.geoGraticule();
    context.beginPath();
    path(graticule());
    context.strokeStyle = '#ffffff';
    context.lineWidth = 1 * scaleFactor;
    context.globalAlpha = 0.25;
    context.stroke();
    context.globalAlpha = 1;

    // Draw land outlines (thinner)
    context.beginPath();
    landFeaturesRef.current.features.forEach((feature: any) => {
      path(feature);
    });
    context.strokeStyle = '#ffffff';
    context.lineWidth = 0.5 * scaleFactor; // Reduced from 1 to 0.5
    context.globalAlpha = 1.0; // Ensure fully opaque
    context.stroke();
    context.globalAlpha = 1.0; // Reset alpha

    // Draw country borders (boundaries between countries) - thinner
    if (countryBordersRef.current) {
      countryBordersRef.current.features.forEach((feature: any) => {
        // Draw each country's boundary
        context.beginPath();
        path(feature);
        context.strokeStyle = '#ffffff';
        context.lineWidth = 0.5 * scaleFactor; // Reduced from 1.5 to 0.5
        context.globalAlpha = 0.8;
        context.stroke();
      });
      context.globalAlpha = 1;
    }

    // Draw halftone dots (only on visible side of globe)
    const centerX = containerWidth / 2;
    const centerY = containerHeight / 2;
    const globeRadius = currentScale;
    
    allDotsRef.current.forEach((dot) => {
      const projected = projection([dot.lng, dot.lat]);
      // D3 projection returns null for points on the back side of the globe
      // Only render if projected point exists and is within the visible hemisphere
      if (projected && projected[0] !== null && projected[1] !== null) {
        const dx = projected[0] - centerX;
        const dy = projected[1] - centerY;
        const distanceFromCenter = Math.sqrt(dx * dx + dy * dy);
        
        // Only render dots that are within the visible hemisphere (front side)
        // Also check they're within reasonable canvas bounds
        if (
          distanceFromCenter <= globeRadius &&
          projected[0] >= -globeRadius &&
          projected[0] <= containerWidth + globeRadius &&
          projected[1] >= -globeRadius &&
          projected[1] <= containerHeight + globeRadius
        ) {
          context.beginPath();
          context.arc(projected[0], projected[1], 0.4 * scaleFactor, 0, 2 * Math.PI); // 3x smaller (was 1.2, now 0.4)
          context.fillStyle = '#999999';
          context.fill();
        }
      }
    });

    // Draw route arcs
    routeArcsRef.current.forEach((arc) => {
      if (!startCity) return;

      const opacity = arc.isSelected ? 1.0 : 0.6;
      const lineWidth = arc.isSelected ? 2 * scaleFactor : 1 * scaleFactor;

      context.beginPath();
      let firstPoint = true;
      arc.coordinates.forEach((coord) => {
        const projected = projection(coord);
        if (projected) {
          if (firstPoint) {
            context.moveTo(projected[0], projected[1]);
            firstPoint = false;
          } else {
            context.lineTo(projected[0], projected[1]);
          }
        }
      });

      // Solid lines (no dashes) - explicitly clear any dash state
      context.setLineDash([]);
      context.strokeStyle = arc.color;
      context.lineWidth = lineWidth;
      context.globalAlpha = opacity;
      context.lineCap = 'round';
      context.lineJoin = 'round';
      // #region agent log
      if (arc.isSelected) {
        fetch('http://127.0.0.1:7242/ingest/8b4404c8-093b-4c62-bed3-4866f34fd0a2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'GlobeMap.tsx:324',message:'Rendering selected route arc',data:{arcIndex:arc.index,selectedRouteIndex:selectedRouteIndexRef.current,arcColor:arc.color,arcIsSelected:arc.isSelected,opacity,lineWidth,coordinatesCount:arc.coordinates.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'D'})}).catch(()=>{});
      }
      // #endregion
      context.stroke();
      context.globalAlpha = 1;
    });

    // Draw markers
    markersRef.current.forEach((marker) => {
      const projected = projection([marker.lng, marker.lat]);
      if (projected) {
        if (marker.isStart) {
          // Start pin: black with white inner circle - scaled to 40% of original
          const radius = 8 * 0.4 * scaleFactor;
          
          // Draw outer black circle (no border)
          context.beginPath();
          context.arc(projected[0], projected[1], radius, 0, 2 * Math.PI);
          context.fillStyle = '#020617';
          context.fill();
          
          // Draw inner white circle
          const innerRadius = radius * 0.4;
          context.beginPath();
          context.arc(projected[0], projected[1], innerRadius, 0, 2 * Math.PI);
          context.fillStyle = '#ffffff';
          context.fill();
        } else {
          // Destination pins: use SVG images - use ref to get current value
          const isActivated = marker.routeIndex === selectedRouteIndexRef.current;
          // #region agent log
          if (marker.routeIndex !== undefined) {
            fetch('http://127.0.0.1:7242/ingest/8b4404c8-093b-4c62-bed3-4866f34fd0a2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'GlobeMap.tsx:354',message:'Rendering destination pin',data:{markerRouteIndex:marker.routeIndex,selectedRouteIndex:selectedRouteIndexRef.current,isActivated},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'D'})}).catch(()=>{});
          }
          // #endregion
          const pinImage = isActivated ? activatedPinImageRef.current : nonActivatedPinImageRef.current;
          
          if (pinImage) {
            // Pin dimensions (scaled to 40% of original size - less than half)
            const basePinWidth = isActivated ? 32 : 27;
            const basePinHeight = isActivated ? 50 : 43;
            const sizeMultiplier = 0.4; // 40% of original size
            
            const pinWidth = basePinWidth * sizeMultiplier;
            const pinHeight = basePinHeight * sizeMultiplier;
            
            // Scale based on zoom level
            const scaledWidth = pinWidth * scaleFactor;
            const scaledHeight = pinHeight * scaleFactor;
            
            // Center horizontally, anchor bottom at coordinates
            const x = projected[0] - scaledWidth / 2;
            const y = projected[1] - scaledHeight;
            
            context.drawImage(pinImage, x, y, scaledWidth, scaledHeight);
          } else {
            // Fallback to circle if image not loaded yet - scaled to 40% of original
            const radius = isActivated ? 8 * 0.4 * scaleFactor : 6 * 0.4 * scaleFactor;
            context.beginPath();
            context.arc(projected[0], projected[1], radius, 0, 2 * Math.PI);
            context.fillStyle = marker.color;
            context.fill();
            context.strokeStyle = '#ffffff';
            context.lineWidth = isActivated ? 3 * 0.4 * scaleFactor : 2 * 0.4 * scaleFactor;
            context.stroke();
          }
        }
      }
    });
  };

  // Load world data
  const loadWorldData = async () => {
    try {
      setIsLoading(true);

      const response = await fetch(
        'https://raw.githubusercontent.com/martynafford/natural-earth-geojson/refs/heads/master/110m/physical/ne_110m_land.json',
      );
      if (!response.ok) throw new Error('Failed to load land data');

      const landFeatures = await response.json();
      landFeaturesRef.current = landFeatures;

      // Generate dots for all land features
      let totalDots = 0;
      landFeatures.features.forEach((feature: any) => {
        const dots = generateDotsInPolygon(feature, 16);
        dots.forEach(([lng, lat]) => {
          allDotsRef.current.push({ lng, lat });
          totalDots++;
        });
      });

      // Load country borders
      try {
        const bordersResponse = await fetch(
          'https://raw.githubusercontent.com/martynafford/natural-earth-geojson/refs/heads/master/110m/cultural/ne_110m_admin_0_countries.json',
        );
        if (bordersResponse.ok) {
          const countryBorders = await bordersResponse.json();
          countryBordersRef.current = countryBorders;
          console.log('Country borders loaded:', countryBorders.features?.length || 0, 'countries');
        } else {
          console.warn('Failed to load country borders: HTTP', bordersResponse.status);
        }
      } catch (borderErr) {
        console.error('Failed to load country borders:', borderErr);
        // Continue without borders if they fail to load
      }

      setIsLoading(false);
      render();
      // Notify parent that loading is complete
      if (onLoadComplete) {
        onLoadComplete();
      }
    } catch (err) {
      setError('Failed to load land map data');
      setIsLoading(false);
      // Still notify parent even on error so UI doesn't stay stuck
      if (onLoadComplete) {
        onLoadComplete();
      }
    }
  };

  // Update route arcs when routes change
  useEffect(() => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/8b4404c8-093b-4c62-bed3-4866f34fd0a2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'GlobeMap.tsx:435',message:'Route arcs useEffect triggered',data:{hasStartCity:!!startCity,routesLength:routes.length,selectedRouteIndex},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    if (!startCity || routes.length === 0) {
      routeArcsRef.current = [];
      markersRef.current = [];
      render();
      return;
    }

    // Update route arcs
    routeArcsRef.current = routes.map((route, index) => ({
      index,
      coordinates: createGreatCircleArc(
        [startCity.lng, startCity.lat],
        [route.endCity.lng, route.endCity.lat]
      ),
      color: selectedRouteIndex === index ? '#020617' : '#5E77FB', // Black for activated, blue for non-activated
      isSelected: selectedRouteIndex === index,
    }));
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/8b4404c8-093b-4c62-bed3-4866f34fd0a2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'GlobeMap.tsx:452',message:'Route arcs updated',data:{routesLength:routes.length,selectedRouteIndex,arcColors:routeArcsRef.current.map(a=>a.color),arcIsSelected:routeArcsRef.current.map(a=>a.isSelected)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion

    // Update markers
    // Start pin always visible
    markersRef.current = [
      {
        lng: startCity.lng,
        lat: startCity.lat,
        isStart: true,
        color: '#020617', // Black origin pin
      },
      // Show all route destination pins
      ...routes.map((route, index) => ({
        lng: route.endCity.lng,
        lat: route.endCity.lat,
        routeIndex: index,
        isStart: false,
        // Selected route uses active color, others use inactive color
        color: selectedRouteIndex === index 
          ? ROUTE_COLORS[index % ROUTE_COLORS.length] 
          : '#9CA3AF', // Inactive pin color (lighter gray)
      })),
    ];

    render();
  }, [routes, startCity, selectedRouteIndex]);

  // Stop rotation and zoom to city when selected, resume when deselected
  useEffect(() => {
    if (!projectionRef.current) return;
    
    // When non-interactive, always keep auto-rotation enabled
    if (!isInteractive) {
      autoRotateRef.current = true;
      return;
    }

    if (startCity) {
      // City selected: stop rotation and zoom to city
      autoRotateRef.current = false;

      const targetRotation: [number, number] = [-startCity.lng, -startCity.lat];
      const startRotation: [number, number] = [...rotationRef.current];
      const startScale = projectionRef.current.scale();
      const targetScale = defaultScaleRef.current * 2.5; // Zoom in 2.5x
      const duration = 1000;
      const startTime = Date.now();

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const ease = 1 - Math.pow(1 - progress, 3); // Ease out cubic

        rotationRef.current[0] = startRotation[0] + (targetRotation[0] - startRotation[0]) * ease;
        rotationRef.current[1] = startRotation[1] + (targetRotation[1] - startRotation[1]) * ease;
        const currentScale = startScale + (targetScale - startScale) * ease;

        if (projectionRef.current) {
          projectionRef.current.rotate(rotationRef.current);
          projectionRef.current.scale(currentScale);
          render();
        }

        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };

      animate();
    } else {
      // No city selected: resume rotation and reset to default view
      const startRotation: [number, number] = [...rotationRef.current];
      const startScale = projectionRef.current.scale();
      const targetRotation: [number, number] = [0, 0];
      const targetScale = defaultScaleRef.current;
      const duration = 1000;
      const startTime = Date.now();

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const ease = 1 - Math.pow(1 - progress, 3); // Ease out cubic

        rotationRef.current[0] = startRotation[0] + (targetRotation[0] - startRotation[0]) * ease;
        rotationRef.current[1] = startRotation[1] + (targetRotation[1] - startRotation[1]) * ease;
        const currentScale = startScale + (targetScale - startScale) * ease;

        if (projectionRef.current) {
          projectionRef.current.rotate(rotationRef.current);
          projectionRef.current.scale(currentScale);
          render();
        }

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          // Resume auto-rotation after animation completes
          autoRotateRef.current = true;
        }
      };

      animate();
    }
  }, [startCity, isInteractive]);

  // Camera controls (flyTo equivalent) - only when routes are loaded
  useEffect(() => {
    if (!projectionRef.current || !startCity || routes.length === 0) return;

    const allLats = [startCity.lat, ...routes.map(r => r.endCity.lat)];
    const allLngs = [startCity.lng, ...routes.map(r => r.endCity.lng)];

    const centerLat = allLats.reduce((a, b) => a + b) / allLats.length;
    const centerLng = allLngs.reduce((a, b) => a + b) / allLngs.length;

    // Smoothly rotate to center on routes (but don't change zoom if already zoomed)
    const targetRotation: [number, number] = [-centerLng, -centerLat];
    const startRotation: [number, number] = [...rotationRef.current];
    const duration = 1000;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3); // Ease out cubic

      rotationRef.current[0] = startRotation[0] + (targetRotation[0] - startRotation[0]) * ease;
      rotationRef.current[1] = startRotation[1] + (targetRotation[1] - startRotation[1]) * ease;

      if (projectionRef.current) {
        projectionRef.current.rotate(rotationRef.current);
        render();
      }

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    animate();
  }, [routes]);

  // Animation removed - using solid lines instead of dashed

  // Load pin images
  useEffect(() => {
    const loadImages = () => {
      const activated = new Image();
      activated.src = activatedPinUrl;
      activated.onload = () => {
        activatedPinImageRef.current = activated;
        render(); // Re-render when image loads
      };
      activated.onerror = () => {
        console.error('Failed to load activated pin image');
      };
      
      const nonActivated = new Image();
      nonActivated.src = nonActivatedPinUrl;
      nonActivated.onload = () => {
        nonActivatedPinImageRef.current = nonActivated;
        render(); // Re-render when image loads
      };
      nonActivated.onerror = () => {
        console.error('Failed to load non-activated pin image');
      };
    };
    
    loadImages();
  }, []);

  // Initialize globe
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const updateCanvasSize = () => {
      const context = canvas.getContext('2d');
      if (!context) return;

      // Get container dimensions
      const container = canvas.parentElement;
      if (!container) return;

      const containerWidth = container.clientWidth || window.innerWidth;
      const containerHeight = container.clientHeight || window.innerHeight;
      // Globe size based on authentication status
      // When authenticated: use larger divisor (2.2) for smaller globe that fits within screen
      // When unauthenticated: use smaller divisor (1.5) for larger globe
      const radiusDivisor = isAuthenticated ? 2.2 : 1.5;
      const radius = Math.min(containerWidth, containerHeight) / radiusDivisor;

      const dpr = window.devicePixelRatio || 1;
      canvas.width = containerWidth * dpr;
      canvas.height = containerHeight * dpr;
      canvas.style.width = `${containerWidth}px`;
      canvas.style.height = `${containerHeight}px`;
      context.scale(dpr, dpr);

      scaleRef.current = radius;

      // Update projection
      if (projectionRef.current) {
        // If initialTranslateY is provided, calculate as percentage and apply to current container height
        // Otherwise center vertically
        let translateY: number;
        if (initialTranslateY !== undefined) {
          // Store the ratio on first calculation
          if (initialTranslateYRatioRef.current === null && typeof window !== 'undefined') {
            initialTranslateYRatioRef.current = initialTranslateY / window.innerHeight;
          }
          // Use stored ratio or calculate from current initialTranslateY
          const ratio = initialTranslateYRatioRef.current ?? (initialTranslateY / containerHeight);
          translateY = containerHeight * ratio;
        } else {
          translateY = containerHeight / 2;
        }
        projectionRef.current
          .scale(radius)
          .translate([containerWidth / 2, translateY]);
        render();
      }
    };

    updateCanvasSize();

    const container = canvas.parentElement;
    const containerWidth = container?.clientWidth || window.innerWidth;
    const containerHeight = container?.clientHeight || window.innerHeight;
    // Globe size based on authentication status
    // When authenticated: use larger divisor (2.2) for smaller globe that fits within screen
    // When unauthenticated: use smaller divisor (1.5) for larger globe
    const radiusDivisor = isAuthenticated ? 2.2 : 1.5;
    const radius = Math.min(containerWidth, containerHeight) / radiusDivisor;

    // Calculate translate Y - use initialTranslateY if provided, otherwise center
    // Store the ratio for resize calculations
    let translateY: number;
    if (initialTranslateY !== undefined) {
      if (typeof window !== 'undefined') {
        initialTranslateYRatioRef.current = initialTranslateY / window.innerHeight;
      }
      translateY = initialTranslateY;
    } else {
      translateY = containerHeight / 2;
      initialTranslateYRatioRef.current = null;
    }

    // Create projection
    const projection = d3
      .geoOrthographic()
      .scale(radius)
      .translate([containerWidth / 2, translateY])
      .clipAngle(90);

    projectionRef.current = projection;
    // Apply initial rotation if provided, otherwise default to [0, 0]
    rotationRef.current = initialRotation ? [...initialRotation] : [0, 0];
    // Apply initial rotation to projection
    projection.rotate(rotationRef.current);
    // Apply initial scale if provided, otherwise use calculated radius
    const finalScale = initialScale ?? radius;
    projection.scale(finalScale);
    defaultScaleRef.current = finalScale;
    scaleRef.current = finalScale;

    // Handle window resize
    const handleResize = () => {
      updateCanvasSize();
    };

    window.addEventListener('resize', handleResize);

    // Auto-rotation (slowed down)
    // When non-interactive, always keep auto-rotation enabled
    if (!isInteractive) {
      autoRotateRef.current = true;
    }
    
    const rotate = () => {
      if (autoRotateRef.current && !isDraggingRef.current) {
        rotationRef.current[0] += 0.05; // Reduced to 0.05 for slower rotation
        projection.rotate(rotationRef.current);
        render();
      }
    };

    const rotationTimer = d3.timer(rotate);

    // Store handlers for cleanup - only attach if isInteractive is true
    let handleMouseDown: ((event: MouseEvent) => void) | null = null;
    let handleWheel: ((event: WheelEvent) => void) | null = null;
    let handleClick: ((event: MouseEvent) => void) | null = null;

    // Only attach interactive event listeners if isInteractive is true
    if (isInteractive) {
      // Track if mouse moved during drag to distinguish clicks from drags
      let mouseMovedDuringDrag = false;

      // Mouse drag to rotate
      handleMouseDown = (event: MouseEvent) => {
        autoRotateRef.current = false;
        isDraggingRef.current = true;
        mouseMovedDuringDrag = false;
        const startX = event.clientX;
        const startY = event.clientY;
        const startRotation: [number, number] = [...rotationRef.current];

        const handleMouseMove = (moveEvent: MouseEvent) => {
          mouseMovedDuringDrag = true;
          const sensitivity = 0.5;
          const dx = moveEvent.clientX - startX;
          const dy = moveEvent.clientY - startY;

          rotationRef.current[0] = startRotation[0] + dx * sensitivity;
          rotationRef.current[1] = startRotation[1] - dy * sensitivity;
          rotationRef.current[1] = Math.max(-90, Math.min(90, rotationRef.current[1]));

          projection.rotate(rotationRef.current);
          render();
        };

        const handleMouseUp = () => {
          document.removeEventListener('mousemove', handleMouseMove);
          document.removeEventListener('mouseup', handleMouseUp);
          isDraggingRef.current = false;

          // Only resume auto-rotation if no city is selected (use ref to get current value)
          if (!startCityRef.current) {
            setTimeout(() => {
              autoRotateRef.current = true;
            }, 2000);
          }
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
      };

      // Scroll to zoom
      handleWheel = (event: WheelEvent) => {
        event.preventDefault();
        const scaleFactor = event.deltaY > 0 ? 0.9 : 1.1;
        const newRadius = Math.max(radius * 0.5, Math.min(radius * 3, projection.scale() * scaleFactor));
        projection.scale(newRadius);
        render();
      };
      
      // Click detection
      handleClick = (event: MouseEvent) => {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/8b4404c8-093b-4c62-bed3-4866f34fd0a2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'GlobeMap.tsx:755',message:'Canvas click detected',data:{selectedRouteIndex:selectedRouteIndexRef.current,markersCount:markersRef.current.length,routesLength:routesRef.current.length,isDragging:isDraggingRef.current,mouseMovedDuringDrag},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        
        // Ignore clicks that were part of a drag
        if (mouseMovedDuringDrag) {
          mouseMovedDuringDrag = false;
          return;
        }
        
        const rect = canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        // Convert click coordinates to CSS pixel space (projection coordinates are in CSS pixels)
        const x = (event.clientX - rect.left);
        const y = (event.clientY - rect.top);

        // Check markers first
        for (const marker of markersRef.current) {
          const projected = projection([marker.lng, marker.lat]);
          if (projected) {
            let hitRadius: number;
            if (marker.isStart) {
              // Start city: scaled to 40% of original (was 6px, now 2.4px)
              hitRadius = 6 * 0.4;
            } else {
              // Destination pins: use pin-specific hit areas - use ref for current value
              const isActivated = marker.routeIndex === selectedRouteIndexRef.current;
              // Use larger hit radius for better click detection
              // Non-activated pins need larger hit area since they're smaller
              const basePinWidth = isActivated ? 32 : 27;
              hitRadius = (basePinWidth * 0.4) / 2; // 40% size, then half for radius
              // Increase hit area significantly for easier clicking, especially for non-activated pins
              hitRadius = hitRadius * (isActivated ? 2.0 : 3.0); // Larger multiplier for non-activated pins
            }
            
            const dx = x - projected[0];
            const dy = y - projected[1];
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // #region agent log
            if (!marker.isStart && marker.routeIndex !== undefined) {
              fetch('http://127.0.0.1:7242/ingest/8b4404c8-093b-4c62-bed3-4866f34fd0a2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'GlobeMap.tsx:777',message:'Checking pin hit',data:{markerRouteIndex:marker.routeIndex,isActivated:marker.routeIndex===selectedRouteIndexRef.current,distance,hitRadius,hitRadiusTimes2:hitRadius*2,withinHitArea:distance<=hitRadius*2,projectedX:projected[0],projectedY:projected[1],clickX:x,clickY:y},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'A'})}).catch(()=>{});
            }
            // #endregion
            
            if (distance <= hitRadius * 2) {
              if (marker.routeIndex !== undefined) {
                // #region agent log
                fetch('http://127.0.0.1:7242/ingest/8b4404c8-093b-4c62-bed3-4866f34fd0a2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'GlobeMap.tsx:785',message:'Pin clicked - calling onRouteClick',data:{markerRouteIndex:marker.routeIndex,currentSelectedRouteIndex:selectedRouteIndexRef.current,routesLength:routes.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'A'})}).catch(()=>{});
                // #endregion
                onRouteClickRef.current(marker.routeIndex);
              }
              return;
            }
          }
        }

        // Check route arcs (coordinates already in CSS pixel space)
        for (const arc of routeArcsRef.current) {
          for (let i = 0; i < arc.coordinates.length - 1; i++) {
            const p1 = projection(arc.coordinates[i]);
            const p2 = projection(arc.coordinates[i + 1]);
            
            if (p1 && p2) {
              const dx = p2[0] - p1[0];
              const dy = p2[1] - p1[1];
              const length = Math.sqrt(dx * dx + dy * dy);
              
              if (length > 0) {
                const t = Math.max(0, Math.min(1, ((x - p1[0]) * dx + (y - p1[1]) * dy) / (length * length)));
                const projX = p1[0] + t * dx;
                const projY = p1[1] + t * dy;
                const distX = x - projX;
                const distY = y - projY;
                const distance = Math.sqrt(distX * distX + distY * distY);
                
                if (distance <= 5) {
                  onRouteClickRef.current(arc.index);
                  return;
                }
              }
            }
          }
        }
      };

      if (handleMouseDown) canvas.addEventListener('mousedown', handleMouseDown);
      if (handleWheel) canvas.addEventListener('wheel', handleWheel);
      if (handleClick) canvas.addEventListener('click', handleClick);
    }

    // Load world data
    loadWorldData();

    // Cleanup
    return () => {
      rotationTimer.stop();
      window.removeEventListener('resize', handleResize);
      // Only remove listeners if they were attached (isInteractive was true)
      if (handleMouseDown) canvas.removeEventListener('mousedown', handleMouseDown);
      if (handleWheel) canvas.removeEventListener('wheel', handleWheel);
      if (handleClick) canvas.removeEventListener('click', handleClick);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isInteractive, initialRotation, initialScale, initialTranslateY, isAuthenticated]);

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
    <div className="relative w-full h-full" style={{ height: '100%', width: '100%' }}>
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ display: 'block' }}
      />
    </div>
  );
}
