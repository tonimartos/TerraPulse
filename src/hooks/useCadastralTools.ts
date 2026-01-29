import { useCallback } from 'react';
import { latLngToCell } from 'h3-js';
import useCadastralStore, { H3PriceData } from '../store/cadastralStore';
import useAnalysisStore from '../store/analysisStore';
import useIsochroneStore from '../store/isochroneStore';

export const useCadastralTools = () => {
  const { 
    cadastralData, 
    h3Resolution, 
    setH3Data, 
    h3Data 
  } = useCadastralStore();
  
  const { runAnalysis, isAnalyzing } = useAnalysisStore();
  const { layers: isochroneLayers } = useIsochroneStore();

  const aggregateH3 = useCallback(() => {
    if (cadastralData.length === 0) {
      alert("Please load cadastral data first.");
      return;
    }

    console.log(`Aggregating ${cadastralData.length} points at resolution ${h3Resolution}...`);

    const aggMap = new Map<string, { count: number; totalPrice: number; totalSqmPrice: number; sqmCount: number }>();

    cadastralData.forEach(item => {
      let lat = item.latitude;
      let lon = item.longitude;
      const price = item.valeur_fonciere;
      const surface = item.surface_build; 

      if (lat === undefined || lon === undefined || !price || price <= 0) {
         return;
      }

      try {
        const hex = latLngToCell(lat, lon, h3Resolution);
        
        const existing = aggMap.get(hex) || { count: 0, totalPrice: 0, totalSqmPrice: 0, sqmCount: 0 };
        
        let newTotalSqmPrice = existing.totalSqmPrice;
        let newSqmCount = existing.sqmCount;

        // Only calculate per-sqm price if we have a valid surface (> 1 sqm to be safe against noise)
        if (surface && surface > 1) {
            newTotalSqmPrice += (price / surface);
            newSqmCount += 1;
        }

        aggMap.set(hex, {
          count: existing.count + 1,
          totalPrice: existing.totalPrice + price,
          totalSqmPrice: newTotalSqmPrice,
          sqmCount: newSqmCount
        });
      } catch (e) {
        console.warn("Invalid coordinates for H3 conversion", lat, lon);
      }
    });

    const results: H3PriceData[] = [];
    aggMap.forEach((val, key) => {
      // Avoid division by zero
      const avgPrice = val.count > 0 ? Math.round(val.totalPrice / val.count) : 0;
      const avgPricePerSqm = val.sqmCount > 0 ? Math.round(val.totalSqmPrice / val.sqmCount) : 0;

      results.push({
        hex: key,
        count: val.count,
        totalPrice: val.totalPrice,
        averagePrice: avgPrice,
        averagePricePerSqm: avgPricePerSqm
      });
    });

    console.log(`Generated ${results.length} H3 cells.`);
    setH3Data(results);
  }, [cadastralData, h3Resolution, setH3Data]);

  const executeAnalysis = useCallback(() => {
     if (h3Data.length === 0 || isochroneLayers.length === 0) {
      alert("Please ensure you have both H3 Price Grid and Isochrones loaded.");
      return;
    }
    
    // We map isochroneLayers to the format expected by runAnalysis
    // runAnalysis signature: (h3Data: H3PriceData[], isochrones: { id: string; geojson: Feature<Polygon | MultiPolygon>; time: number }[]) => void;
    // IsochroneLayer has: id, geojson, travelTime
    
    // Ensure geojson is indeed Polygon or MultiPolygon. runAnalysis expects specific types.
    // The IsochroneLayer interface defines geojson as Feature<Polygon>.
    
    const analysisIsochrones = isochroneLayers.map(l => ({
        id: l.id,
        geojson: l.geojson,
        time: l.travelTime
    }));

    runAnalysis(h3Data, analysisIsochrones);
  }, [h3Data, isochroneLayers, runAnalysis]);

  return {
    aggregateH3,
    executeAnalysis,
    isAnalyzing
  };
};
