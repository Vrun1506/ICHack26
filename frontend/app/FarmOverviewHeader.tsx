import React from 'react';

interface FarmOverviewHeaderProps {
  data: {
    postcode: string;
    total_acres: number;
    coordinates: {
      latitude: number;
      longitude: number;
    };
  };
}

export default function FarmOverviewHeader({ data }: FarmOverviewHeaderProps) {
  return (
    <div className="text-right">
      <div className="font-bold text-slate-900">{data.postcode}</div>
      <div className="text-xs text-slate-500">
        {data.total_acres} acres · {data.coordinates.latitude.toFixed(4)}°N, {Math.abs(data.coordinates.longitude).toFixed(4)}°W
      </div>
    </div>
  );
}
