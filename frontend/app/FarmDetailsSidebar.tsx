import React from 'react';
import { Sparkles, Sun } from 'lucide-react';

interface FarmDetailsSidebarProps {
  data: {
    advice : Record<string, any>
  };
}

export default function FarmDetailsSidebar({ data }: FarmDetailsSidebarProps) {
  return (
    <div className="lg:col-span-2 bg-gradient-to-br from-indigo-900 to-violet-900 rounded-2xl p-8 text-white relative overflow-hidden shadow-xl">
      <Sparkles className="absolute top-0 right-0 w-64 h-64 text-white opacity-5 pointer-events-none" />
      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-4">
          <span className="bg-indigo-500/30 border border-indigo-400/30 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider text-indigo-200">
            Strategic Advice
          </span>
        </div>
        <h3 className="text-2xl font-bold mb-4">What to plant?</h3>
        <p className="text-indigo-100 text-lg leading-relaxed mb-6">Wheat is recommended due to its strong tolerance to the current soil moisture levels and moderate temperatures across the region. Historical yield data indicates consistent performance under similar conditions, with lower weather sensitivity compared to alternative cereals. In addition, wheat benefits from established local supply chains and stable market demand, helping reduce both production and price risk. Together, these factors make it a low-risk, high-reliability crop choice for this season.</p>
        <div className="bg-white/10 rounded-xl p-4 border border-white/10">
          <div className="flex items-center gap-2 text-indigo-200 text-sm font-semibold mb-1">
            <Sun className="h-4 w-4" /> Weather Outlook
          </div>
          <p className="text-sm text-white/80">Windy</p>
        </div>
      </div>
    </div>
  );
}
