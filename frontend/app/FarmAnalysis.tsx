import React from 'react';
import { ArrowLeft } from 'lucide-react';
import FarmOverviewHeader from './FarmOverviewHeader';
import ExtremeWeatherAlert from './ExtremeWeatherAlert';
import WeatherRiskDashboard from './WeatherRiskDashboard';
import SoilAnalysisPanel from './SoilAnalysisPanel';
import WeatherAnomaliesSection from './WeatherAnomaliesSection';
import FarmDetailsSidebar from './FarmDetailsSidebar';
import ProfitabilityCard from './ProfitabilityCard';
import NeighboringFarms from './NeighboringFarms';
import CropSelector from './CropSelector';

interface ApiData {
  crop_data: Record<string, any>;
  advice: Record<string, any>;
  metadata: {
    postcode: string;
    total_acres: number;
    ml_telemetry: {
      extreme_weather: {
        likelihood: string;
        risk_level: string;
        region: string;
        temperature_z_score: number;
      };
      weather_anomalies: {
        soil_temp_delta: number;
        soil_temp_actual: number;
        soil_temp_predicted: number;
        wind_speed_delta: number;
        wind_speed_actual: number;
        precipitation_prob_actual: number;
        precipitation_actual: number;
        cloud_cover_actual: number;
        overall_risk: string;
      };
      soil: {
        clay: number;
        sand: number;
        silt: number;
        texture_class: string;
        drainage: string;
        water_retention: string;
        nutrient_retention: string;
        workability: string;
        description: string;
      };
    };
    coordinates: {
      latitude: number;
      longitude: number;
    };
  };
}

interface CropData {
  name: string;
  priceData: number[];
  soilScore: number;
  weatherScore: number;
  priceScore: number;
  llmInsight: string;
  weatherInsight: string;
}

interface Neighbor {
  id: number;
  owner: string;
  crop: string;
  health: number;
  size: string;
  status: string;
}

interface FarmAnalysisProps {
  apiData: ApiData;
  cropData: CropData[];
  neighbors: Neighbor[];
  onReset: () => void;
  selectedCrop: number;
  onCropChange: (index: number) => void;
}

export default function FarmAnalysis({ 
  apiData, 
  cropData, 
  neighbors, 
  onReset, 
  selectedCrop, 
  onCropChange 
}: FarmAnalysisProps) {
  const currentCrop = cropData[selectedCrop];

  return (
    <div className="relative z-20 min-h-screen bg-slate-50 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <button 
            onClick={onReset} 
            className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Search
          </button>
          <FarmOverviewHeader data={apiData.metadata} />
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 space-y-8">
        {/* Extreme Weather Alert - shown prominently if risk level is high */}
        {apiData.metadata.ml_telemetry.extreme_weather.risk_level !== 'LOW' && (
          <ExtremeWeatherAlert data={apiData.metadata.ml_telemetry.extreme_weather} />
        )}

        {/* Dashboard Title + Crop Selector */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <h2 className="text-3xl font-bold text-slate-900">Intelligence Dashboard</h2>
            <p className="text-slate-500 mt-1">AI-driven insights based on local soil & weather patterns.</p>
          </div>
          <CropSelector 
            crops={cropData} 
            selectedCrop={selectedCrop} 
            onCropChange={onCropChange} 
          />
        </div>

        {/* Farm Details */}
        <FarmDetailsSidebar data={apiData} />

        {/* Main Analysis Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Weather Risk + Soil Analysis */}
          <div className="space-y-6">
            <WeatherRiskDashboard 
              extremeWeather={apiData.metadata.ml_telemetry.extreme_weather}
              weatherAnomalies={apiData.metadata.ml_telemetry.weather_anomalies}
              currentCrop={currentCrop}
            />
            <SoilAnalysisPanel data={apiData.metadata.ml_telemetry.soil} />
          </div>

          {/* Middle Column: Weather Anomalies */}
          <div className="lg:col-span-2 gap-y-2">
            <WeatherAnomaliesSection data={apiData.metadata.ml_telemetry.weather_anomalies} />
            {/* Profitability Card */}
            <ProfitabilityCard currentCrop={currentCrop} selectedCrop={selectedCrop} />
          </div>
        </div>

        {/* Neighboring Farms */}
        <NeighboringFarms neighbors={neighbors} currentCrop={currentCrop} />
      </main>
    </div>
  );
}
