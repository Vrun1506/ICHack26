"use client";


const MOCK_NEIGHBORS = [
  { id: 1, owner: "Green Valley Estates", crop: "Winter Wheat", health: 94, size: "45ac", status: "optimal" },
  { id: 2, owner: "Ridgeview Farm", crop: "Barley", health: 82, size: "30ac", status: "warning" },
  { id: 3, owner: "East Field Holdings", crop: "Oilseed Rape", health: 65, size: "120ac", status: "stress" },
  { id: 4, owner: "Cooper & Sons", crop: "Winter Wheat", health: 89, size: "55ac", status: "optimal" },
  { id: 5, owner: "Hillside Organic", crop: "Barley", health: 91, size: "25ac", status: "optimal" },
];

import React, { useState, useEffect, useRef } from 'react';
import { 
  MapPin, ArrowRight, CheckCircle2, AlertCircle, Loader2, 
  Sun, Droplets, TrendingUp, Sparkles, ArrowLeft, DollarSign , CloudLightning
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- MOCK DATA FOR DASHBOARD ---
const MOCK_CROP_DATA = [
  {
    name: "Winter Wheat",
    priceData: [185, 192, 198, 195, 202, 215],
    soilScore: 92, weatherScore: 87, priceScore: 78,
    llmInsight: "Winter wheat thrives in your region's clay-loam soil composition. Historical data shows consistent yields above regional average.Winter wheat thrives in your region's clay-loam soil composition. Historical data shows consistent yields above regional averageWinter wheat thrives in your region's clay-loam soil composition. Historical data shows consistent yields above regional averageWinter wheat thrives in your region's clay-loam soil composition. Historical data shows consistent yields above regional averageWinter wheat thrives in your region's clay-loam soil composition. Historical data shows consistent yields above regional average",
    weatherInsight: "Ideal cool winters (avg 4°C) for vernalization, followed by moderate spring temperatures."
  },
  {
    name: "Barley",
    priceData: [165, 168, 175, 172, 178, 182],
    soilScore: 85, weatherScore: 91, priceScore: 70,
    llmInsight: "Barley adapts well to your soil type and requires less nitrogen than wheat, reducing input costs.",
    weatherInsight: "Exceptional weather compatibility. Your microclimate's moderate humidity minimizes disease pressure."
  },
  {
    name: "Oilseed Rape",
    priceData: [425, 432, 445, 438, 455, 468],
    soilScore: 78, weatherScore: 73, priceScore: 85,
    llmInsight: "Moderate suitability. Your soil structure supports root development, but pH is slightly above optimal.",
    weatherInsight: "Cabbage stem flea beetle pressure is moderate. Early sowing is critical for establishment."
  }
];

// --- API HELPER ---
const geocodePostcode = async (postcode: string): Promise<{ lat: number; lng: number; location: string } | null> => {
  try {
    const response = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(postcode)}`);
    const data = await response.json();
    if (data.status === 200 && data.result) {
      return {
        lat: data.result.latitude,
        lng: data.result.longitude,
        location: `${data.result.admin_district}, ${data.result.region}`
      };
    }
    return null;
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
};

export default function AuraApp() {
  // --- STATE MANAGEMENT ---
  const [view, setView] = useState<'landing' | 'dashboard'>('landing');
  
  // Search & Map State
  const [postcode, setPostcode] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number; location: string } | null>(null);
  
  // Map Visuals
  const [showMap, setShowMap] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const leafletLoadedRef = useRef(false);

  // Dashboard State
  const [selectedCrop, setSelectedCrop] = useState(0);

  // --- HANDLERS ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (postcode.length < 5) {
      setStatus('error');
      setErrorMessage('Please enter a valid postcode.');
      return;
    }

    setStatus('loading');
    setErrorMessage('');

    try {
      const coords = await geocodePostcode(postcode);
      if (coords) {
        setCoordinates(coords);
        setStatus('success');
        setTimeout(() => setShowMap(true), 500);
      } else {
        setStatus('error');
        setErrorMessage('Unable to find location. Please check your postcode.');
      }
    } catch (error) {
      setStatus('error');
      setErrorMessage('Network error. Please try again.');
    }
  };

  const handleReset = () => {
    if (markerRef.current) {
      markerRef.current.remove();
      markerRef.current = null;
    }
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }
    
    setView('landing');
    setShowMap(false);
    setStatus('idle');
    setPostcode('');
    setCoordinates(null);
    setMapLoaded(false);
    setSelectedCrop(0);
  };

  const handleCropChange = (index: number) => {
    setSelectedCrop(index);
  };

  // --- EFFECT: MAP INITIALIZATION ---
  useEffect(() => {
    if (showMap && !mapLoaded && mapContainerRef.current && coordinates) {
      const loadLeaflet = async () => {
        if ((window as any).L && leafletLoadedRef.current) {
          initializeMap();
          return;
        }

        if (!document.querySelector('link[href*="leaflet.css"]')) {
          const link = document.createElement('link');
          link.rel = 'stylesheet';
          link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
          document.head.appendChild(link);
        }

        if (!document.querySelector('script[src*="leaflet.js"]')) {
          const script = document.createElement('script');
          script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
          script.onload = () => {
            leafletLoadedRef.current = true;
            initializeMap();
          };
          document.body.appendChild(script);
        } else if ((window as any).L) {
          leafletLoadedRef.current = true;
          initializeMap();
        }
      };

      const initializeMap = () => {
        if (!mapContainerRef.current) return;
        const L = (window as any).L;
        if (!L) return;

        if (mapRef.current) mapRef.current.remove();

        const map = L.map(mapContainerRef.current, {
          zoomControl: false, attributionControl: false,
          scrollWheelZoom: false, doubleClickZoom: false, dragging: false
        }).setView([20, 0], 2);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
        mapRef.current = map;

        setTimeout(() => {
          if (map && coordinates) {
            map.flyTo([coordinates.lat, coordinates.lng], 15, { duration: 2.5 });
            setTimeout(() => {
              if (markerRef.current) markerRef.current.remove();
              const customIcon = L.divIcon({
                className: 'custom-marker',
                html: `<div class="relative"><div class="absolute -top-3 -left-3 w-6 h-6 bg-indigo-500 rounded-full animate-ping opacity-75"></div><div class="absolute -top-3 -left-3 w-6 h-6 bg-indigo-600 rounded-full border-2 border-white"></div></div>`,
                iconSize: [24, 24]
              });
              markerRef.current = L.marker([coordinates.lat, coordinates.lng], { icon: customIcon }).addTo(map);
            }, 2000);
          }
        }, 100);

        setMapLoaded(true);
      };
      loadLeaflet();
    }
  }, [showMap, mapLoaded, coordinates]);

  useEffect(() => {
    return () => {
      if (markerRef.current) markerRef.current.remove();
      if (mapRef.current) mapRef.current.remove();
    };
  }, []);

  const currentCrop = MOCK_CROP_DATA[selectedCrop];

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans text-slate-900 overflow-hidden relative">
      
      {/* 1. MAP LAYER (Background) */}
      <div className={cn(
        "absolute inset-0 bg-slate-50 transition-all duration-1000 z-0",
        showMap ? "opacity-100" : "opacity-0 pointer-events-none",
        view === 'dashboard' && "opacity-0"
      )}>
        <div ref={mapContainerRef} className="w-full h-full" />
        {showMap && !mapLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
          </div>
        )}
      </div>

      {/* 2. LANDING PAGE OVERLAY */}
      {view === 'landing' && (
        <div className="relative z-10 flex flex-col min-h-screen">
          
          {/* Main Hero (Moved BEFORE the Modal so Modal sits on top) */}
          <div className={cn(
            "flex-grow flex items-center justify-center px-4 transition-all duration-1000",
            showMap ? "opacity-0 pointer-events-none scale-95" : "opacity-100"
          )}>
            <nav className="absolute top-0 w-full py-6 px-8 max-w-7xl mx-auto flex justify-between items-center">
              <div className="font-bold text-xl text-indigo-600">AuraFarming.</div>
              <div className="hidden sm:flex gap-6 text-sm font-medium text-slate-500">
                <span className="cursor-pointer hover:text-indigo-600 transition-colors">How it works</span>
                <span className="cursor-pointer hover:text-indigo-600 transition-colors">Login</span>
              </div>
            </nav>

            <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-indigo-100 rounded-full blur-3xl opacity-50 -z-10" />
            <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-blue-100 rounded-full blur-3xl opacity-50 -z-10" />

            <div className="max-w-2xl w-full text-center space-y-8">
              <div className="space-y-4">
                <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight text-slate-900">
                  Check statistics.<br />
                  <span className="text-indigo-600">Act accordingly.</span>
                </h1>
                <p className="text-xl text-slate-500 max-w-lg mx-auto">
                  Enter your postcode to generate a real-time agricultural strategy.
                </p>
              </div>

              <div className="max-w-md mx-auto relative group">
                <div className={cn(
                  "absolute -inset-1 bg-indigo-500 rounded-xl blur opacity-25 group-hover:opacity-40 transition duration-1000", 
                  status === 'error' && "bg-red-500 opacity-50"
                )} />
                <form onSubmit={handleSubmit} className="relative flex items-center bg-white rounded-xl shadow-xl p-2">
                  <div className="pl-4 text-slate-400"><MapPin className="h-6 w-6" /></div>
                  <input
                    type="text"
                    value={postcode}
                    onChange={(e) => {
                      setPostcode(e.target.value.toUpperCase());
                      if (status === 'error') {
                        setStatus('idle');
                        setErrorMessage('');
                      }
                    }}
                    placeholder="Ex. SW1A 1AA"
                    className="flex-auto block w-full border-0 bg-transparent py-4 pl-4 pr-4 text-slate-900 placeholder:text-slate-400 focus:ring-0 sm:text-lg font-medium outline-none"
                    disabled={status === 'loading'}
                  />
                  <button
                    type="submit"
                    disabled={status === 'loading'}
                    className={cn(
                      "flex-none rounded-lg py-3 px-6 text-sm font-semibold text-white shadow-sm transition-all duration-200 flex items-center gap-2",
                      status === 'loading' ? "bg-indigo-400 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-500"
                    )}
                  >
                    {status === 'loading' ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                    {status === 'loading' ? 'Checking' : 'Check'}
                  </button>
                </form>
              </div>

              {status === 'error' && errorMessage && (
                <div className="flex justify-center items-center gap-2 text-red-500 text-sm font-medium animate-in slide-in-from-top-2">
                  <AlertCircle className="h-4 w-4" /> {errorMessage}
                </div>
              )}
            </div>
          </div>

          {/* Map "Found" Card - MOVED HERE & Added Z-50 */}
          <div className={cn(
            "absolute top-8 left-8 bg-white/90 backdrop-blur-md rounded-xl shadow-2xl p-6 max-w-sm transition-all duration-500 delay-[2000ms] border border-white/20 z-50",
            showMap && mapLoaded ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4 pointer-events-none"
          )}>
            <div className="flex gap-4">
              <div className="p-3 bg-green-100 rounded-lg h-fit">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-slate-900">Location Verified</h3>
                <p className="text-slate-600 text-sm mt-1 mb-3">
                  We have successfully analyzed soil and weather data for <span className="font-semibold text-indigo-600">{postcode}</span>.
                </p>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setView('dashboard')}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold py-2 px-4 rounded-lg transition-colors flex items-center gap-2 shadow-lg shadow-indigo-200"
                  >
                    View Analysis <ArrowRight className="h-4 w-4" />
                  </button>
                  <button 
                    onClick={handleReset}
                    className="text-slate-400 hover:text-slate-600 text-sm font-medium px-2 transition-colors"
                  >
                    Reset
                  </button>
                </div>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* 3. DASHBOARD VIEW */}
      {view === 'dashboard' && (
        <div className="relative z-20 min-h-screen bg-slate-50 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
              <button 
                onClick={handleReset} 
                className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" /> Back to Search
              </button>
              <div className="text-right">
                <div className="font-bold text-slate-900">{postcode}</div>
                <div className="text-xs text-slate-500">{coordinates?.location}</div>
              </div>
            </div>
          </header>

          <main className="max-w-7xl mx-auto p-6 space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
              <div>
                <h2 className="text-3xl font-bold text-slate-900">Intelligence Dashboard</h2>
                <p className="text-slate-500 mt-1">AI-driven insights based on local soil & weather patterns.</p>
              </div>
              <div className="flex gap-2 bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm">
                {MOCK_CROP_DATA.map((crop, idx) => (
                  <button
                    key={`crop-selector-${idx}`}
                    type="button"
                    onClick={() => handleCropChange(idx)}
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
            </div>

            <div key={`crop-content-${selectedCrop}`} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-gradient-to-br from-indigo-900 to-violet-900 rounded-2xl p-8 text-white relative overflow-hidden shadow-xl">
                <Sparkles className="absolute top-0 right-0 w-64 h-64 text-white opacity-5 pointer-events-none" />
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="bg-indigo-500/30 border border-indigo-400/30 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider text-indigo-200">
                      Strategic Advice
                    </span>
                  </div>
                  <h3 className="text-2xl font-bold mb-4">Why {currentCrop.name}?</h3>
                  <p className="text-indigo-100 text-lg leading-relaxed mb-6">{currentCrop.llmInsight}</p>
                  <div className="bg-white/10 rounded-xl p-4 border border-white/10">
                    <div className="flex items-center gap-2 text-indigo-200 text-sm font-semibold mb-1">
                      <Sun className="h-4 w-4" /> Weather Outlook
                    </div>
                    <p className="text-sm text-white/80">{currentCrop.weatherInsight}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center">
                  <div className="relative w-32 h-32 mb-4">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle cx="64" cy="64" r="60" stroke="#f1f5f9" strokeWidth="8" fill="none" />
                      <circle 
                        cx="64" cy="64" r="60" stroke="#4f46e5" strokeWidth="8" fill="none" 
                        strokeDasharray={2 * Math.PI * 60}
                        strokeDashoffset={2 * Math.PI * 60 * (1 - currentCrop.soilScore / 100)}
                        className="transition-all duration-1000 ease-out" strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center text-3xl font-bold text-indigo-900">{currentCrop.soilScore}</div>
                  </div>
                  <h4 className="font-semibold text-slate-900">Soil Compatibility</h4>
                  <p className="text-sm text-slate-500">Based on regional N-P-K data</p>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-emerald-100 rounded-lg">
                      <Sun className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div>
                      <div className="text-sm text-slate-500 font-medium">Weather Risk</div>
                      <div className="text-xl font-bold text-emerald-700">{currentCrop.priceScore}/100</div>
                    </div>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden mt-3">
                    <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${currentCrop.priceScore}%` }}></div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-emerald-100 rounded-lg">
                      <CloudLightning className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div>
                      <div className="text-sm text-slate-500 font-medium">Extreme Weather Risk</div>
                      <div className="text-xl font-bold text-emerald-700">{currentCrop.priceScore}/100</div>
                    </div>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden mt-3">
                    <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${currentCrop.priceScore}%` }}></div>
                  </div>
                </div>

              </div>
            </div>

            {/* PROFITABILITY CARD - IMPROVED DESIGN */}
            <div className="bg-gradient-to-br from-white to-slate-50 p-8 rounded-3xl border border-slate-200 shadow-lg hover:shadow-xl transition-shadow duration-300">
              {/* Header Section */}
              <div className="mb-6">
                <h2 className="text-3xl font-bold text-slate-800 mb-1">Profitability</h2>
                <p className="text-sm text-slate-500">6-month forecast & trends</p>
              </div>

              {/* Key Metrics Grid */}
              <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="flex flex-row gap-2">
                  <div className="w-full bg-white rounded-xl p-4 border border-slate-100 shadow-sm">
                    <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Expected Price</div>
                    <div className="text-2xl font-bold text-emerald-600">£{Math.round(currentCrop.priceData[currentCrop.priceData.length - 1] * 1.15)}</div>
                  </div>
                  
                  <div className="w-full bg-white rounded-xl p-4 border border-slate-100 shadow-sm">
                    <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Expected Costs</div>
                    <div className="text-2xl font-bold text-rose-600">£{Math.round(currentCrop.priceData[currentCrop.priceData.length - 1] * 0.85)}</div>
                  </div>
                </div>
                
                <div className="bg-gradient-to-br from-indigo-900 to-violet-900 rounded-xl p-4 shadow-md">
                  <div className="text-xs font-medium text-indigo-100 uppercase tracking-wide mb-1">Profit Margin</div>
                  <div className="text-2xl font-bold text-white">
                    {(((currentCrop.priceData[currentCrop.priceData.length - 1] * 1.15) - (currentCrop.priceData[currentCrop.priceData.length - 1] * 0.85)) / (currentCrop.priceData[currentCrop.priceData.length - 1] * 1.15) * 100).toFixed(1)}%
                  </div>
                </div>
              </div>

              {/* Chart Section */}
              <div className="h-100px bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-slate-700">Monthly Price Trends</h3>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-indigo-500"></div>
                      <span className="text-xs text-slate-600">Price History</span>
                    </div>
                  </div>
                </div>

                <div className="relative h-56 w-full pt-4">
                  {/* Y-axis labels */}
                  <div className="absolute left-0 top-4 bottom-8 w-12 flex flex-col justify-between text-xs text-slate-400">
                    <span>£{Math.max(...currentCrop.priceData)}</span>
                    <span>£{Math.round(Math.max(...currentCrop.priceData) * 0.5)}</span>
                    <span>£0</span>
                  </div>

                  {/* Chart area */}
                  <div className="ml-12 h-full pb-8">
                    {/* Grid lines */}
                    <div className="absolute left-12 right-0 top-4 bottom-8 flex flex-col justify-between pointer-events-none">
                      {[0, 1, 2, 3, 4].map((i) => (
                        <div key={i} className="w-full border-t border-slate-100"></div>
                      ))}
                    </div>

                    {/* Bars */}
                    <div className="flex items-end gap-3 relative" style={{ height: 'calc(100% - 1rem)' }}>
                      {currentCrop.priceData.map((price, i) => {
                        const maxPrice = Math.max(...currentCrop.priceData);
                        const heightPercent = (price / maxPrice) * 100;
                        const isHighest = price === maxPrice;
                        
                        return (
                          <div key={`price-${selectedCrop}-${i}`} className="flex-1 flex flex-col justify-end group">
                            <div 
                              className={`w-full rounded-t-lg transition-all duration-300 relative ${
                                isHighest 
                                  ? 'bg-gradient-to-t from-indigo-500 to-indigo-400 shadow-lg' 
                                  : 'bg-gradient-to-t from-indigo-300 to-indigo-200 group-hover:from-indigo-500 group-hover:to-indigo-400'
                              }`}
                              style={{ height: `${heightPercent}%` }}
                            >
                              {/* Tooltip */}
                              <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-xs py-2 px-3 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-xl z-10">
                                <div className="font-semibold">£{price}</div>
                                <div className="text-slate-300 text-[10px]">Month {i + 1}</div>
                                {/* Arrow */}
                                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900 rotate-45"></div>
                              </div>

                              {/* Value on top of bar */}
                              <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-semibold text-slate-700 opacity-0 group-hover:opacity-100 transition-opacity">
                                £{price}
                              </div>
                            </div>
                            
                            {/* Month label */}
                            <div className="text-center text-xs font-medium text-slate-500 mt-3">
                              M{i + 1}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Line Overlay */}
                    <svg className="absolute inset-0 right-0 bottom-8 top-4 left-12 pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id={`lineGradient-${selectedCrop}`} x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#6366f1" />
                          <stop offset="100%" stopColor="#8b5cf6" />
                        </linearGradient>
                      </defs>
                      
                      <polyline 
                        fill="none" 
                        stroke={`url(#lineGradient-${selectedCrop})`}
                        strokeWidth="0.8" 
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        points={currentCrop.priceData.map((price, i) => {
                          const maxPrice = Math.max(...currentCrop.priceData);
                          const barWidth = 100 / currentCrop.priceData.length;
                          const x = (i * barWidth) + (barWidth / 2);
                          const y = 100 - (price / maxPrice) * 100;
                          return `${x},${y}`;
                        }).join(" ")} 
                      />
                      
                      {/* Dots on line */}
                      {currentCrop.priceData.map((price, i) => {
                        const maxPrice = Math.max(...currentCrop.priceData);
                        const barWidth = 100 / currentCrop.priceData.length;
                        const x = (i * barWidth) + (barWidth / 2);
                        const y = 100 - (price / maxPrice) * 100;
                        
                        return (
                          <g key={i}>
                            <circle cx={x} cy={y} r="1.2" fill="white" stroke="#6366f1" strokeWidth="0.6" />
                          </g>
                        );
                      })}
                    </svg>
                  </div>
                </div>

                {/* Summary Stats */}
                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500">Average Price:</span>
                    <span className="font-semibold text-slate-700">
                      £{Math.round(currentCrop.priceData.reduce((a, b) => a + b, 0) / currentCrop.priceData.length)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500">Trend:</span>
                    <span className={cn(
                      "font-semibold flex items-center gap-1",
                      currentCrop.priceData[currentCrop.priceData.length - 1] > currentCrop.priceData[0] 
                        ? "text-emerald-600" 
                        : "text-rose-600"
                    )}>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path 
                          strokeLinecap="round" 
                          strokeLinejoin="round" 
                          strokeWidth={2} 
                          d={currentCrop.priceData[currentCrop.priceData.length - 1] > currentCrop.priceData[0]
                            ? "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                            : "M13 17h8m0 0v-8m0 8l-8-8-4 4-6-6"
                          }
                        />
                      </svg>
                      {currentCrop.priceData[currentCrop.priceData.length - 1] > currentCrop.priceData[0] 
                        ? "Increasing" 
                        : "Decreasing"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm mt-8">
              {/* NEIGHBORING FARMS SECTION */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm mt-8">
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
                  {MOCK_NEIGHBORS.map((farm) => (
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
            </div>
          </main>
        </div>
      )}

      <style jsx global>{`
        @keyframes ping {
          75%, 100% { transform: scale(2); opacity: 0; }
        }
        .animate-ping { animation: ping 1s cubic-bezier(0, 0, 0.2, 1) infinite; }
      `}</style>
    </div>
  );
}
