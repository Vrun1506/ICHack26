"use client";

const MOCK_NEIGHBORS = [
  {
    id: 1,
    owner: "Green Valley Estates",
    crop: "Winter Wheat",
    health: 94,
    size: "45ac",
    status: "optimal",
  },
  {
    id: 2,
    owner: "Ridgeview Farm",
    crop: "Barley",
    health: 82,
    size: "30ac",
    status: "warning",
  },
  {
    id: 3,
    owner: "East Field Holdings",
    crop: "Oilseed Rape",
    health: 65,
    size: "120ac",
    status: "stress",
  },
  {
    id: 4,
    owner: "Cooper & Sons",
    crop: "Winter Wheat",
    health: 89,
    size: "55ac",
    status: "optimal",
  },
  {
    id: 5,
    owner: "Hillside Organic",
    crop: "Barley",
    health: 91,
    size: "25ac",
    status: "optimal",
  },
];

import React, { useState, useEffect, useRef } from "react";
import {
  MapPin,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sun,
  Droplets,
  TrendingUp,
  Sparkles,
  ArrowLeft,
  DollarSign,
} from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- MOCK DATA FOR DASHBOARD ---
const MOCK_CROP_DATA = [
  {
    name: "Winter Wheat",
    priceData: [185, 192, 198, 195, 202, 215],
    soilScore: 92,
    priceScore: 78,
    llmInsight:
      "Winter wheat thrives in your region's clay-loam soil composition. Historical data shows consistent yields above regional average.",
    weatherInsight:
      "Ideal cool winters (avg 4°C) for vernalization, followed by moderate spring temperatures.",
  },
  {
    name: "Barley",
    priceData: [165, 168, 175, 172, 178, 182],
    soilScore: 85,
    priceScore: 70,
    llmInsight:
      "Barley adapts well to your soil type and requires less nitrogen than wheat, reducing input costs.",
    weatherInsight:
      "Exceptional weather compatibility. Your microclimate's moderate humidity minimizes disease pressure.",
  },
  {
    name: "Oilseed Rape",
    priceData: [425, 432, 445, 438, 455, 468],
    soilScore: 78,
    priceScore: 85,
    llmInsight:
      "Moderate suitability. Your soil structure supports root development, but pH is slightly above optimal.",
    weatherInsight:
      "Cabbage stem flea beetle pressure is moderate. Early sowing is critical for establishment.",
  },
];

// --- API HELPER ---
const geocodePostcode = async (
  postcode: string,
): Promise<{ lat: number; lng: number; location: string } | null> => {
  try {
    const response = await fetch(
      `https://api.postcodes.io/postcodes/${encodeURIComponent(postcode)}`,
    );
    const data = await response.json();
    if (data.status === 200 && data.result) {
      return {
        lat: data.result.latitude,
        lng: data.result.longitude,
        location: `${data.result.admin_district}, ${data.result.region}`,
      };
    }
    return null;
  } catch (error) {
    console.error("Geocoding error:", error);
    return null;
  }
};

