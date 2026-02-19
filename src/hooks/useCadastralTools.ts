import { useCallback } from 'react';
import { latLngToCell, polygonToCells } from 'h3-js';
import useCadastralStore, { H3PriceData } from '../store/cadastralStore';
import useAnalysisStore, { CorrelationData } from '../store/analysisStore';
import useIsochroneStore from '../store/isochroneStore';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import { point } from '@turf/helpers';

export const useCadastralTools = () => {
  const { 
    cadastralData, 
    layers: cadastralLayers, // Support for multi-layer cadastral data
    h3Resolution, 
    setH3Data, 
    h3Data,
    arbitrageThreshold,
    setArbitrageData,
    scopeToIsochrones
  } = useCadastralStore();
  
  const { runAnalysis, isAnalyzing, setReportData } = useAnalysisStore();
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

      // Specifically ignore listings with 0 price to avoid skewing data
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

      // Ignore cells with 0 price per sqm to avoid skewing analysis (treating 0 as cheap)
      if (avgPricePerSqm <= 0) return;

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

  const computeArbitrage = useCallback(() => {
    if (cadastralData.length === 0 || h3Data.length === 0) {
      alert("Please load cadastral data and compute price grid first.");
      return;
    }

    console.log(`Finding deals with ${arbitrageThreshold}% discount...`);

    // Create a lookup for H3 cell prices
    const priceMap = new Map<string, number>();
    h3Data.forEach(d => {
      priceMap.set(d.hex, d.averagePricePerSqm);
    });

    const deals = cadastralData.filter(item => {
      // Basic validation
      if (!item.latitude || !item.longitude || !item.valeur_fonciere || !item.surface_build || item.surface_build < 10) {
        return false;
      }
      
      // SCOPE FILTER: Check if point is inside visible isochrones
      if (scopeToIsochrones) {
          const visibleIsochrones = isochroneLayers.filter(l => l.isVisible);
          if (visibleIsochrones.length > 0) {
            const pt = point([item.longitude, item.latitude]);
            const isInside = visibleIsochrones.some(iso => booleanPointInPolygon(pt, iso.geojson));
            if (!isInside) return false;
          }
      }
      
      const itemPriceSqm = item.valeur_fonciere / item.surface_build;
      
      try {
        const hex = latLngToCell(item.latitude, item.longitude, h3Resolution);
        const avgPrice = priceMap.get(hex);
        
        if (!avgPrice) return false;

        // Arbitrage Logic: Price is X% below average
        const thresholdPrice = avgPrice * (1 - (arbitrageThreshold / 100));
        
        return itemPriceSqm <= thresholdPrice;
      } catch (err) {
        return false;
      }
    });

    console.log(`Found ${deals.length} deals.`);
    setArbitrageData(deals);

  }, [cadastralData, h3Data, h3Resolution, arbitrageThreshold, setArbitrageData, scopeToIsochrones, isochroneLayers]);

  const generateReport = useCallback(() => {
    if (h3Data.length === 0 || isochroneLayers.length === 0) {
      alert("Please ensure you have both H3 Price Grid and Isochrones loaded.");
      return;
    }

    console.log("Generating Market Report...");

    // 1. Map each H3 cell to its minimum travel time
    const cellMinTime = new Map<string, number>();
    
    // We must recalculate the cells for each isochrone using the CURRENT h3Resolution.
    // The stored layer.h3Cells might be at a different resolution (e.g. 9) or might have coordinate issues.
    isochroneLayers.forEach(layer => {
      const geojson = layer.geojson;
      if (!geojson || !geojson.geometry) return;

      const type = geojson.geometry.type;
      const coords = geojson.geometry.coordinates;
      
      const distinctPolygons: number[][][] = []; // Array of outer rings

      if (type === 'Polygon') {
        if (coords.length > 0) distinctPolygons.push(coords[0] as unknown as number[][]);
      } else if (type === 'MultiPolygon') {
        (coords as unknown as number[][][][]).forEach(poly => {
          if (poly.length > 0) distinctPolygons.push(poly[0]);
        });
      }

      distinctPolygons.forEach(ring => {
        try {
          // IMPORTANT: passing true for isGeoJson because DeckGL/Mapbox uses [lng, lat]
          // and we want to match the resolution used for the price grid.
          const cells = polygonToCells(ring, h3Resolution, true);
          
          cells.forEach(hex => {
             const currentMin = cellMinTime.get(hex);
             if (currentMin === undefined || layer.travelTime < currentMin) {
               cellMinTime.set(hex, layer.travelTime);
             }
          });
        } catch (e) {
          console.warn("Error processing isochrone geometry for H3", e);
        }
      });
    });

    // 2. bucket the data
    // We want discrete buckets inferred from the available isochrone times
    // e.g. [15, 30, 45, 60] -> Buckets: "0-15", "15-30", "30-45", "45-60", "60+" (if any)
    
    const uniqueTimes = Array.from(new Set(isochroneLayers.map(l => l.travelTime))).sort((a,b) => a-b);
    
    // Create buckets
    const buckets: Record<string, { total: number; count: number; min: number; max: number }> = {};
    
    // Helper to get bucket label
    const getBucket = (time: number) => {
      // Find the specific time in uniqueTimes
      const idx = uniqueTimes.indexOf(time);
      if (idx === 0) return `0 - ${time} min`;
      return `${uniqueTimes[idx-1]} - ${time} min`;
    };

    h3Data.forEach(cell => {
      const time = cellMinTime.get(cell.hex);
      if (time !== undefined) {
        const bucketName = getBucket(time);
        
        if (!buckets[bucketName]) {
          buckets[bucketName] = { total: 0, count: 0, min: Infinity, max: -Infinity };
        }
        
        const price = cell.averagePricePerSqm;
        if (price > 0) {
            buckets[bucketName].total += price;
            buckets[bucketName].count += 1;
            buckets[bucketName].min = Math.min(buckets[bucketName].min, price);
            buckets[bucketName].max = Math.max(buckets[bucketName].max, price);
        }
      }
    });

    // 3. Format results
    const report: CorrelationData[] = Object.entries(buckets).map(([range, stats]) => ({
      timeRange: range,
      avgPricePerSqm: Math.round(stats.total / stats.count),
      cellCount: stats.count,
      minPrice: stats.min,
      maxPrice: stats.max
    }));

    // Sort report by time range (extract the first number for sorting)
    report.sort((a, b) => {
         const getStart = (s: string) => parseInt(s.split('-')[0].trim());
         return getStart(a.timeRange) - getStart(b.timeRange);
    });

    console.log("Report generated:", report);
    setReportData(report);

  }, [h3Data, isochroneLayers, setReportData]);

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

  const analyzeIsochroneIntersection = useCallback(() => {
    // Collect all visible isochrones
    const visibleIsochrones = isochroneLayers.filter(l => l.isVisible);
    if (visibleIsochrones.length === 0) return [];
    
    // Collect all visible cadastral data
    // Prefer layers if available, fallback to legacy data.
    const activeCadastralData = cadastralLayers && cadastralLayers.length > 0
        ? cadastralLayers.filter(l => l.isVisible).flatMap(l => l.data)
        : cadastralData;
    
    const features: any[] = visibleIsochrones.map(l => ({
        ...l.geojson,
        properties: { ...l.geojson.properties, type: 'isochrone_zone', source: l.id }
    }));
    
    // Perform intersection
    if (activeCadastralData.length > 0) {
        visibleIsochrones.forEach(isoLayer => {
            // @ts-ignore
            const polygon = isoLayer.geojson;
            activeCadastralData.forEach(item => {
                if (!item.latitude || !item.longitude) return;
                const pt = point([item.longitude, item.latitude]);
                // @ts-ignore
                if (booleanPointInPolygon(pt, polygon)) {
                    features.push({
                        type: 'Feature',
                        geometry: pt.geometry,
                        properties: { ...item, type: 'cadastral_listing', source_isochrone: isoLayer.id }
                    });
                }
            });
        });
    }
    
    return features;
  }, [isochroneLayers, cadastralData]);

  return {
    aggregateH3,
    computeArbitrage,
    executeAnalysis,
    generateReport,
    isAnalyzing,
    analyzeIsochroneIntersection
  };
};
