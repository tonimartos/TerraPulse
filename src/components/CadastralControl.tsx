import React, { useState } from 'react';
import { parseCadastralCSV, filterCadastralData, parseLocalCadastralCSV, fetchCadastralGeoJSON } from '../api/cadastralService';
import useCadastralStore from '../store/cadastralStore';

interface SourceFile {
  name: string;
  path: string;
  type: 'server' | 'local';
  fileObject?: File;
}

const CadastralControl = () => {
  const [availableRemoteFiles] = useState<SourceFile[]>([
    { name: 'Mutations Lyon 2024 (Polygons)', path: '/cadastral/lyon_city_polygons.geojson', type: 'server' },
    { name: 'Mutations Lyon 2024 (Points)', path: '/cadastral/lyon_mutations.geojson', type: 'server' }
  ]);
  
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [localFiles, setLocalFiles] = useState<SourceFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { setCadastralData } = useCadastralStore();

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
          data = await parseLocalCadastralCSV(file.fileObject);
        }

        console.log(`Parsed ${data.length} rows from ${file.name}`);

        // Specific logic for French Values Foncieres
        // Filter for Lyon (69)
        // GeoJSON from server is already filtered, but local CSV might need it.
        // We can just try to filter if code_departement exists.
        
        const lyonData = filterCadastralData(data, '69');
        console.log(`Filtered ${lyonData.length} entries for Lyon (Dept 69) from ${file.name}`);
        
        if (lyonData.length > 0) {
          console.log('Sample entry:', lyonData[0]);
          setCadastralData(lyonData);
        } else {
          console.warn('No data found for Dept 69 in this file.');
        }

        // TODO: Store or map this data. For now, we stop here as requested.
        console.log('Analysis pending for:', file.name);
      }

    } catch (error) {
      console.error('Error loading cadastral data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4 text-white">
      <h3 className="text-lg font-bold mb-4">Cadastral Data</h3>
      
      {/* Import Section */}
      <div className="mb-6 p-4 bg-gray-800 rounded-lg">
        <h4 className="text-sm font-semibold mb-2">Import Data</h4>
        <input
          type="file"
          accept=".csv,.geojson,.json"
          multiple
          onChange={handleFileImport}
          className="block w-full text-sm text-gray-400
            file:mr-4 file:py-2 file:px-4
            file:rounded-full file:border-0
            file:text-sm file:font-semibold
            file:bg-blue-600 file:text-white
            hover:file:bg-blue-700
          "
        />
        <p className="text-xs text-gray-500 mt-1">Supported: CSV, GEOJSON</p>
      </div>

      {/* Available Sources Section */}
      <div className="mb-6">
        <h4 className="text-sm font-semibold mb-2">Available Sources</h4>
        
        <div className="space-y-2">
          {/* Server Files */}
          {availableRemoteFiles.map(file => (
            <label key={file.path} className="flex items-center p-2 bg-gray-800 rounded hover:bg-gray-700 cursor-pointer">
              <input
                type="checkbox"
                className="form-checkbox h-5 w-5 text-blue-600 rounded"
                checked={selectedFiles.has(file.path)}
                onChange={() => toggleFileSelection(file.path)}
              />
              <div className="ml-3">
                <span className="block text-sm font-medium">{file.name}</span>
                <span className="block text-xs text-gray-500">Public Directory</span>
              </div>
            </label>
          ))}

          {/* Local Files */}
          {localFiles.map(file => (
            <label key={file.path} className="flex items-center p-2 bg-gray-800 rounded hover:bg-gray-700 cursor-pointer">
              <input
                type="checkbox"
                className="form-checkbox h-5 w-5 text-blue-600 rounded"
                checked={selectedFiles.has(file.path)}
                onChange={() => toggleFileSelection(file.path)}
              />
              <div className="ml-3">
                <span className="block text-sm font-medium">{file.name}</span>
                <span className="block text-xs text-gray-500">Local Import</span>
              </div>
            </label>
          ))}

          {availableRemoteFiles.length === 0 && localFiles.length === 0 && (
            <p className="text-sm text-gray-500 italic">No sources available.</p>
          )}
        </div>
      </div>

      <button
        onClick={handleLoadInMap}
        disabled={isLoading || selectedFiles.size === 0}
        className={`w-full py-2 px-4 rounded font-bold transition-colors ${
          isLoading || selectedFiles.size === 0
            ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
            : 'bg-blue-600 hover:bg-blue-700 text-white'
        }`}
      >
        {isLoading ? 'Processing...' : 'Load in map'}
      </button>
    </div>
  );
};

export default CadastralControl;
