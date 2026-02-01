import React from 'react';
import { MapPin, Sparkles } from 'lucide-react';
import { cn } from './utils';

interface Neighbor {
  id: number;
  owner: string;
  crop: string;
  health: number;
  size: string;
  status: string;
}

interface NeighboringFarmsProps {
  neighbors: Neighbor[];
  currentCrop: {
    name: string;
  };
}

export default function NeighboringFarms({ neighbors, currentCrop }: NeighboringFarmsProps) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h4 className="font-bold text-slate-800 flex items-center gap-2">
            <MapPin className="h-5 w-5 text-indigo-600" /> Regional Peer Analysis
          </h4>
          <p className="text-sm text-slate-500">Live simulation of neighboring crop performance within 5km.</p>
        </div>
        <div className="flex gap-4 text-xs font-medium">
          <div className="flex items-center gap-1"><span className="w-3 h-3 bg-emerald-500 rounded-full"></span> Optimal</div>
          <div className="flex items-center gap-1"><span className="w-3 h-3 bg-amber-500 rounded-full"></span> Warning</div>
          <div className="flex items-center gap-1"><span className="w-3 h-3 bg-rose-500 rounded-full"></span> Stress</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {neighbors.map((farm) => (
          <div 
            key={farm.id} 
            className="group relative bg-slate-50 border border-slate-100 p-4 rounded-xl hover:border-indigo-300 hover:shadow-md transition-all cursor-help"
          >
            {/* Farm Plot Visualization */}
            <div className={cn(
              "w-full h-24 rounded-lg mb-3 overflow-hidden relative",
              farm.status === 'optimal' ? "bg-emerald-100" : farm.status === 'warning' ? "bg-amber-100" : "bg-rose-100"
            )}>
              {/* Simulated "Field" Texture */}
              <div className="absolute inset-0 opacity-20" style={{ 
                backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 10px, currentColor 10px, currentColor 12px)`,
                color: farm.status === 'optimal' ? '#10b981' : farm.status === 'warning' ? '#f59e0b' : '#f43f5e'
              }} />
              <div className="absolute bottom-2 right-2 text-[10px] font-mono font-bold uppercase opacity-60">
                {farm.size}
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-tighter">Owner: {farm.owner}</div>
              <div className="text-sm font-bold text-slate-800">{farm.crop}</div>
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-slate-500">Yield Health</span>
                <span className={cn(
                  "text-xs font-bold",
                  farm.status === 'optimal' ? "text-emerald-600" : farm.status === 'warning' ? "text-amber-600" : "text-rose-600"
                )}>{farm.health}%</span>
              </div>
              {/* Health Bar */}
              <div className="h-1.5 w-full bg-slate-200 rounded-full mt-1">
                <div 
                  className={cn(
                    "h-full rounded-full transition-all duration-1000",
                    farm.status === 'optimal' ? "bg-emerald-500" : farm.status === 'warning' ? "bg-amber-500" : "bg-rose-500"
                  )} 
                  style={{ width: `${farm.health}%` }}
                />
              </div>
            </div>
            
            {/* Hover Insight */}
            <div className="absolute inset-0 bg-indigo-900/95 text-white p-4 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-center items-center text-center">
              <Sparkles className="h-5 w-5 mb-2 text-indigo-300" />
              <p className="text-xs leading-snug">
                {farm.crop === currentCrop.name 
                  ? "Competitor alert: Similar crop detected nearby. Market saturation may affect local pricing." 
                  : `Opportunity: Low local ${currentCrop.name} density suggests higher regional demand.`}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
