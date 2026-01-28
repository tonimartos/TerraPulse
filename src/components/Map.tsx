import React, { useState } from 'react';
import DeckGL from '@deck.gl/react';
import { Map } from 'react-map-gl';
import { GeoJsonLayer, H3HexagonLayer, IconLayer, ScatterplotLayer } from 'deck.gl';
import { Feature } from 'geojson';
import useStore from '../store/isochroneStore';
import useCadastralStore from '../store/cadastralStore';
import useAnalysisStore from '../store/analysisStore';
import 'mapbox-gl/dist/mapbox-gl.css';
import PoiControl from './PoiControl';

const MAPBOX_ACCESS_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

const INITIAL_VIEW_STATE = {
  longitude: 4.8357,
  latitude: 45.7640,
  zoom: 12,
  pitch: 45,
  bearing: 0,
};

const MapComponent: React.FC = () => {
  const {
    layers,
    isSelecting,
    addLayer,
    stopSelection,
    poiData,
    showPublicTransport,
    showBikeParking,
    setSelectedPoi,
    selectedPoi,
  } = useStore();
  const { cadastralData, isVisible: isCadastralVisible } = useCadastralStore();
  const { analysisResults } = useAnalysisStore();
  const [tooltip, setTooltip] = useState<any>(null);

  const deckLayers: any[] = layers
    .filter((layer) => layer.isVisible)
    .map((layer) => [
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
        data: layer.h3Cells.map(h3 => ({ hexagon: h3 })),
        getHexagon: (d: any) => d.hexagon,
        filled: true,
        stroked: false,
        getFillColor: [255, 255, 0, 100], // Semi-transparent yellow
      }),
    ])
    .flat();

  if (poiData) {
    const publicTransportData = showPublicTransport
      ? poiData.features.filter(
          (f) =>
            f.properties?.public_transport === 'station' ||
            f.properties?.public_transport === 'platform' ||
            f.properties?.highway === 'bus_stop'
        )
      : [];

    const bikeParkingData = showBikeParking
      ? poiData.features.filter((f) => f.properties?.amenity === 'bicycle_parking')
      : [];

    if (publicTransportData.length > 0) {
      deckLayers.push(
        new IconLayer({
          id: 'public-transport-layer',
          data: publicTransportData,
          iconAtlas: '/train.svg',
          iconMapping: {
            marker: { x: 0, y: 0, width: 128, height: 128, mask: true },
          },
          getIcon: () => 'marker',
          sizeScale: 15,
          getPosition: (d: Feature<GeoJSON.Point>) => d.geometry.coordinates,
          getSize: 5,
          getColor: [255, 140, 0],
          pickable: true,
          onClick: ({ object }) => setSelectedPoi(object),
          onHover: (info) => setTooltip(info),
        })
      );
    }

    if (bikeParkingData.length > 0) {
      deckLayers.push(
        new IconLayer({
          id: 'bike-parking-layer',
          data: bikeParkingData,
          iconAtlas: '/bike.svg',
          iconMapping: {
            marker: { x: 0, y: 0, width: 128, height: 128, mask: true },
          },
          getIcon: () => 'marker',
          sizeScale: 15,
          getPosition: (d: Feature<GeoJSON.Point>) => d.geometry.coordinates,
          getSize: 5,
          getColor: [0, 128, 255],
          pickable: true,
          onClick: ({ object }) => setSelectedPoi(object),
          onHover: (info) => setTooltip(info),
        })
      );
    }
  }

  if (isCadastralVisible && cadastralData.length > 0) {
    // Separate points and polygons
    const points = cadastralData.filter(d => d.geometry?.type === 'Point' || (!d.geometry && d.latitude));
    const polygons = cadastralData.filter(d => d.geometry?.type === 'Polygon' || d.geometry?.type === 'MultiPolygon');

    if (points.length > 0) {
      deckLayers.push(
        new ScatterplotLayer({
          id: 'cadastral-points-layer',
          data: points,
          getPosition: (d: any) => [d.longitude || d.geometry.coordinates[0], d.latitude || d.geometry.coordinates[1]],
          getFillColor: [220, 20, 60, 200], // Crimson color
          getRadius: 20,
          radiusMinPixels: 3,
          pickable: true,
          onHover: (info) => setTooltip(info),
        })
      );
    }

    if (polygons.length > 0) {
      deckLayers.push(
        new GeoJsonLayer({
          id: 'cadastral-polygons-layer',
          data: polygons.map(p => ({
            type: 'Feature',
            geometry: p.geometry,
            properties: p
          })),
          filled: true,
          stroked: true,
          getFillColor: [220, 20, 60, 100],
          getLineColor: [220, 20, 60, 255],
          getLineWidth: 1,
          lineWidthMinPixels: 1,
          pickable: true,
          onHover: (info) => setTooltip(info),
          onClick: ({ object }) => {
             // Optional: handle click on polygon
             console.log('Clicked polygon:', object);
          }
        })
      );
    }
  }

  const { isH3Visible, h3Data } = useCadastralStore();
  
  if (isH3Visible) {
     if (analysisResults.length > 0) {
       // RENDER ANALYSIS RESULTS
       // Lower score is better.
       // We can use a divergent scale: Green (Best) -> Yellow -> Red/Grey (Worst)
       
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
               // Invert score for alpha? or just color scale.
               // Green (0, 255, 0) for close to 0
               // Red (255, 0, 0) for close to 1
               
               // Simple interpolation
               const r = Math.floor(s * 255);
               const g = Math.floor((1 - s) * 255);
               
               // Alpha: Make "bad" spots more transparent to focus on sweet spots
               const alpha = Math.floor((1 - s) * 200) + 55;
               
               return [r, g, 0, alpha]; 
            },
            getLineColor: [255, 255, 255],
            lineWidthMinPixels: 1,
            onHover: (info) => setTooltip(info),
            updateTriggers: {
              getFillColor: [analysisResults]
            }
         })
       );

     } else if (h3Data.length > 0) {
       // RENDER RAW PRICE GRID (Fallback)
       const prices = h3Data.map(d => d.averagePricePerSqm).sort((a, b) => a - b);
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
            onHover: (info) => setTooltip(info)
         })
       );
     }
  }

  const handleMapClick = (info: any) => {
    if (isSelecting && info.coordinate) {
      addLayer(info.coordinate);
      stopSelection();
    }
  };

  const renderTooltip = () => {
    if (!tooltip || !tooltip.object) {
      return null;
    }
    const { x, y, object } = tooltip;

    if (object && object.totalScore !== undefined) {
      return (
        <div style={{ position: 'absolute', left: x, top: y, background: 'rgba(0,0,0,0.9)', color: 'white', padding: '10px', zIndex: 99, pointerEvents: 'none', borderRadius: '4px' }}>
          <div className="text-green-400 font-bold">Sweet Spot Score: {(object.totalScore * 100).toFixed(0)}</div>
          <div className="text-xs text-gray-300">Lower is better</div>
          <hr className="border-gray-600 my-1"/>
          <div>Price: {object.averagePricePerSqm.toLocaleString()} €/m²</div>
          <div>Time: {object.timeMinutes} min</div>
        </div>
      );
    }

    if (object && object.averagePricePerSqm) {
      return (
        <div style={{ position: 'absolute', left: x, top: y, background: 'rgba(0,0,0,0.8)', color: 'white', padding: '10px', zIndex: 99, pointerEvents: 'none', borderRadius: '4px' }}>
          <div><strong>Price/m² Analysis</strong></div>
          <div>Avg: {object.averagePricePerSqm.toLocaleString()} €/m²</div>
          <div className="text-gray-400 text-xs">Total Sales: {object.count}</div>
          <div className="text-gray-400 text-xs">Raw Avg: {object.averagePrice.toLocaleString()} €</div>
        </div>
      );
    }
    
    // Handle Cadastral Data
    if (object.valeur_fonciere !== undefined) {
      return (
        <div style={{ position: 'absolute', left: x + 10, top: y + 10, background: 'rgba(0,0,0,0.8)', color: 'white', padding: '10px', borderRadius: '4px', zIndex: 10, pointerEvents: 'none' }}>
           <div className="font-bold mb-1">{object.type_local || 'Propriété'}</div>
           <div>Prix: {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(object.valeur_fonciere)}</div>
           <div>Date: {object.date_mutation}</div>
           <div>Surface: {object.surface_reelle_bati} m²</div>
           {object.code_commune && <div>Commune: {object.code_commune}</div>}
        </div>
      );
    }
    
    // Default GeoJSON properties
    const properties = object.properties || object;

    return (
      <div style={{ position: 'absolute', left: x, top: y, background: 'white', padding: '5px', zIndex: 1, pointerEvents: 'none' }}>
        {Object.entries(properties).slice(0, 10).map(([key, value]) => (
          <div key={key}>
            <strong>{key}:</strong> {String(value)}
          </div>
        ))}
      </div>
    );
  };

  return (
    <DeckGL
      initialViewState={INITIAL_VIEW_STATE}
      controller={true}
      layers={deckLayers}
      onClick={handleMapClick}
      getCursor={({ isDragging }: any) => (isDragging ? 'grabbing' : isSelecting ? 'crosshair' : 'grab')}
    >
      <Map mapStyle="mapbox://styles/mapbox/dark-v11" mapboxAccessToken={MAPBOX_ACCESS_TOKEN} />
      <PoiControl />
      {renderTooltip()}
      {selectedPoi && (
        <div
          style={{
            position: 'absolute',
            bottom: '20px',
            left: '20px',
            background: 'rgba(0, 0, 0, 0.7)',
            color: 'white',
            padding: '15px',
            borderRadius: '5px',
            width: '300px',
            zIndex: 2,
          }}
        >
          <button
            onClick={() => setSelectedPoi(null)}
            style={{
              position: 'absolute',
              top: '5px',
              right: '5px',
              background: 'transparent',
              border: 'none',
              color: 'white',
              fontSize: '16px',
            }}
          >
            &times;
          </button>
          <h3 style={{ margin: '0 0 10px 0' }}>Selected POI</h3>
          {Object.entries(selectedPoi.properties || {}).map(([key, value]) => (
            <div key={key}>
              <strong>{key}:</strong> {String(value)}
            </div>
          ))}
        </div>
      )}
    </DeckGL>
  );
};

export default MapComponent;
