// hooks/useApi.ts
// Custom React hooks for API calls with error handling and loading states

import { useState, useCallback } from 'react';
import { 
  fetchFarmAnalysis, 
  fetchNeighboringFarms,
  fetchCropPrices,
  geocodePostcode,
  transformApiToCropData,
  ApiError,
  type AnalysisApiResponse 
} from '@/lib/api';

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

/**
 * Hook for fetching farm analysis data
 */
export function useFarmAnalysis() {
  const [state, setState] = useState<UseApiState<AnalysisApiResponse>>({
    data: null,
    loading: false,
    error: null,
  });

  const fetchAnalysis = useCallback(async (postcode: string, acres?: number) => {
    setState({ data: null, loading: true, error: null });
    
    try {
      const data = await fetchFarmAnalysis(postcode, acres);
      setState({ data, loading: false, error: null });
      return data;
    } catch (error) {
      const errorMessage = error instanceof ApiError 
        ? error.message 
        : 'Failed to fetch farm analysis';
      setState({ data: null, loading: false, error: errorMessage });
      throw error;
    }
  }, []);

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null });
  }, []);

  return {
    ...state,
    fetchAnalysis,
    reset,
  };
}

/**
 * Hook for fetching neighboring farms
 */
export function useNeighboringFarms() {
  const [state, setState] = useState<UseApiState<any>>({
    data: null,
    loading: false,
    error: null,
  });

  const fetchNeighbors = useCallback(async (
    lat: number, 
    lng: number, 
    radius: number = 5
  ) => {
    setState({ data: null, loading: true, error: null });
    
    try {
      const data = await fetchNeighboringFarms(lat, lng, radius);
      setState({ data, loading: false, error: null });
      return data;
    } catch (error) {
      const errorMessage = error instanceof ApiError 
        ? error.message 
        : 'Failed to fetch neighboring farms';
      setState({ data: null, loading: false, error: errorMessage });
      throw error;
    }
  }, []);

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null });
  }, []);

  return {
    ...state,
    fetchNeighbors,
    reset,
  };
}

/**
 * Hook for geocoding postcodes
 */
export function useGeocode() {
  const [state, setState] = useState<UseApiState<any>>({
    data: null,
    loading: false,
    error: null,
  });

  const geocode = useCallback(async (postcode: string) => {
    setState({ data: null, loading: true, error: null });
    
    try {
      const data = await geocodePostcode(postcode);
      
      if (!data) {
        setState({ 
          data: null, 
          loading: false, 
          error: 'Unable to find location. Please check your postcode.' 
        });
        return null;
      }
      
      setState({ data, loading: false, error: null });
      return data;
    } catch (error) {
      setState({ 
        data: null, 
        loading: false, 
        error: 'Geocoding failed. Please try again.' 
      });
      return null;
    }
  }, []);

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null });
  }, []);

  return {
    ...state,
    geocode,
    reset,
  };
}

/**
 * Hook for fetching crop price data
 */
export function useCropPrices() {
  const [state, setState] = useState<UseApiState<any>>({
    data: null,
    loading: false,
    error: null,
  });

  const fetchPrices = useCallback(async (cropName: string, months: number = 6) => {
    setState({ data: null, loading: true, error: null });
    
    try {
      const data = await fetchCropPrices(cropName, months);
      setState({ data, loading: false, error: null });
      return data;
    } catch (error) {
      const errorMessage = error instanceof ApiError 
        ? error.message 
        : 'Failed to fetch crop prices';
      setState({ data: null, loading: false, error: errorMessage });
      throw error;
    }
  }, []);

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null });
  }, []);

  return {
    ...state,
    fetchPrices,
    reset,
  };
}

/**
 * Combined hook for complete farm data (analysis + neighbors)
 * Useful for loading everything at once
 */
export function useCompleteFarmData() {
  const [state, setState] = useState<UseApiState<{
    analysis: AnalysisApiResponse;
    neighbors: any[];
  }>>({
    data: null,
    loading: false,
    error: null,
  });

  const fetchComplete = useCallback(async (
    postcode: string,
    acres?: number,
    coordinates?: { lat: number; lng: number }
  ) => {
    setState({ data: null, loading: true, error: null });
    
    try {
      const promises: [
        Promise<AnalysisApiResponse>,
        Promise<any>
      ] = [
        fetchFarmAnalysis(postcode, acres),
        coordinates 
          ? fetchNeighboringFarms(coordinates.lat, coordinates.lng)
          : Promise.resolve({ neighbors: [] })
      ];

      const [analysis, neighborsData] = await Promise.all(promises);
      
      setState({ 
        data: { 
          analysis, 
          neighbors: neighborsData.neighbors || [] 
        }, 
        loading: false, 
        error: null 
      });
      
      return { analysis, neighbors: neighborsData.neighbors || [] };
    } catch (error) {
      const errorMessage = error instanceof ApiError 
        ? error.message 
        : 'Failed to fetch farm data';
      setState({ data: null, loading: false, error: errorMessage });
      throw error;
    }
  }, []);

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null });
  }, []);

  return {
    ...state,
    fetchComplete,
    reset,
  };
}