import React from 'react';
import { AlertTriangle, AlertOctagon, Info } from 'lucide-react';
import { cn } from './utils';

interface ExtremeWeatherAlertProps {
  data: {
    likelihood: string;
    risk_level: string;
    region: string;
    temperature_z_score: number;
  };
}

export default function ExtremeWeatherAlert({ data }: ExtremeWeatherAlertProps) {
  const getRiskConfig = (level: string) => {
    switch (level.toUpperCase()) {
      case 'EXTREME':
        return {
          icon: AlertOctagon,
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          iconColor: 'text-red-600',
          textColor: 'text-red-900',
          badgeColor: 'bg-red-100 text-red-700'
        };
      case 'HIGH':
        return {
          icon: AlertTriangle,
          bgColor: 'bg-orange-50',
          borderColor: 'border-orange-200',
          iconColor: 'text-orange-600',
          textColor: 'text-orange-900',
          badgeColor: 'bg-orange-100 text-orange-700'
        };
      case 'MODERATE':
        return {
          icon: AlertTriangle,
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          iconColor: 'text-yellow-600',
          textColor: 'text-yellow-900',
          badgeColor: 'bg-yellow-100 text-yellow-700'
        };
      default:
        return {
          icon: Info,
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          iconColor: 'text-blue-600',
          textColor: 'text-blue-900',
          badgeColor: 'bg-blue-100 text-blue-700'
        };
    }
  };

  const config = getRiskConfig(data.risk_level);
  const Icon = config.icon;

  return (
    <div className={cn(
      "p-6 rounded-2xl border-2 shadow-lg animate-in slide-in-from-top-4 duration-500",
      config.bgColor,
      config.borderColor
    )}>
      <div className="flex items-start gap-4">
        <div className={cn("p-3 rounded-xl bg-white shadow-sm", config.iconColor)}>
          <Icon className="h-6 w-6" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className={cn("text-xl font-bold", config.textColor)}>
              ⚠️ {data.risk_level} WEATHER RISK
            </h3>
            <span className={cn("px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider", config.badgeColor)}>
              {data.likelihood} likelihood
            </span>
          </div>
          <p className={cn("text-sm mb-3", config.textColor, "opacity-90")}>
            Extreme weather event detected in the <span className="font-semibold">{data.region}</span> region. 
            Temperature anomaly detected (Z-score: {data.temperature_z_score.toFixed(2)}).
          </p>
          <div className={cn("text-xs font-medium", config.textColor, "opacity-75")}>
            📍 Recommendation: Monitor crop health closely and prepare protective measures if necessary.
          </div>
        </div>
      </div>
    </div>
  );
}
