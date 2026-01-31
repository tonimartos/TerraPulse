import { create } from 'zustand';
import { H3PriceData } from './cadastralStore';
import { Feature, Polygon, MultiPolygon } from 'geojson';
import { cellToLatLng } from 'h3-js';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import { point } from '@turf/helpers';

export interface ScoredH3Cell extends H3PriceData {
  timeMinutes: number; // Minimum travel time to this cell
  normalizedPrice: number; // 0 (cheap) to 1 (expensive)
  normalizedTime: number; // 0 (close) to 1 (far)
  totalScore: number; // Lower is better (Sweet Spot)
}

export interface CorrelationData {
  timeRange: string;
  avgPricePerSqm: number;
  cellCount: number;
  minPrice: number;
  maxPrice: number;
}

interface AnalysisState {
  analysisResults: ScoredH3Cell[];
  isAnalyzing: boolean;
  
  // Configuration
  priceWeight: number; // 0 to 1
  timeWeight: number; // 0 to 1
  
  reportData: CorrelationData[];
  setReportData: (data: CorrelationData[]) => void;

  setWeights: (price: number, time: number) => void;
  runAnalysis: (
    h3Data: H3PriceData[], 
    isochrones: { id: string; geojson: Feature<Polygon | MultiPolygon>; time: number }[]
  ) => void;
  clearAnalysis: () => void;
}

const useAnalysisStore = create<AnalysisState>((set, get) => ({
  analysisResults: [],
  isAnalyzing: false,
  priceWeight: 0.5,
  timeWeight: 0.5,
  reportData: [],

  setWeights: (price, time) => set({ priceWeight: price, timeWeight: time }),

  clearAnalysis: () => set({ analysisResults: [] }),
  setReportData: (data) => set({ reportData: data }),

  runAnalysis: (h3Data, isochrones) => {
    if (!h3Data.length || !isochrones.length) {
      console.warn("Cannot run analysis: Missing data.");
      return;
    }

    set({ isAnalyzing: true });

    // Run in a timeout to avoid freezing UI
    setTimeout(() => {
      try {
        const { priceWeight, timeWeight } = get();
        
        // 1. Find percentiles for robust price normalization (Linear scale is killed by outliers)
        const prices = h3Data.map(d => d.averagePricePerSqm).sort((a, b) => a - b);
        const p5 = prices[Math.floor(prices.length * 0.05)] || prices[0];
        const p95 = prices[Math.floor(prices.length * 0.95)] || prices[prices.length - 1];
        const priceRange = p95 - p5 || 1;

        // 2. Find min/max time (from isochrones) for normalization
        // Isochrone times are usually in seconds in the store, specific to the API used. 
        // Assuming the store passes `time` in minutes or we convert it.
        // Let's assume the passed `isochrones` object has a `time` property in minutes for simplicity of this logic.
        
        // We need to map each H3 cell to a travel time.
        // We will spatially join H3 centroids to isochrone polygons.
        
        const scoredCells: ScoredH3Cell[] = [];
        
        // Sort isochrones by time ascending so we find the "best" (lowest) time first
        const sortedIsochrones = [...isochrones].sort((a, b) => a.time - b.time);
        
        const maxTime = Math.max(...sortedIsochrones.map(i => i.time)); 
        // const minTime = Math.min(...sortedIsochrones.map(i => i.time));
        // const timeRange = maxTime - minTime || 1;
        
        // Pre-calculate centers to avoid re-calc
        // Using simple point-in-polygon
        
        h3Data.forEach(cell => {
           const [lat, lng] = cellToLatLng(cell.hex);
           const pt = point([lng, lat]); // GeoJSON is Lng, Lat
           
           let matchedTime = Number.MAX_VALUE;
           
           for (const iso of sortedIsochrones) {
             if (booleanPointInPolygon(pt, iso.geojson)) {
               matchedTime = iso.time;
               break; // Found smallest time since we sorted
             }
           }
           
           // If cell is not in any isochrone, we skip it or penalize it.
           // For a "Sweet Spot" analysis, we only care about reachable areas.
           if (matchedTime !== Number.MAX_VALUE) {
             
             // Normalize Components (0 to 1), clamped to 0-1 range to handle outliers
             let normPrice = (cell.averagePricePerSqm - p5) / priceRange;
             normPrice = Math.max(0, Math.min(1, normPrice));
             
             // Time normalization: 
             // If we have multiple contours (15, 30, 45), we normalize relative to that range? 
             // Or just relative to the max observed?
             // Let's use simple normalization between 0 (best) and 1 (worst)
             const normTime = (matchedTime) / maxTime; 

             // Weighted Score
             // Both Price and Time: Lower is better.
             const score = (normPrice * priceWeight) + (normTime * timeWeight);

             scoredCells.push({
               ...cell,
               timeMinutes: matchedTime,
               normalizedPrice: normPrice,
               normalizedTime: normTime,
               totalScore: score
             });
           }
        });

        console.log(`Analysis complete. Found ${scoredCells.length} reachable cells.`);
        set({ analysisResults: scoredCells, isAnalyzing: false });

      } catch (error) {
        console.error("Analysis failed", error);
        set({ isAnalyzing: false });
      }
    }, 100);
  }
}));

export default useAnalysisStore;
