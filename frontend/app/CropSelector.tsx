import React from 'react';
import { cn } from './utils';

interface CropSelectorProps {
  crops: Array<{ name: string }>;
  selectedCrop: number;
  onCropChange: (index: number) => void;
}

export default function CropSelector({ crops, selectedCrop, onCropChange }: CropSelectorProps) {
  return (
    <div className="flex gap-2 bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm">
      {crops.map((crop, idx) => (
        <button
          key={`crop-selector-${idx}`}
          type="button"
          onClick={() => onCropChange(idx)}
          className={cn(
            "px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 select-none",
            selectedCrop === idx 
              ? "bg-indigo-600 text-white shadow-md scale-105" 
              : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 active:scale-95"
          )}
        >
          {crop.name}
        </button>
      ))}
    </div>
  );
}
