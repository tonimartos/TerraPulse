import React from 'react';
import useStore, { TransportMode } from '../store/isochroneStore';
 import { Download, Bike, Car, Footprints, Trash2, Sparkles } from 'lucide-react';
import { downloadGeoJSON } from '../utils/exportUtils';

const IsochroneControl: React.FC = () => {
  const {
    layers,
    isSelecting,
    startSelection,
    stopSelection,
    toggleLayerVisibility,
    deleteLayer,
    currentTransportMode,
    setTransportMode,
    currentTravelTime,
    setTravelTime,
    poisInIsochrones,
    intersectionLayer,
    calculateMeetingPoint,
    clearMeetingPoint
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
    <div className="relative w-full p-4 font-sans text-gray-100">
      <h2 className="text-xl font-bold mb-4 text-white">Isochrone Analysis</h2>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-400 mb-2">Transport Mode</label>
        <div className="grid grid-cols-3 gap-2">
          {transportModes.map((mode) => (
            <button
              key={mode.id}
              onClick={() => setTransportMode(mode.id)}
              className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-all ${
                currentTransportMode === mode.id
                  ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-900/20'
                  : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700 hover:text-gray-200 hover:border-gray-600'
              }`}
            >
              {mode.icon}
              <span className="text-xs mt-1 font-medium">{mode.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="mb-6">
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

      <div className="mb-6">
        <button
          onClick={() => isSelecting ? stopSelection() : startSelection()}
          className={`w-full py-3 px-4 rounded-lg font-medium transition-all shadow-sm flex items-center justify-center gap-2 ${
            isSelecting
              ? 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100'
              : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200/50'
          }`}
        >
          {isSelecting ? 'Cancel Selection' : 'Add New Isochrone'}
        </button>
        {isSelecting && (
          <p className="text-xs text-center text-gray-500 mt-2 animate-pulse">
            Click anywhere on the map to generate an isochrone
          </p>
        )}
      </div>

       {/* Meeting Point Tool - Integrated into flow */}
      {intersectionLayer && (
        <div className="bg-purple-900/30 p-3 rounded-lg border border-purple-800 mb-6 animate-fade-in relative shadow-inner shadow-purple-900/20">
          <button 
            onClick={clearMeetingPoint}
            className="absolute top-2 right-2 text-purple-400 hover:text-purple-200 hover:bg-purple-800/50 p-1 rounded transition"
            title="Clear Meeting Point"
          >
           <Trash2 size={14} />
          </button>
          <div className="flex items-center gap-2 text-purple-200 font-medium mb-1">
            <Sparkles size={16} className="text-purple-400" />
            <h3>Meeting Point Active</h3>
          </div>
          <p className="text-xs text-purple-300/80">
            Showing common area reachable by all selected layers.
          </p>
        </div>
      )}

      <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-1">
        <div className="flex justify-between items-center sticky top-0 bg-gray-900 pb-2 border-b border-gray-800 z-10">
          <h3 className="text-sm font-semibold text-gray-300">Active Layers ({layers.length})</h3>
           {layers.length > 1 && !intersectionLayer && (
            <button
               onClick={calculateMeetingPoint}
               className="text-xs flex items-center gap-1 text-purple-400 hover:text-purple-300 bg-purple-900/40 px-2 py-1 rounded-md transition border border-purple-700/50 hover:border-purple-500"
               title="Find Common Ground"
             >
               <Sparkles size={12} />
               Find Meeting Point
             </button>
          )}
        </div>
        
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
      <div className="flex gap-2 mb-4">
        {layers.length > 0 && (
          <button
            onClick={handleExport}
            className="flex-1 flex items-center justify-center gap-2 p-2 bg-gray-800 border border-gray-700 text-gray-300 rounded-lg text-sm hover:bg-gray-700 hover:text-white transition"
          >
            <Download size={14} />
            Export Isochrones
          </button>
        )}
        {poisInIsochrones.length > 0 && (
           <button
             onClick={handleExportPois}
             className="flex-1 flex items-center justify-center gap-2 p-2 bg-gray-800 border border-gray-700 text-gray-300 rounded-lg text-sm hover:bg-gray-700 hover:text-white transition"
           >
             <Download size={14} />
             Export POIs
           </button>
        )}
      </div>
    </div>
  );
};

export default IsochroneControl;
