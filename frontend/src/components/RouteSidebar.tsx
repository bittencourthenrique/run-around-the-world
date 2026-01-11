import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import type { Route, JourneyProgress, City } from '../types';

interface RouteSidebarProps {
  route: Route;
  progress: JourneyProgress | null;
  totalDistance: number;
  onClose: () => void;
}

export function RouteSidebar({ route, progress, totalDistance, onClose }: RouteSidebarProps) {
  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    if (hours > 0) {
      return `${hours}h`;
    }
    return `${Math.floor((seconds % 3600) / 60)}m`;
  };

  const formatPace = (minPerKm: number): string => {
    const minutes = Math.floor(minPerKm);
    const seconds = Math.floor((minPerKm - minutes) * 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-white w-[421px] shadow-xs rounded-none" style={{ boxShadow: '0px 1px 2px 0px rgba(0,0,0,0.05)' }}>
      {/* Header with close button */}
      <div className="flex justify-end items-center pt-4 px-4 pb-0">
        <button
          onClick={onClose}
          className="w-6 h-6 flex items-center justify-center text-[#475569] hover:text-[#020617] transition-colors"
        >
          <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="px-8 pt-4 pb-8">
        <div className="space-y-7">
          {/* Distance and cities */}
          <div className="space-y-6">
            <p className="text-2xl leading-normal text-[#020617] tracking-normal">
              <span className="font-light text-[#606985]">Your legs carried you </span>
              <span className="font-bold text-[#020617]">{route.totalDistance.toFixed(1)}</span>
              <span className="font-extrabold"> km</span>
              <span className="font-light text-[#606985]"> from</span>
            </p>

            <div className="space-y-2">
              {/* Start city */}
              <div>
                <p className="text-[40px] font-extrabold leading-[48px] text-[#3756fb] tracking-normal">
                  {route.startCity.name}
                </p>
                <p className="text-sm font-light italic leading-normal text-[#868fab]">
                  {route.startCity.country || 'Unknown'}
                </p>
              </div>

              {/* Arrow */}
              <div className="flex items-start py-2" style={{ justifyContent: 'flex-start' }}>
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ textAlign: 'left' }}>
                  <path d="M12 5L12 19" stroke="#D0AF90" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M19 12L12 19L5 12" stroke="#D0AF90" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>

              {/* End city */}
              <div>
                <p className="text-[40px] font-extrabold leading-[48px] text-[#3756fb] tracking-normal">
                  {route.endCity.name}
                </p>
                <p className="text-sm font-light italic leading-normal text-[#868fab]">
                  {route.endCity.country || 'Unknown'}
                </p>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-[#dbe0ee]"></div>

          {/* Stats */}
          {progress && (
            <div className="space-y-6">
              <div className="flex justify-between items-start leading-3 text-base tracking-normal">
                <span className="font-light text-[#606985]">Total time:</span>
                <span className="font-extrabold text-[#020617]">{formatTime(progress.stats.totalTime)}</span>
              </div>
              <div className="flex justify-between items-start leading-3 text-base tracking-normal">
                <span className="font-light text-[#606985]">Avg pace:</span>
                <span className="font-extrabold text-[#020617]">
                  {progress.stats.averagePace > 0 ? formatPace(progress.stats.averagePace) : 'N/A'}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

