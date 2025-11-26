import React, { useEffect, useState, useRef } from 'react';
import { Route, NavigationState, SignalPhase } from '../types';
import { getRouteById } from '../services/storageService';
import { calculateDistance, calculateSmoothedSpeed } from '../services/locationService';
import { X, LocateFixed } from 'lucide-react';

interface Props {
  routeId: string;
  userLocation: { lat: number; lng: number } | null;
  onBack: () => void;
}

export const Navigator: React.FC<Props> = ({ routeId, userLocation, onBack }) => {
  const [route, setRoute] = useState<Route | null>(null);
  const [navState, setNavState] = useState<NavigationState>({
    currentSpeedKmh: 0,
    distanceToSignal: 0,
    targetSignalId: null,
    etaSeconds: 0,
    recommendedAction: 'MAINTAIN',
    timeToPhaseChange: 0,
    nextPhase: SignalPhase.GREEN,
    currentPhase: SignalPhase.GREEN,
  });

  // Refs for mutable data used in high-frequency loops
  const speedHistory = useRef<number[]>([]);
  const lastPosition = useRef<{ lat: number; lng: number; time: number } | null>(null);

  useEffect(() => {
    const load = async () => {
      const r = await getRouteById(routeId);
      if (r) setRoute(r);
    };
    load();
  }, [routeId]);

  useEffect(() => {
    // Update internal physics loop when location prop updates
    if(userLocation) {
        handlePositionUpdate(userLocation);
    }
  }, [userLocation]);

  useEffect(() => {
    // Refresh UI calculation loop (independent of GPS for countdowns)
    const interval = setInterval(updateNavigationLogic, 200); // 5Hz update for UI
    return () => clearInterval(interval);
  }, [route, userLocation]); // Dependency on route so we have signals to calc against

  const handlePositionUpdate = (coords: { lat: number; lng: number }) => {
    const now = Date.now();
    let currentSpeedMps = 0;

    if (lastPosition.current) {
      const dist = calculateDistance(
        { latitude: lastPosition.current.lat, longitude: lastPosition.current.lng },
        { latitude: coords.lat, longitude: coords.lng }
      );
      const timeDiff = (now - lastPosition.current.time) / 1000;
      if (timeDiff > 0) currentSpeedMps = dist / timeDiff;
    }

    // Update history ring buffer
    speedHistory.current.push(currentSpeedMps);
    if (speedHistory.current.length > 5) speedHistory.current.shift();
    
    const smoothedMps = calculateSmoothedSpeed(speedHistory.current);
    const displaySpeed = smoothedMps < 0.5 ? 0 : smoothedMps * 3.6; // to km/h

    lastPosition.current = { lat: coords.lat, lng: coords.lng, time: now };

    setNavState(prev => ({ ...prev, currentSpeedKmh: displaySpeed }));
  };

  const updateNavigationLogic = () => {
    if (!route || !route.signals.length || !lastPosition.current) return;

    // Find closest signal
    const userLoc = { latitude: lastPosition.current.lat, longitude: lastPosition.current.lng };
    
    // Simple nearest signal logic for demo
    // In real app, check if signal is *ahead* of user based on bearing
    let nearestSignal = route.signals[0];
    let minDist = Infinity;
    
    route.signals.forEach(sig => {
        const d = calculateDistance(userLoc, sig.location);
        if (d < minDist) {
            minDist = d;
            nearestSignal = sig;
        }
    });
    
    const dist = minDist;
    const speedMps = navState.currentSpeedKmh / 3.6;
    const eta = speedMps > 0 ? dist / speedMps : 999;

    // Calculate Signal Phase
    const now = Date.now();
    const cycleTime = (now - nearestSignal.referenceTimestamp) / 1000;
    const cyclePos = cycleTime % nearestSignal.cycle.totalDuration;

    let currentPhase = SignalPhase.GREEN;
    let timeToChange = 0;
    let nextPhase = SignalPhase.YELLOW;

    const { greenDuration, yellowDuration, redDuration, totalDuration } = nearestSignal.cycle;

    if (cyclePos < greenDuration) {
      currentPhase = SignalPhase.GREEN;
      timeToChange = greenDuration - cyclePos;
      nextPhase = SignalPhase.YELLOW;
    } else if (cyclePos < greenDuration + yellowDuration) {
      currentPhase = SignalPhase.YELLOW;
      timeToChange = (greenDuration + yellowDuration) - cyclePos;
      nextPhase = SignalPhase.RED;
    } else {
      currentPhase = SignalPhase.RED;
      timeToChange = totalDuration - cyclePos;
      nextPhase = SignalPhase.GREEN;
    }

    // Recommendation Logic
    let action: NavigationState['recommendedAction'] = 'MAINTAIN';
    let targetSpeed = undefined;

    if (dist < 20) {
        action = currentPhase === SignalPhase.RED ? 'STOP' : 'MAINTAIN';
    } else {
        // ETA vs Phase
        if (currentPhase === SignalPhase.GREEN) {
             if (eta < timeToChange) {
                 action = 'MAINTAIN';
             } else {
                 action = 'DECELERATE'; 
             }
        } else if (currentPhase === SignalPhase.RED) {
             if (eta < timeToChange) {
                 action = 'DECELERATE';
                 const idealSpeedMps = dist / timeToChange;
                 targetSpeed = idealSpeedMps * 3.6;
             } else {
                 action = 'MAINTAIN'; 
             }
        }
    }

    setNavState(prev => ({
        ...prev,
        distanceToSignal: dist,
        etaSeconds: eta,
        currentPhase,
        timeToPhaseChange: timeToChange,
        recommendedAction: action,
        targetSpeedKmh: targetSpeed,
        nextPhase
    }));
  };

  const getActionColor = () => {
    switch (navState.recommendedAction) {
        case 'ACCELERATE': return 'text-green-400';
        case 'DECELERATE': return 'text-orange-400';
        case 'STOP': return 'text-red-500';
        default: return 'text-blue-400';
    }
  };

  const getPhaseColor = (p: SignalPhase) => {
      if (p === SignalPhase.GREEN) return 'bg-green-500 shadow-[0_0_30px_rgba(34,197,94,0.6)]';
      if (p === SignalPhase.YELLOW) return 'bg-yellow-400 shadow-[0_0_30px_rgba(250,204,21,0.6)]';
      return 'bg-red-500 shadow-[0_0_30px_rgba(239,68,68,0.6)]';
  };

  return (
    <div className="absolute inset-0 pointer-events-none z-20 flex flex-col justify-between">
        {/* Top Header */}
        <div className="p-4 flex items-center justify-between pointer-events-auto">
            <div className="bg-black/60 backdrop-blur-md px-4 py-2 rounded-full flex items-center gap-3 text-white border border-white/10">
               <LocateFixed size={16} className="animate-pulse text-blue-400" />
               <span className="font-mono font-bold">{Math.round(navState.distanceToSignal)}m</span>
            </div>
            <button onClick={onBack} className="bg-black/60 backdrop-blur-md p-2 rounded-full text-white/80 hover:bg-red-500/80 transition-colors">
                <X size={20} />
            </button>
        </div>

        {/* Center Speed */}
        <div className="flex-1 flex flex-col items-center justify-center">
             <div className="flex flex-col items-center drop-shadow-2xl">
                <span className="text-[8rem] font-black text-white leading-none tracking-tighter tabular-nums">
                    {Math.round(navState.currentSpeedKmh)}
                </span>
                <span className="text-white/60 font-bold tracking-widest text-xl -mt-4">KM/H</span>
             </div>
             {navState.targetSpeedKmh && (
                <div className="mt-2 bg-blue-600/80 backdrop-blur px-3 py-1 rounded text-white text-sm font-bold shadow-lg animate-bounce">
                    TARGET: {Math.round(navState.targetSpeedKmh)}
                </div>
             )}
        </div>

        {/* Bottom HUD */}
        <div className="p-6 pb-10 bg-gradient-to-t from-black/90 via-black/50 to-transparent">
            <div className="flex items-end justify-between">
                <div>
                    <div className="text-gray-400 text-xs font-bold uppercase mb-1">Advice</div>
                    <div className={`text-4xl font-black italic tracking-tight ${getActionColor()}`}>
                        {navState.recommendedAction}
                    </div>
                </div>

                <div className="flex flex-col items-center gap-2">
                    <div className={`w-20 h-20 rounded-full flex items-center justify-center text-black font-bold text-2xl transition-all duration-300 ${getPhaseColor(navState.currentPhase)}`}>
                        {Math.ceil(navState.timeToPhaseChange)}
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
};
