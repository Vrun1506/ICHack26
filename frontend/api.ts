// lib/api.ts
// API service layer for Aura Farming application

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

// Type definitions matching your backend API
export interface AnalysisApiResponse {
  crop_data: Record<string, {
    name: string;
    suitability_score: number;
    market_price: number;
    price_trend: number[];
    recommendations: string;
  }>;
  advice: {
    top_crops: string[];
    seasonal_recommendations: string;
    risk_factors: string[];
  };
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

export interface GeocodeResponse {
  lat: number;
  lng: number;
  location: string;
}

/**
 * Geocode a UK postcode using postcodes.io API
 */
export async function geocodePostcode(postcode: string): Promise<GeocodeResponse | null> {
  try {
    const response = await fetch(
      `https://api.postcodes.io/postcodes/${encodeURIComponent(postcode)}`
    );
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
}

/**
 * Fetch farm analysis data from your backend API
 */
export async function fetchFarmAnalysis(
  postcode: string,
  acres?: number
): Promise<AnalysisApiResponse> {
  try {
    const params = new URLSearchParams({
      postcode,
      ...(acres && { acres: acres.toString() })
    });

    const response = await fetch(`${API_BASE_URL}/analyze?${params}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Farm analysis API error:', error);
    throw error;
  }
}

/**
 * Post farm analysis request (if your backend uses POST instead of GET)
 */
export async function postFarmAnalysis(
  postcode: string,
  acres: number,
  coordinates?: { lat: number; lng: number }
): Promise<AnalysisApiResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        postcode,
        acres,
        coordinates
      }),
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Farm analysis API error:', error);
    throw error;
  }
}

/**
 * Fetch neighboring farms data
 */
export async function fetchNeighboringFarms(
  latitude: number,
  longitude: number,
  radius: number = 5 // km
) {
  try {
    const params = new URLSearchParams({
      lat: latitude.toString(),
      lng: longitude.toString(),
      radius: radius.toString()
    });

    const response = await fetch(`${API_BASE_URL}/neighbors?${params}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Neighboring farms API error:', error);
    // Return mock data as fallback
    return {
      neighbors: [
        { id: 1, owner: "Green Valley Estates", crop: "Winter Wheat", health: 94, size: "45ac", status: "optimal" },
        { id: 2, owner: "Ridgeview Farm", crop: "Barley", health: 82, size: "30ac", status: "warning" },
        { id: 3, owner: "East Field Holdings", crop: "Oilseed Rape", health: 65, size: "120ac", status: "stress" },
      ]
    };
  }
}

/**
 * Fetch historical crop price data
 */
export async function fetchCropPrices(cropName: string, months: number = 6) {
  try {
    const params = new URLSearchParams({
      crop: cropName,
      months: months.toString()
    });

    const response = await fetch(`${API_BASE_URL}/prices?${params}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Crop prices API error:', error);
    throw error;
  }
}

/**
 * Transform API response to match frontend crop data structure
 */
export function transformApiToCropData(apiResponse: AnalysisApiResponse) {
  const cropData = Object.entries(apiResponse.crop_data).map(([key, crop]) => ({
    name: crop.name,
    priceData: crop.price_trend || [185, 192, 198, 195, 202, 215], // fallback to mock
    soilScore: crop.suitability_score || 85,
    weatherScore: 85, // Calculate from weather data if needed
    priceScore: Math.min(100, Math.floor((crop.market_price / 500) * 100)),
    llmInsight: crop.recommendations || "Analysis pending",
    weatherInsight: apiResponse.advice.seasonal_recommendations || "Weather analysis in progress"
  }));

  return cropData;
}

// Error handling helper
export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public response?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}