import React, { useState } from 'react';
import DeckGL from '@deck.gl/react';
import { Map } from 'react-map-gl';
import useIsochroneStore from '../store/isochroneStore';
import 'mapbox-gl/dist/mapbox-gl.css';
import PoiControl from './PoiControl';
import useMapLayers from '../hooks/useMapLayers';

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
    isSelecting,
    addLayer,
    stopSelection,
    setSelectedPoi,
    selectedPoi,
  } = useIsochroneStore();
  
  const [tooltip, setTooltip] = useState<any>(null);

  const deckLayers = useMapLayers({ setTooltip });

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

    // Handle Analysis Results
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

    // Handle H3 Price Data
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
    
    // Handle Arbitrage / Deals specifically
    if (object.valeur_fonciere !== undefined) {
      return (
        <div style={{ position: 'absolute', left: x + 10, top: y + 10, background: 'rgba(0,0,0,0.9)', color: 'white', padding: '10px', borderRadius: '4px', zIndex: 10, pointerEvents: 'none', border: '1px solid #444' }}>
           <div className="font-bold mb-1 flex justify-between">
              <span>{object.type_local || 'Propriété'}</span>
           </div>
           <div>Prix: {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(object.valeur_fonciere)}</div>
           <div>Date: {object.date_mutation}</div>
           <div>Surface: {object.surface_reelle_bati} m²</div>
           {object.surface_build > 0 && (
             <div className="text-yellow-400 font-bold">
               {(object.valeur_fonciere / object.surface_build).toFixed(0)} €/m²
             </div>
           )}
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
