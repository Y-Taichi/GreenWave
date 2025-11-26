import React, { useState, useRef, useEffect } from 'react';
import { Signal, Route, Coordinate } from '../types';
import { saveRoute } from '../services/storageService';
import { ArrowLeft, Check, MapPin, Timer, Save } from 'lucide-react';

interface Props {
  onBack: () => void;
  userLocation: Coordinate | null;
  onRouteUpdated: (route: Route) => void; // Callback to update map
}

type Phase = 'INIT_ROUTE' | 'DRIVING' | 'RECORDING_SIGNAL' | 'SAVING';
type SignalPhase = 'WAITING_GREEN' | 'GREEN' | 'YELLOW' | 'RED';

export const SignalRecorder: React.FC<Props> = ({ onBack, userLocation, onRouteUpdated }) => {
  const [uiPhase, setUiPhase] = useState<Phase>('INIT_ROUTE');
  const [routeName, setRouteName] = useState('');
  
  // Route Data
  const [routeId] = useState(crypto.randomUUID());
  const [recordedPath, setRecordedPath] = useState<Coordinate[]>([]);
  const [recordedSignals, setRecordedSignals] = useState<Signal[]>([]);
  
  // Signal Recording Data
  const [signalPhase, setSignalPhase] = useState<SignalPhase>('WAITING_GREEN');
  const [yellowDuration, setYellowDuration] = useState(3);
  const [cycleData, setCycleData] = useState<{greenStart: number, greenEnd: number, redStart: number}>({
    greenStart: 0, greenEnd: 0, redStart: 0
  });

  const pathInterval = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Track path while driving
  useEffect(() => {
    if (uiPhase === 'DRIVING' || uiPhase === 'RECORDING_SIGNAL') {
      pathInterval.current = setInterval(() => {
        if (userLocation) {
          setRecordedPath(prev => {
             const newPath = [...prev, userLocation];
             // Live update map via callback
             onRouteUpdated({
                id: routeId,
                name: routeName || 'New Route',
                path: newPath,
                signals: recordedSignals,
                createdAt: Date.now()
             });
             return newPath;
          });
        }
      }, 2000);
    }
    return () => {
        if (pathInterval.current) clearInterval(pathInterval.current);
    };
  }, [uiPhase, userLocation, recordedSignals, routeName]);

  const startRoute = () => {
    if (!routeName.trim()) {
        setRouteName(`Route ${new Date().toLocaleTimeString()}`);
    }
    setUiPhase('DRIVING');
  };

  const handleSignalPress = () => {
     const now = Date.now();
     if (signalPhase === 'WAITING_GREEN') {
         setSignalPhase('GREEN');
         setCycleData(prev => ({ ...prev, greenStart: now }));
     } else if (signalPhase === 'RED') {
         // Cycle Complete
         const redDuration = (now - cycleData.redStart) / 1000;
         const greenDuration = (cycleData.greenEnd - cycleData.greenStart) / 1000;
         
         const newSignal: Signal = {
             id: crypto.randomUUID(),
             name: `Signal #${recordedSignals.length + 1}`,
             location: userLocation!,
             cycle: {
                 greenDuration,
                 yellowDuration,
                 redDuration,
                 totalDuration: greenDuration + yellowDuration + redDuration
             },
             referenceTimestamp: cycleData.greenStart,
             createdAt: Date.now()
         };
         
         setRecordedSignals(prev => [...prev, newSignal]);
         setUiPhase('DRIVING'); // Return to driving mode
         setSignalPhase('WAITING_GREEN'); // Reset for next signal
     }
  };

  const handleSignalRelease = () => {
      if (signalPhase === 'GREEN') {
          const now = Date.now();
          setSignalPhase('YELLOW');
          setCycleData(prev => ({ ...prev, greenEnd: now }));
          
          // Auto transition yellow -> red
          setTimeout(() => {
              setSignalPhase('RED');
              setCycleData(prev => ({ ...prev, redStart: Date.now() }));
          }, yellowDuration * 1000);
      }
  };

  const finishRoute = async () => {
      setUiPhase('SAVING');
      const fullRoute: Route = {
          id: routeId,
          name: routeName,
          path: recordedPath,
          signals: recordedSignals,
          createdAt: Date.now(),
          startLocation: recordedPath[0],
          endLocation: recordedPath[recordedPath.length - 1]
      };
      await saveRoute(fullRoute);
      onBack();
  };

  // --- Renders ---

  if (uiPhase === 'INIT_ROUTE') {
      return (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/80 backdrop-blur-sm p-6">
            <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-2xl">
                <h2 className="text-2xl font-bold mb-4 text-gray-800">Start New Route</h2>
                <input 
                    type="text"
                    placeholder="Route Name (e.g., Work Commute)"
                    className="w-full p-4 bg-gray-100 rounded-xl mb-4 font-medium text-lg focus:ring-2 ring-blue-500 outline-none"
                    value={routeName}
                    onChange={e => setRouteName(e.target.value)}
                />
                <div className="flex gap-3">
                    <button onClick={onBack} className="flex-1 py-3 bg-gray-200 text-gray-700 font-bold rounded-xl">Cancel</button>
                    <button onClick={startRoute} className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-200">Start Driving</button>
                </div>
            </div>
        </div>
      );
  }

  // The Recorder HUD
  return (
    <div className="absolute inset-0 z-20 pointer-events-none flex flex-col justify-between">
        
        {/* Header */}
        <div className="p-4 pointer-events-auto flex justify-between items-start">
            <div className="bg-white/90 backdrop-blur px-4 py-2 rounded-xl shadow-lg border border-white/20">
                <div className="text-xs text-gray-500 font-bold uppercase">Recording</div>
                <div className="font-bold text-lg">{routeName}</div>
                <div className="text-xs text-blue-600 font-mono">{recordedSignals.length} Signals • {(recordedPath.length * 2)}m</div>
            </div>
            <button 
                onClick={finishRoute}
                className="bg-black/80 text-white px-4 py-2 rounded-full font-bold flex items-center gap-2 hover:bg-black shadow-xl"
            >
                <Save size={16} /> Finish
            </button>
        </div>

        {/* Action Area */}
        <div className="p-6 pb-10 pointer-events-auto flex flex-col items-center">
            {uiPhase === 'DRIVING' ? (
                <button 
                    onClick={() => setUiPhase('RECORDING_SIGNAL')}
                    className="w-full max-w-xs bg-blue-600 hover:bg-blue-700 text-white py-5 rounded-2xl font-bold text-xl shadow-xl shadow-blue-900/20 flex items-center justify-center gap-3 transition-transform active:scale-95"
                >
                    <MapPin /> Record Signal Here
                </button>
            ) : (
                // Signal Recording Overlay
                <div 
                    className={`w-full max-w-xs aspect-square rounded-3xl shadow-2xl flex flex-col items-center justify-center transition-all duration-300 select-none touch-none active:scale-95 cursor-pointer border-4 border-white/20
                        ${signalPhase === 'WAITING_GREEN' ? 'bg-gray-800' : ''}
                        ${signalPhase === 'GREEN' ? 'bg-green-500 shadow-[0_0_40px_rgba(34,197,94,0.5)]' : ''}
                        ${signalPhase === 'YELLOW' ? 'bg-yellow-400' : ''}
                        ${signalPhase === 'RED' ? 'bg-red-500' : ''}
                    `}
                    onMouseDown={handleSignalPress}
                    onMouseUp={handleSignalRelease}
                    onTouchStart={handleSignalPress}
                    onTouchEnd={handleSignalRelease}
                >
                    <span className="text-white text-2xl font-black uppercase tracking-widest drop-shadow-md">
                        {signalPhase === 'WAITING_GREEN' && "Hold on Green"}
                        {signalPhase === 'GREEN' && "Release Yellow"}
                        {signalPhase === 'YELLOW' && "Wait..."}
                        {signalPhase === 'RED' && "Tap on Green"}
                    </span>
                    {signalPhase === 'RED' && <div className="text-white/80 text-sm mt-2">Completing Cycle...</div>}
                </div>
            )}
        </div>
    </div>
  );
};