export default function AuraApp() {
  // --- STATE MANAGEMENT ---
  const [view, setView] = useState<"landing" | "dashboard">("landing");

  // Search & Map State
  const [postcode, setPostcode] = useState("");
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [coordinates, setCoordinates] = useState<{
    lat: number;
    lng: number;
    location: string;
  } | null>(null);

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
      setStatus("error");
      setErrorMessage("Please enter a valid postcode.");
      return;
    }

    setStatus("loading");
    setErrorMessage("");

    try {
      const coords = await geocodePostcode(postcode);
      if (coords) {
        setCoordinates(coords);
        setStatus("success");
        setTimeout(() => setShowMap(true), 500);
      } else {
        setStatus("error");
        setErrorMessage("Unable to find location. Please check your postcode.");
      }
    } catch (error) {
      setStatus("error");
      setErrorMessage("Network error. Please try again.");
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

    setView("landing");
    setShowMap(false);
    setStatus("idle");
    setPostcode("");
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
          const link = document.createElement("link");
          link.rel = "stylesheet";
          link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
          document.head.appendChild(link);
        }

        if (!document.querySelector('script[src*="leaflet.js"]')) {
          const script = document.createElement("script");
          script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
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
          zoomControl: false,
          attributionControl: false,
          scrollWheelZoom: false,
          doubleClickZoom: false,
          dragging: false,
        }).setView([20, 0], 2);

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
        }).addTo(map);
        mapRef.current = map;

        setTimeout(() => {
          if (map && coordinates) {
            map.flyTo([coordinates.lat, coordinates.lng], 15, {
              duration: 2.5,
            });
            setTimeout(() => {
              if (markerRef.current) markerRef.current.remove();
              const customIcon = L.divIcon({
                className: "custom-marker",
                html: `<div class="relative"><div class="absolute -top-3 -left-3 w-6 h-6 bg-indigo-500 rounded-full animate-ping opacity-75"></div><div class="absolute -top-3 -left-3 w-6 h-6 bg-indigo-600 rounded-full border-2 border-white"></div></div>`,
                iconSize: [24, 24],
              });
              markerRef.current = L.marker([coordinates.lat, coordinates.lng], {
                icon: customIcon,
              }).addTo(map);
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
      <div
        className={cn(
          "absolute inset-0 bg-slate-50 transition-all duration-1000 z-0",
          showMap ? "opacity-100" : "opacity-0 pointer-events-none",
          view === "dashboard" && "opacity-0",
        )}
      >
        <div ref={mapContainerRef} className="w-full h-full" />
        {showMap && !mapLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
          </div>
        )}
      </div>

      {/* 2. LANDING PAGE OVERLAY */}
      {view === "landing" && (
        <div className="relative z-10 flex flex-col min-h-screen">
          {/* Main Hero (Moved BEFORE the Modal so Modal sits on top) */}
          <div
            className={cn(
              "flex-grow flex items-center justify-center px-4 transition-all duration-1000",
              showMap
                ? "opacity-0 pointer-events-none scale-95"
                : "opacity-100",
            )}
          >
            <nav className="absolute top-0 w-full py-6 px-8 max-w-7xl mx-auto flex justify-between items-center">
              <div className="font-bold text-xl text-indigo-600">
                AuraFarming.
              </div>
              <div className="hidden sm:flex gap-6 text-sm font-medium text-slate-500">
                <span className="cursor-pointer hover:text-indigo-600 transition-colors">
                  How it works
                </span>
                <span className="cursor-pointer hover:text-indigo-600 transition-colors">
                  Login
                </span>
              </div>
            </nav>

            <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-indigo-100 rounded-full blur-3xl opacity-50 -z-10" />
            <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-blue-100 rounded-full blur-3xl opacity-50 -z-10" />

            <div className="max-w-2xl w-full text-center space-y-8">
              <div className="space-y-4">
                <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight text-slate-900">
                  Check statistics.
                  <br />
                  <span className="text-indigo-600">Act accordingly.</span>
                </h1>
                <p className="text-xl text-slate-500 max-w-lg mx-auto">
                  Enter your postcode to generate a real-time agricultural
                  strategy.
                </p>
              </div>

              <div className="max-w-md mx-auto relative group">
                <div
                  className={cn(
                    "absolute -inset-1 bg-indigo-500 rounded-xl blur opacity-25 group-hover:opacity-40 transition duration-1000",
                    status === "error" && "bg-red-500 opacity-50",
                  )}
                />
                <form
                  onSubmit={handleSubmit}
                  className="relative flex items-center bg-white rounded-xl shadow-xl p-2"
                >
                  <div className="pl-4 text-slate-400">
                    <MapPin className="h-6 w-6" />
                  </div>
                  <input
                    type="text"
                    value={postcode}
                    onChange={(e) => {
                      setPostcode(e.target.value.toUpperCase());
                      if (status === "error") {
                        setStatus("idle");
                        setErrorMessage("");
                      }
                    }}
                    placeholder="Ex. SW1A 1AA"
                    className="flex-auto block w-full border-0 bg-transparent py-4 pl-4 pr-4 text-slate-900 placeholder:text-slate-400 focus:ring-0 sm:text-lg font-medium outline-none"
                    disabled={status === "loading"}
                  />
                  <button
                    type="submit"
                    disabled={status === "loading"}
                    className={cn(
                      "flex-none rounded-lg py-3 px-6 text-sm font-semibold text-white shadow-sm transition-all duration-200 flex items-center gap-2",
                      status === "loading"
                        ? "bg-indigo-400 cursor-not-allowed"
                        : "bg-indigo-600 hover:bg-indigo-500",
                    )}
                  >
                    {status === "loading" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ArrowRight className="h-4 w-4" />
                    )}
                    {status === "loading" ? "Checking" : "Check"}
                  </button>
                </form>
              </div>

              {status === "error" && errorMessage && (
                <div className="flex justify-center items-center gap-2 text-red-500 text-sm font-medium animate-in slide-in-from-top-2">
                  <AlertCircle className="h-4 w-4" /> {errorMessage}
                </div>
              )}
            </div>
          </div>

          {/* Map "Found" Card - MOVED HERE & Added Z-50 */}
          <div
            className={cn(
              "absolute top-8 left-8 bg-white/90 backdrop-blur-md rounded-xl shadow-2xl p-6 max-w-sm transition-all duration-500 delay-[2000ms] border border-white/20 z-50",
              showMap && mapLoaded
                ? "opacity-100 translate-y-0"
                : "opacity-0 -translate-y-4 pointer-events-none",
            )}
          >
            <div className="flex gap-4">
              <div className="p-3 bg-green-100 rounded-lg h-fit">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-slate-900">
                  Location Verified
                </h3>
                <p className="text-slate-600 text-sm mt-1 mb-3">
                  We have successfully analyzed soil and weather data for{" "}
                  <span className="font-semibold text-indigo-600">
                    {postcode}
                  </span>
                  .
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setView("dashboard")}
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
      {view === "dashboard" && (
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
                <div className="text-xs text-slate-500">
                  {coordinates?.location}
                </div>
              </div>
            </div>
          </header>

          <main className="max-w-7xl mx-auto p-6 space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
              <div>
                <h2 className="text-3xl font-bold text-slate-900">
                  Intelligence Dashboard
                </h2>
                <p className="text-slate-500 mt-1">
                  AI-driven insights based on local soil & weather patterns.
                </p>
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
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 active:scale-95",
                    )}
                  >
                    {crop.name}
                  </button>
                ))}
              </div>
            </div>

            <div
              key={`crop-content-${selectedCrop}`}
              className="grid grid-cols-1 lg:grid-cols-3 gap-6"
            >
              <div className="lg:col-span-2 bg-gradient-to-br from-indigo-900 to-violet-900 rounded-2xl p-8 text-white relative overflow-hidden shadow-xl">
                <Sparkles className="absolute top-0 right-0 w-64 h-64 text-white opacity-5 pointer-events-none" />
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="bg-indigo-500/30 border border-indigo-400/30 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider text-indigo-200">
                      Strategic Advice
                    </span>
                  </div>
                  <h3 className="text-2xl font-bold mb-4">
                    Why {currentCrop.name}?
                  </h3>
                  <p className="text-indigo-100 text-lg leading-relaxed mb-6">
                    {currentCrop.llmInsight}
                  </p>
                  <div className="bg-white/10 rounded-xl p-4 border border-white/10">
                    <div className="flex items-center gap-2 text-indigo-200 text-sm font-semibold mb-1">
                      <Sun className="h-4 w-4" /> Weather Outlook
                    </div>
                    <p className="text-sm text-white/80">
                      {currentCrop.weatherInsight}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center">
                  <div className="relative w-32 h-32 mb-4">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle
                        cx="64"
                        cy="64"
                        r="60"
                        stroke="#f1f5f9"
                        strokeWidth="8"
                        fill="none"
                      />
                      <circle
                        cx="64"
                        cy="64"
                        r="60"
                        stroke="#4f46e5"
                        strokeWidth="8"
                        fill="none"
                        strokeDasharray={2 * Math.PI * 60}
                        strokeDashoffset={
                          2 * Math.PI * 60 * (1 - currentCrop.soilScore / 100)
                        }
                        className="transition-all duration-1000 ease-out"
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center text-3xl font-bold text-indigo-900">
                      {currentCrop.soilScore}
                    </div>
                  </div>
                  <h4 className="font-semibold text-slate-900">
                    Soil Compatibility
                  </h4>
                  <p className="text-sm text-slate-500">
                    Based on regional N-P-K data
                  </p>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-emerald-100 rounded-lg">
                      <DollarSign className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div>
                      <div className="text-sm text-slate-500 font-medium">
                        Market Index
                      </div>
                      <div className="text-xl font-bold text-emerald-700">
                        {currentCrop.priceScore}/100
                      </div>
                    </div>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden mt-3">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                      style={{ width: `${currentCrop.priceScore}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <h4 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-indigo-600" /> Price
                  Forecast (6 Months)
                </h4>
                <div className="flex items-end gap-2 h-48 w-full">
                  {currentCrop.priceData.map((price, i) => (
                    <div
                      key={`price-${selectedCrop}-${i}`}
                      className="flex-1 flex flex-col justify-end group"
                    >
                      <div
                        className="w-full bg-indigo-100 group-hover:bg-indigo-600 transition-all duration-300 rounded-t-sm relative"
                        style={{
                          height: `${(price / Math.max(...currentCrop.priceData)) * 100}%`,
                        }}
                      >
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                          £{price}
                        </div>
                      </div>
                      <div className="text-center text-xs text-slate-400 mt-2">
                        M{i + 1}
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
          75%,
          100% {
            transform: scale(2);
            opacity: 0;
          }
        }
        .animate-ping {
          animation: ping 1s cubic-bezier(0, 0, 0.2, 1) infinite;
        }
      `}</style>
    </div>
  );
}
