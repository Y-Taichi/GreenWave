import React from 'react';
import { Route } from '../types';
import { MapPin, Play, Trash2, Plus, Navigation } from 'lucide-react';

interface Props {
  routes: Route[];
  onStartCreate: () => void;
  onSelectRoute: (routeId: string) => void;
  onDeleteRoute: (routeId: string) => void;
}

export const ExplorerUI: React.FC<Props> = ({ routes, onStartCreate, onSelectRoute, onDeleteRoute }) => {
  return (
    <div className="absolute inset-0 pointer-events-none z-10 flex flex-col justify-between">
      {/* Top Bar */}
      <div className="p-6 pointer-events-auto">
        <h1 className="text-3xl font-black text-white drop-shadow-md tracking-tight">
          GreenWave
          <span className="text-blue-500">.</span>
        </h1>
        <p className="text-gray-400 text-sm font-medium">Synchronize your drive.</p>
      </div>

      {/* Bottom Drawer / Controls */}
      <div className="bg-gradient-to-t from-black via-black/90 to-transparent pt-12 px-4 pb-8 pointer-events-auto">
        
        <div className="flex items-center justify-between mb-6">
            <h2 className="text-white font-bold text-lg">Nearby Routes</h2>
            <button 
                onClick={onStartCreate}
                className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-full font-bold text-sm flex items-center gap-2 shadow-lg transition-transform active:scale-95"
            >
                <Plus size={16} />
                <span>New Route</span>
            </button>
        </div>

        <div className="flex flex-col gap-3 max-h-[40vh] overflow-y-auto pb-safe">
            {routes.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed border-gray-700 rounded-xl">
                    <p className="text-gray-500 text-sm">No routes recorded.</p>
                    <p className="text-gray-600 text-xs mt-1">Tap "New Route" to start mapping.</p>
                </div>
            ) : (
                routes.map(route => (
                    <div key={route.id} className="bg-gray-800/80 backdrop-blur-md border border-gray-700 p-4 rounded-xl flex justify-between items-center group">
                        <div onClick={() => onSelectRoute(route.id)} className="flex-1 cursor-pointer">
                            <h3 className="text-white font-bold">{route.name}</h3>
                            <div className="text-gray-400 text-xs mt-1 flex items-center gap-2">
                                <span className="bg-gray-700 px-1.5 py-0.5 rounded text-gray-300">{route.signals.length} signals</span>
                                <span>{new Date(route.createdAt).toLocaleDateString()}</span>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                             <button 
                                onClick={() => onSelectRoute(route.id)}
                                className="p-2 bg-green-500/20 text-green-400 rounded-full hover:bg-green-500 hover:text-white transition-colors"
                             >
                                <Play size={18} fill="currentColor" />
                             </button>
                             <button 
                                onClick={() => onDeleteRoute(route.id)}
                                className="p-2 text-gray-500 hover:text-red-400 transition-colors"
                             >
                                <Trash2 size={16} />
                             </button>
                        </div>
                    </div>
                ))
            )}
        </div>
      </div>
    </div>
  );
};
