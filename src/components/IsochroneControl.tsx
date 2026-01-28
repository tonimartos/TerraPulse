import React from 'react';
import useStore, { TransportMode } from '../store/isochroneStore';
import { Download, Bike, Car, Footprints, Trash2, MapPin } from 'lucide-react';
import { downloadGeoJSON } from '../utils/exportUtils';

const IsochroneControl: React.FC = () => {
  const {
    layers,
    isSelecting,
    startSelection,
    toggleLayerVisibility,
    deleteLayer,
    currentTransportMode,
    setTransportMode,
    currentTravelTime,
    setTravelTime,
    poisInIsochrones,
  } = useStore();

  const transportModes: { id: TransportMode; label: string; icon: React.ReactNode }[] = [
    { id: 'walk', label: 'Walk', icon: <Footprints size={16} /> },
    { id: 'bike', label: 'Bike', icon: <Bike size={16} /> },
    { id: 'car', label: 'Car', icon: <Car size={16} /> },
  ];

  const handleExport = () => {
    const visibleLayers = layers.filter((layer) => layer.isVisible);
    if (visibleLayers.length === 0) {
      alert('No layers are selected for export.');
      return;
    }

    const features: any[] = visibleLayers.map((layer) => {
      return {
        ...layer.geojson,
        properties: {
          ...layer.geojson.properties,
          id: layer.id,
          label: layer.label,
          transportMode: layer.transportMode,
          travelTime: layer.travelTime,
        },
      };
    });

    downloadGeoJSON(features, 'isochrones.geojson');
  };
  
  const handleExportPois = () => {
    if (poisInIsochrones.length === 0) {
      alert('No POIs are contained in the selected isochrones.');
      return;
    }

    // @ts-ignore
    downloadGeoJSON(poisInIsochrones, 'contained-pois.geojson');
  };


  return (
    <div className="space-y-6 p-4">
      {/* Configuration Section */}
      <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
        <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-4 flex items-center gap-2">
           <MapPin size={16} /> New Isochrone
        </h2>
        
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            {transportModes.map((mode) => (
              <button
                key={mode.id}
                onClick={() => setTransportMode(mode.id)}
                className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-all ${
                  currentTransportMode === mode.id
                    ? 'bg-blue-600 border-blue-500 text-white shadow-lg'
                    : 'bg-gray-700/50 border-gray-600 text-gray-400 hover:bg-gray-700 hover:text-gray-200'
                }`}
              >
                {mode.icon}
                <span className="text-xs mt-1 font-medium">{mode.label}</span>
              </button>
            ))}
          </div>

          <div>
            <label className="flex justify-between text-xs text-gray-400 mb-2">
                <span>Travel Time</span>
                <span className="text-white font-mono">{currentTravelTime} min</span>
            </label>
            <input
              type="range"
              min="5"
              max="60"
              step="5"
              value={currentTravelTime}
              onChange={(e) => setTravelTime(Number(e.target.value))}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-gray-500 mt-1">
                <span>5m</span>
                <span>30m</span>
                <span>60m</span>
            </div>
          </div>

          <button
            onClick={startSelection}
            disabled={isSelecting}
            className={`w-full py-3 px-4 rounded-lg font-bold text-sm transition-all shadow-lg flex items-center justify-center gap-2 ${
                isSelecting 
                    ? 'bg-orange-500 animate-pulse cursor-crosshair' 
                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500'
            }`}
          >
            {isSelecting ? (
                <>Click Map Location...</>
            ) : (
                <>Generate Areas</>
            )}
          </button>
        </div>
      </div>

      {/* Layers List */}
      <div>
        <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-3 flex items-center justify-between">
            <span>Layers ({layers.length})</span>
            {layers.length > 0 && (
                 <button onClick={handleExport} className="text-blue-400 hover:text-blue-300" title="Export GeoJSON">
                     <Download size={14} />
                 </button>
            )}
        </h2>
        
        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
          {layers.length === 0 && (
             <div className="text-center py-6 text-gray-500 border border-dashed border-gray-700 rounded-lg text-xs">
                 No areas generated yet.
             </div>
          )}
          
          {layers.map((layer) => (
            <div
              key={layer.id}
              className="flex items-center justify-between p-3 bg-gray-800 rounded-lg border border-gray-700 group hover:border-gray-500 transition-colors"
            >
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={layer.isVisible}
                  onChange={() => toggleLayerVisibility(layer.id)}
                  className="rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-offset-gray-900"
                />
                <div className="flex flex-col">
                    <span className="text-sm font-medium text-gray-200">{layer.label}</span>
                    <span className="text-[10px] text-gray-500 uppercase">{layer.transportMode}</span>
                </div>
              </div>
              <button
                onClick={() => deleteLayer(layer.id)}
                className="text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                title="Remove"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>
      
      {/* POI Export */}
      {poisInIsochrones.length > 0 && (
        <div className="pt-4 border-t border-gray-700">
           <button 
              onClick={handleExportPois}
              className="w-full py-2 px-3 bg-gray-700 hover:bg-gray-600 rounded text-xs text-gray-300 flex items-center justify-center gap-2"
           >
               <Download size={12} /> Export {poisInIsochrones.length} POIs
           </button>
        </div>
      )}
    </div>
  );
};

export default IsochroneControl;
