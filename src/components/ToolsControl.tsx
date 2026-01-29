import React from 'react';
import useCadastralStore from '../store/cadastralStore';
import useIsochroneStore from '../store/isochroneStore';
import useAnalysisStore from '../store/analysisStore';
import { useCadastralTools } from '../hooks/useCadastralTools';

const ToolsControl = () => {
  const { 
    cadastralData, 
    h3Resolution, 
    setH3Resolution, 
    h3Data,
    isH3Visible,
    toggleH3Visibility,
    arbitrageThreshold,
    setArbitrageThreshold,
    arbitrageData
  } = useCadastralStore();
  
  const { layers: isochroneLayers } = useIsochroneStore();
  const { 
    analysisResults, 
    priceWeight, 
    timeWeight, 
    setWeights 
  } = useAnalysisStore();

  const { aggregateH3, executeAnalysis, computeArbitrage, isAnalyzing } = useCadastralTools();

  const handleAggregateH3 = () => {
    if (h3Data.length > 0) {
      toggleH3Visibility();
    } else {
      aggregateH3();
    }
  };

  const handleRunAnalysis = () => {
    executeAnalysis();
  };

  const handleComputeArbitrage = () => {
    computeArbitrage();
  };

  return (
    <div className="p-4 text-white">
      <h3 className="text-lg font-bold mb-4">Tools</h3>

      {isochroneLayers.length <= 1 && (
        <div className="mb-4 p-3 bg-blue-900/50 border border-blue-700 rounded text-xs text-blue-200">
           <strong>Tip:</strong> You currently have {isochroneLayers.length} isochrone layer. 
           For better analysis, add multiple layers (e.g., 15min, 30min) to see the trade-off.
        </div>
      )}

      <div className="mb-6 p-4 bg-gray-800 rounded-lg">
        <h4 className="text-md font-semibold mb-2">H3 Price Grid</h4>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-400 mb-1">
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
        </div>
        
        <button
          onClick={handleAggregateH3}
          disabled={cadastralData.length === 0}
          className={`w-full font-bold py-2 px-4 rounded mb-2 ${
            cadastralData.length > 0 
              ? (h3Data.length > 0 && !isH3Visible ? 'bg-gray-600 hover:bg-gray-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white')
              : 'bg-gray-600 text-gray-400 cursor-not-allowed'
          }`}
        >
          {h3Data.length > 0 
            ? (isH3Visible ? 'Hide Price Grid' : 'Show Price Grid') 
            : 'Compute Price Grid'}
        </button>

        {h3Data.length > 0 && (
          <div className="mt-2 text-sm text-gray-300">
             <div className="flex items-center justify-between mb-2">
                <span>{h3Data.length} cells generated</span>
             </div>
          </div>
        )}
      </div>

      <div className="mb-6 p-4 bg-gray-800 rounded-lg border border-green-500/30">
        <h4 className="text-md font-semibold mb-2 text-green-400">Arbitrage / Deals</h4>
        <p className="text-xs text-gray-400 mb-4">
          Find properties priced below market average.
        </p>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-400 mb-1">
            Discount Threshold: {arbitrageThreshold}%
          </label>
          <input
            type="range"
            min="5"
            max="50"
            step="5"
            value={arbitrageThreshold}
            onChange={(e) => setArbitrageThreshold(parseInt(e.target.value))}
            className="w-full h-2 bg-gradient-to-r from-green-500 to-yellow-500 rounded-lg appearance-none cursor-pointer"
          />
        </div>

        <button
          onClick={handleComputeArbitrage}
          disabled={h3Data.length === 0}
          className={`w-full font-bold py-2 px-4 rounded mb-2 ${
            h3Data.length > 0 
              ? 'bg-green-600 hover:bg-green-700 text-white' 
              : 'bg-gray-600 text-gray-400 cursor-not-allowed'
          }`}
        >
          Find Deals
        </button>

        {arbitrageData.length > 0 && (
          <div className="mt-2 text-xs text-green-400 text-center">
             Found {arbitrageData.length} potential deals!
          </div>
        )}
      </div>

      <div className="mb-6 p-4 bg-gray-800 rounded-lg border border-purple-500/30">
        <h4 className="text-md font-semibold mb-2 text-purple-400">Sweet Spot Analysis</h4>
        <p className="text-xs text-gray-400 mb-4">
          Intersect Price Grid with Travel Time to find optimal locations.
        </p>

        <div className="mb-4">
          <label className="flex justify-between text-xs font-medium text-gray-400 mb-1">
            <span>Price Weight ({Math.round(priceWeight * 100)}%)</span>
            <span>Time Weight ({Math.round(timeWeight * 100)}%)</span>
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={priceWeight}
            onChange={(e) => {
              const p = parseFloat(e.target.value);
              setWeights(p, 1 - p);
            }}
            className="w-full h-2 bg-gradient-to-r from-green-500 to-blue-500 rounded-lg appearance-none cursor-pointer"
          />
        </div>

        <button
          onClick={handleRunAnalysis}
          disabled={isAnalyzing || h3Data.length === 0 || isochroneLayers.length === 0}
          className={`w-full font-bold py-2 px-4 rounded mb-2 ${
            h3Data.length > 0 && isochroneLayers.length > 0
              ? 'bg-purple-600 hover:bg-purple-700 text-white' 
              : 'bg-gray-600 text-gray-400 cursor-not-allowed'
          }`}
        >
          {isAnalyzing ? 'Analyzing...' : 'Find Sweet Spots'}
        </button>
        
        {analysisResults.length > 0 && (
          <div className="mt-2 text-xs text-green-400 text-center">
             Analysis found {analysisResults.length} optimal cells.
          </div>
        )}
      </div>

    </div>
  );
};

export default ToolsControl;

