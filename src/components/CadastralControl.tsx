import React, { useState } from 'react';
import { parseCadastralCSV, parseLocalCadastralCSV, fetchCadastralGeoJSON, parseLocalCadastralGeoJSON } from '../api/cadastralService';
import useCadastralStore from '../store/cadastralStore';
import { useCadastralTools } from '../hooks/useCadastralTools';
import { ChevronDown, ChevronRight, Database, Grid, Layers } from 'lucide-react';

interface SourceFile {
  name: string;
  path: string;
  type: 'server' | 'local';
  fileObject?: File;
}

const CadastralControl = () => {
  const [availableRemoteFiles] = useState<SourceFile[]>([
    { name: 'Swiss Listings (Vaud)', path: '/cadastral/vaud-listing-31012026.geojson', type: 'server' },
    { name: 'Mutations Lyon 2024 (Polygons)', path: '/cadastral/lyon_city_polygons.geojson', type: 'server' },
    { name: 'Mutations Lyon 2024 (Points)', path: '/cadastral/lyon_mutations.geojson', type: 'server' }
  ]);
  
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [localFiles, setLocalFiles] = useState<SourceFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedSection, setExpandedSection] = useState<'import' | 'grid' | 'layers' | null>('import');

  const { 
    cadastralData, 
    // setCadastralData, remove unused
    h3Resolution, 
    setH3Resolution, 
    h3Data, 
    isH3Visible, 
    toggleH3Visibility,
    layers,
    addLayer,
    removeLayer,
    toggleLayerVisibility
  } = useCadastralStore();
  const { aggregateH3 } = useCadastralTools();

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const newFiles: SourceFile[] = Array.from(event.target.files).map(file => ({
        name: file.name,
        path: file.name, // Just for keying
        type: 'local',
        fileObject: file
      }));
      setLocalFiles(prev => [...prev, ...newFiles]);
    }
  };

  const toggleFileSelection = (path: string) => {
    setSelectedFiles(prev => {
      const newSet = new Set(prev);
      if (newSet.has(path)) {
        newSet.delete(path);
      } else {
        newSet.add(path);
      }
      return newSet;
    });
  };

  const handleLoadInMap = async () => {
    setIsLoading(true);
    try {
      console.log('Starting load process...');
      
      const allFiles = [...availableRemoteFiles, ...localFiles];
      const filesToProcess = allFiles.filter(f => selectedFiles.has(f.path));

      for (const file of filesToProcess) {
        console.log(`Processing ${file.name}...`);
        let data: any[] = [];

        if (file.type === 'server') {
          if (file.path.endsWith('.geojson')) {
             data = await fetchCadastralGeoJSON(file.path);
          } else {
             data = await parseCadastralCSV(file.path);
          }
        } else if (file.type === 'local' && file.fileObject) {
           if (file.name.endsWith('.geojson') || file.name.endsWith('.json')) {
              data = await parseLocalCadastralGeoJSON(file.fileObject);
           } else {
              data = await parseLocalCadastralCSV(file.fileObject);
           }
        }

        console.log(`Parsed ${data.length} rows from ${file.name}`);

        // We load whatever data we parsed.
        // Removed hardcoded filtering for Department 69 to allow generic data loading (e.g. Swiss listings).
        
        if (data.length > 0) {
          console.log('Sample entry:', data[0]);
          // OLD: setCadastralData(data);
          
          // NEW: Add as a distinct layer
          addLayer({
            id: `layer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name: file.name,
            data: data,
            isVisible: true
          });
          
        } else {
          console.warn('No data found in this file.');
        }

        // TODO: Store or map this data. For now, we stop here as requested.
        console.log('Analysis pending for:', file.name);
      }
      
      // Auto-switch to grid view or grid generation step?
      if (expandedSection === 'import') setExpandedSection('grid');

    } catch (error) {
      console.error('Error loading cadastral data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAggregateH3 = () => {
    if (h3Data.length > 0) {
      toggleH3Visibility();
    } else {
      aggregateH3();
    }
  };

  const toggleSection = (section: 'import' | 'grid' | 'layers') => {
      setExpandedSection(expandedSection === section ? null : section);
  };

  return (
    <div className="p-4 text-white space-y-4">
      <h3 className="text-lg font-bold mb-4">Data Layers</h3>
      
      {/* SECTION 1: IMPORT DATA */}
      <div className="border border-gray-700 rounded-lg overflow-hidden bg-gray-800/50">
        <button 
          onClick={() => toggleSection('import')}
          className="w-full flex items-center justify-between p-3 bg-gray-800 hover:bg-gray-700 transition"
        >
           <div className="flex items-center gap-2 font-semibold text-sm">
              <Database size={16} className="text-blue-400" /> Source Data
           </div>
           {expandedSection === 'import' ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>

        {expandedSection === 'import' && (
          <div className="p-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
             <div className="p-3 bg-gray-900/50 rounded border border-gray-700">
                <h4 className="text-xs font-semibold mb-2 text-gray-400 uppercase">Import Local File</h4>
                <input
                  type="file"
                  accept=".csv,.geojson,.json"
                  multiple
                  onChange={handleFileImport}
                  className="block w-full text-xs text-gray-400 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700"
                />
             </div>

             <div>
                <h4 className="text-xs font-semibold mb-2 text-gray-400 uppercase">Select Sources</h4>
                <div className="space-y-1">
                  {[...availableRemoteFiles, ...localFiles].map(file => (
                    <label key={file.path} className="flex items-center p-2 rounded hover:bg-gray-700 cursor-pointer">
                      <input
                        type="checkbox"
                        className="rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-offset-gray-900"
                        checked={selectedFiles.has(file.path)}
                        onChange={() => toggleFileSelection(file.path)}
                      />
                      <span className="ml-2 text-sm text-gray-300 truncate">{file.name}</span>
                    </label>
                  ))}
                  {availableRemoteFiles.length === 0 && localFiles.length === 0 && (
                    <p className="text-xs text-gray-500 italic">No sources available.</p>
                  )}
                </div>
             </div>

             <button
                onClick={handleLoadInMap}
                disabled={isLoading || selectedFiles.size === 0}
                className={`w-full py-2 px-4 rounded font-bold text-sm transition-colors ${
                  isLoading || selectedFiles.size === 0
                    ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg'
                }`}
              >
                {isLoading ? 'Processing...' : 'Load Data'}
              </button>
          </div>
        )}
      </div>

      {/* SECTION 2: H3 GRID GENERATION */}
      <div className="border border-gray-700 rounded-lg overflow-hidden bg-gray-800/50">
        <button 
          onClick={() => toggleSection('grid')}
          className="w-full flex items-center justify-between p-3 bg-gray-800 hover:bg-gray-700 transition"
        >
           <div className="flex items-center gap-2 font-semibold text-sm">
              <Grid size={16} className="text-purple-400" /> 
              <span>Price Grid</span>
              {h3Data.length > 0 && <span className="text-[10px] bg-green-900 text-green-300 px-1 rounded">Ready</span>}
           </div>
           {expandedSection === 'grid' ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>

        {expandedSection === 'grid' && (
          <div className="p-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
             <div className="mb-4">
               <label className="block text-xs font-medium text-gray-400 mb-1">
                 Resolution: {h3Resolution}
               </label>
               <input
                 type="range"
                 min="7"
                 max="11"
                 value={h3Resolution}
                 onChange={(e) => setH3Resolution(parseInt(e.target.value))}
                 className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
               />
               <div className="flex justify-between text-[10px] text-gray-500 mt-1">
                   <span>Coarse (7)</span>
                   <span>Detailed (11)</span>
               </div>
             </div>
             
             <button
               onClick={handleAggregateH3}
               disabled={cadastralData.length === 0}
               className={`w-full font-bold py-2 px-4 rounded text-sm ${
                 cadastralData.length > 0 
                   ? (h3Data.length > 0 && !isH3Visible ? 'bg-gray-600 hover:bg-gray-700 text-white' : 'bg-purple-600 hover:bg-purple-700 text-white')
                   : 'bg-gray-700 text-gray-500 cursor-not-allowed'
               }`}
             >
               {h3Data.length > 0 
                 ? (isH3Visible ? 'Hide Grid' : 'Show Grid') 
                 : 'Compute Grid'}
             </button>

             {h3Data.length > 0 && (
               <div className="text-center text-xs text-gray-400">
                  {h3Data.length.toLocaleString()} cells generated
               </div>
             )}
          </div>
        )}
      </div>

       {/* SECTION 3: LAYERS (Placeholder for future managing of multiple layers) */}
       <div className="border border-gray-700 rounded-lg overflow-hidden bg-gray-800/50">
        <button 
          onClick={() => toggleSection('layers')}
          className="w-full flex items-center justify-between p-3 bg-gray-800 hover:bg-gray-700 transition"
        >
           <div className="flex items-center gap-2 font-semibold text-sm">
              <Layers size={16} className="text-gray-400" /> Active Layers
           </div>
           {expandedSection === 'layers' ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>
        
        {expandedSection === 'layers' && (
             <div className="p-4 space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
               {layers.length === 0 ? (
                 <div className="text-xs text-gray-500 text-center">No layers imported yet.</div>
               ) : (
                 layers.map(layer => (
                   <div key={layer.id} className="flex items-center justify-between bg-gray-900/50 p-2 rounded border border-gray-700">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <input 
                          type="checkbox" 
                          checked={layer.isVisible}
                          onChange={() => toggleLayerVisibility(layer.id)}
                          className="rounded bg-gray-700 border-gray-600 text-blue-500 focus:ring-blue-500/20"
                        />
                        <span className="text-xs text-gray-300 truncate max-w-[150px]" title={layer.name}>
                          {layer.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-gray-500">
                        <span>{layer.data.length.toLocaleString()} items</span>
                        <button 
                          onClick={() => removeLayer(layer.id)}
                          className="text-gray-500 hover:text-red-400 p-1"
                        >
                          ✕
                        </button>
                      </div>
                   </div>
                 ))
               )}
             </div>
        )}
       </div>

    </div>
  );
};

export default CadastralControl;
