import { useMemo } from 'react';
import { GeoJsonLayer, H3HexagonLayer, IconLayer, ScatterplotLayer } from 'deck.gl';
import { Feature } from 'geojson';
import useIsochroneStore from '../store/isochroneStore';
import useCadastralStore from '../store/cadastralStore';
import useAnalysisStore from '../store/analysisStore';

interface UseMapLayersProps {
  setTooltip: (info: any) => void;
}

export const useMapLayers = ({ setTooltip }: UseMapLayersProps) => {
  // Isochrone Store
  const {
    layers,
    poiData,
    showPublicTransport,
    showRail,
    showBus,
    showBikeParking,
    setSelectedPoi,
  } = useIsochroneStore();

  // Cadastral Store
  const { 
    cadastralData, 
    isVisible: isCadastralVisible,
    isH3Visible,
    h3Data,
    arbitrageData,
    isArbitrageVisible
  } = useCadastralStore();

  // Analysis Store
  const { analysisResults } = useAnalysisStore();

  const mapLayers = useMemo(() => {
    const deckLayers: any[] = [];

    // 1. Isochrone Layers
    layers.forEach((layer) => {
      if (!layer.isVisible) return;
      
      deckLayers.push(
        new GeoJsonLayer({
          id: `${layer.id}-geojson`,
          data: layer.geojson,
          filled: true,
          stroked: true,
          getFillColor: layer.color,
          getLineColor: [0, 0, 0, 255],
          lineWidthMinPixels: 2,
          pickable: true,
        }),
        new H3HexagonLayer({
          id: `${layer.id}-h3`,
          data: layer.h3Cells.map((h3) => ({ hexagon: h3 })),
          getHexagon: (d: any) => d.hexagon,
          filled: true,
          stroked: false,
          getFillColor: [255, 255, 0, 100], // Semi-transparent yellow
        })
      );
    });

    // 2. POI Layers (Public Transport & Bike Parking)
    if (poiData && showPublicTransport) {
      // Rail POIs
      const isRail = (f: any) => {
          const p = f.properties || {};
          // New simplified format check
          if (p.type === 'rail') return true;
          // Legacy check
          return p.train === 'yes' || p.railway === 'station' || p.railway === 'halt' || p.public_transport === 'station';
      };

      const railData = showRail ? poiData.features.filter(isRail) : [];

      // Bus POIs
      const isBus = (f: any) => {
          const p = f.properties || {};
          if (isRail(f)) return false; 
          // New simplified format check
          if (p.type === 'bus') return true;
          // Legacy check
          return (p.bus === 'yes' || p.highway === 'bus_stop' || p.public_transport === 'stop_position');
      }

      const busData = showBus ? poiData.features.filter(isBus) : [];

      // Add Rail Layer
      if (railData.length > 0) {
        deckLayers.push(
          new IconLayer({
            id: 'public-transport-rail-layer',
            data: railData,
            iconAtlas: '/train.svg',
            iconMapping: {
              marker: { x: 0, y: 0, width: 24, height: 24, mask: true },
            },
            getIcon: () => 'marker',
            sizeScale: 15,
            getPosition: (d: Feature<GeoJSON.Point>) => (d.geometry as any).coordinates,
            getSize: 1.5,
            getColor: [230, 25, 75], // Red for rail
            pickable: true,
            onClick: ({ object }: { object: any }) => setSelectedPoi(object as Feature),
            onHover: (info: any) => setTooltip(info),
          })
        );
      }

      // Add Bus Layer
      if (busData.length > 0) {
        deckLayers.push(
          new IconLayer({
            id: 'public-transport-bus-layer',
            data: busData,
            iconAtlas: '/bus.svg',
            iconMapping: {
              marker: { x: 0, y: 0, width: 24, height: 24, mask: true },
            },
            getIcon: () => 'marker',
            sizeScale: 15,
            getPosition: (d: Feature<GeoJSON.Point>) => (d.geometry as any).coordinates,
            getSize: 1.5, // Slightly smaller than rail
            getColor: [60, 180, 75], // Green for bus
            pickable: true,
            onClick: ({ object }: { object: any }) => setSelectedPoi(object as Feature),
            onHover: (info: any) => setTooltip(info),
          })
        );
      }
    }

    // Bike Parking
    if (poiData && showBikeParking) {
      const bikeParkingData = poiData.features.filter((f) => f.properties?.amenity === 'bicycle_parking');

      if (bikeParkingData.length > 0) {
        deckLayers.push(
          new IconLayer({
            id: 'bike-parking-layer',
            data: bikeParkingData,
            iconAtlas: '/bike.svg',
            iconMapping: {
              marker: { x: 0, y: 0, width: 24, height: 24, mask: true },
            },
            getIcon: () => 'marker',
            sizeScale: 15,
            getPosition: (d: Feature<GeoJSON.Point>) => d.geometry.coordinates as [number, number],
            getSize: 5,
            getColor: [0, 130, 200], // Blue for bike
            pickable: true,
            onClick: ({ object }: { object: any }) => setSelectedPoi(object as Feature),
            onHover: (info: any) => setTooltip(info),
          })
        );
      }
    }

    // 3. Cadastral Data Layers
    if (isCadastralVisible && cadastralData.length > 0) {
      const points = cadastralData.filter(
        (d) => d.geometry?.type === 'Point' || (!d.geometry && d.latitude)
      );
      const polygons = cadastralData.filter(
        (d) => d.geometry?.type === 'Polygon' || d.geometry?.type === 'MultiPolygon'
      );

      if (points.length > 0) {
        deckLayers.push(
          new ScatterplotLayer({
            id: 'cadastral-points-layer',
            data: points,
            getPosition: (d: any) => [
              d.longitude || d.geometry.coordinates[0],
              d.latitude || d.geometry.coordinates[1],
            ],
            getFillColor: [220, 20, 60, 200], // Crimson color
            getRadius: 20,
            radiusMinPixels: 3,
            pickable: true,
            onHover: (info: any) => setTooltip(info),
          })
        );
      }

      if (polygons.length > 0) {
        deckLayers.push(
          new GeoJsonLayer({
            id: 'cadastral-polygons-layer',
            data: polygons.map((p) => ({
              type: 'Feature',
              geometry: p.geometry,
              properties: p,
            })),
            filled: true,
            stroked: true,
            getFillColor: [220, 20, 60, 100],
            getLineColor: [220, 20, 60, 255],
            getLineWidth: 1,
            lineWidthMinPixels: 1,
            pickable: true,
            onHover: (info: any) => setTooltip(info),
            onClick: ({ object }: { object: any }) => {
              console.log('Clicked polygon:', object);
            },
          })
        );
      }
    }

    // 4. Analysis Results Layer
    if (isH3Visible && analysisResults.length > 0) {
      deckLayers.push(
        new H3HexagonLayer({
          id: 'h3-analysis-layer',
          data: analysisResults,
          pickable: true,
          wireframe: false,
          filled: true,
          extruded: false,
          getHexagon: (d: any) => d.hex,
          getFillColor: (d: any) => {
            const s = d.totalScore; // 0 to 1
            const r = Math.floor(s * 255);
            const g = Math.floor((1 - s) * 255);
            // Alpha: Make "bad" spots more transparent
            const alpha = Math.floor((1 - s) * 200) + 55;
            return [r, g, 0, alpha];
          },
          getLineColor: [255, 255, 255],
          lineWidthMinPixels: 1,
          onHover: (info: any) => setTooltip(info),
          updateTriggers: {
             getFillColor: [analysisResults]
          }
        })
      );
    } else if (isH3Visible && h3Data.length > 0) {
       // RENDER RAW PRICE GRID (Fallback)
       const prices = h3Data.map((d: any) => d.averagePricePerSqm).sort((a: number, b: number) => a - b);
       const getQuantile = (q: number) => prices[Math.floor((prices.length - 1) * q)];
       
       const q20 = getQuantile(0.20);
       const q40 = getQuantile(0.40);
       const q60 = getQuantile(0.60);
       const q80 = getQuantile(0.80);

       deckLayers.push(
         new H3HexagonLayer({
            id: 'h3-price-layer',
            data: h3Data,
            pickable: true,
            wireframe: false,
            filled: true,
            extruded: false,
            getHexagon: (d: any) => d.hex,
            getFillColor: (d: any) => {
               const p = d.averagePricePerSqm;
               // Cool to Warm scale
               if (p < q20) return [44, 123, 182, 150]; // Deep Blue
               if (p < q40) return [171, 217, 233, 150]; // Light Blue
               if (p < q60) return [255, 255, 191, 150]; // Yellow
               if (p < q80) return [253, 174, 97, 150];  // Orange
               return [215, 25, 28, 150]; // Red
            },
            getLineColor: [255, 255, 255],
            lineWidthMinPixels: 1,
            onHover: (info: any) => setTooltip(info)
         })
       );
    }

    // 5. Arbitrage Layer (Deals) - Rendered LAST to be on top
    if (isArbitrageVisible && arbitrageData.length > 0) {
      deckLayers.push(
        new ScatterplotLayer({
          id: 'arbitrage-points-layer',
          data: arbitrageData,
          getPosition: (d: any) => [
            d.longitude || d.geometry.coordinates[0],
            d.latitude || d.geometry.coordinates[1],
          ],
          getFillColor: [0, 255, 0, 255], // Bright Green
          getRadius: 30,
          radiusMinPixels: 4,
          stroked: true,
          getLineColor: [0, 0, 0],
          getLineWidth: 2,
          pickable: true,
          onHover: (info: any) => setTooltip(info),
        })
      );
    }

    return deckLayers;
  }, [
    layers,
    poiData,
    showPublicTransport,
    showRail,
    showBus,
    showBikeParking,
    setSelectedPoi,
    cadastralData,
    isCadastralVisible,
    isH3Visible,
    analysisResults,
    h3Data, // Added dependency
    arbitrageData,
    isArbitrageVisible,
    setTooltip,
    showRail, 
    showBus,
  ]);

  return mapLayers;
};

export default useMapLayers;
