import { useState } from 'react';
import useCadastralStore from '../store/cadastralStore';
import useIsochroneStore from '../store/isochroneStore';
import useAnalysisStore from '../store/analysisStore';
import { useCadastralTools } from '../hooks/useCadastralTools';
import { ChevronDown, ChevronRight, CheckCircle2, AlertCircle, Coins, FileBarChart, Target, Download } from 'lucide-react';
import { downloadGeoJSON } from '../utils/exportUtils';
import { point } from '@turf/helpers';

const ToolsControl = () => {
  const { 
    h3Data,
    arbitrageThreshold,
    setArbitrageThreshold,
    arbitrageData,
    scopeToIsochrones,
    setScopeToIsochrones
  } = useCadastralStore();
  
  const { layers: isochroneLayers } = useIsochroneStore();
  const { 
    analysisResults, 
    priceWeight, 
    timeWeight, 
    setWeights,
    reportData
  } = useAnalysisStore();

  const { executeAnalysis, computeArbitrage, generateReport, isAnalyzing, analyzeIsochroneIntersection } = useCadastralTools();
  const [expandedSection, setExpandedSection] = useState<'arbitrage' | 'report' | 'sweetSpot' | 'export' | null>('sweetSpot');

  const handleRunAnalysis = () => {
    executeAnalysis();
  };

  const handleComputeArbitrage = () => {
    computeArbitrage();
  };

  const handleGenerateReport = () => {
    generateReport();
  };
  
  const toggleSection = (section: 'arbitrage' | 'report' | 'sweetSpot' | 'export') => {
      setExpandedSection(expandedSection === section ? null : section);
  };

  const handleExportAnalysis = () => {
    // @ts-ignore
    const features = analyzeIsochroneIntersection();
    if (features && features.length > 0) {
      downloadGeoJSON(features, 'isochrone_market_analysis.geojson');
    } else {
      alert("No visible isochrones intersecting with active cadastral data, or no data loaded.");
    }
  };

  const handleExportDeals = () => {
    if (arbitrageData.length === 0) return;
    
    // Convert to GeoJSON Features
    const features = arbitrageData.map(d => {
       if (d.longitude && d.latitude) {
          return point([d.longitude, d.latitude], { ...d });
       }
       return null;
    }).filter(Boolean);
    
    // @ts-ignore
    downloadGeoJSON(features, 'deal_finder_results.geojson');
  };

  const hasGrid = h3Data.length > 0;
  const hasIsochrones = isochroneLayers.length > 0;

  return (
    <div className="p-4 text-white space-y-4">
      <h3 className="text-lg font-bold mb-4">Market Analysis</h3>
      
      {/* STATUS DASHBOARD */}
      <div className="flex gap-2 mb-6">
         <div className={`flex-1 p-2 rounded border ${hasGrid ? 'bg-green-900/30 border-green-700/50' : 'bg-red-900/30 border-red-700/50'} flex flex-col items-center justify-center`}>
            {hasGrid ? <CheckCircle2 size={16} className="text-green-500 mb-1" /> : <AlertCircle size={16} className="text-red-500 mb-1" />}
            <span className="text-[10px] font-semibold text-gray-300">Price Grid</span>
         </div>
         <div className={`flex-1 p-2 rounded border ${hasIsochrones ? 'bg-green-900/30 border-green-700/50' : 'bg-red-900/30 border-red-700/50'} flex flex-col items-center justify-center`}>
            {hasIsochrones ? <CheckCircle2 size={16} className="text-green-500 mb-1" /> : <AlertCircle size={16} className="text-red-500 mb-1" />}
            <span className="text-[10px] font-semibold text-gray-300">Isochrones</span>
            <span className="text-[10px] text-gray-500">{isochroneLayers.length} Layers</span>
         </div>
      </div>

      {/* SECTION 1: ARBITRAGE / DEALS */}
      <div className="border border-green-800/50 rounded-lg overflow-hidden bg-gray-800/50">
        <button 
          onClick={() => toggleSection('arbitrage')}
          className="w-full flex items-center justify-between p-3 bg-gray-800 hover:bg-gray-700 transition group"
        >
           <div className="flex items-center gap-2 font-semibold text-sm text-green-400 group-hover:text-green-300">
              <Coins size={16} /> Deal Finder
           </div>
           {expandedSection === 'arbitrage' ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>

        {expandedSection === 'arbitrage' && (
          <div className="p-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
             <p className="text-xs text-gray-400">
               Identify individual properties listed significantly below the local average.
             </p>

             <div className="mb-4">
              <label className="block text-xs font-medium text-gray-400 mb-1">
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

            {hasIsochrones && (
              <div className="mb-4">
                 <label className="flex items-center space-x-2 text-xs text-gray-300">
                    <input 
                      type="checkbox"
                      checked={scopeToIsochrones}
                      onChange={(e) => setScopeToIsochrones(e.target.checked)}
                      className="rounded border-gray-600 bg-gray-700 text-green-500 focus:ring-offset-gray-900" 
                    />
                    <span>Search only within visible Isochrones</span>
                 </label>
              </div>
            )}

            <button
              onClick={handleComputeArbitrage}
              disabled={!hasGrid}
              className={`w-full font-bold py-2 px-4 rounded text-sm ${
                hasGrid
                  ? 'bg-green-600 hover:bg-green-700 text-white' 
                  : 'bg-gray-700 text-gray-500 cursor-not-allowed'
              }`}
            >
              {arbitrageData.length > 0 ? 'Update Deals' : 'Find Deals'}
            </button>

            {arbitrageData.length > 0 && (
              <div className="space-y-2">
                <div className="text-center text-xs text-green-400 bg-green-900/20 p-2 rounded">
                  Found {arbitrageData.length} potential deals!
                </div>
                <button
                  onClick={handleExportDeals}
                  className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded text-xs font-semibold bg-gray-700 hover:bg-gray-600 text-gray-300 transition"
                >
                  <Download size={14} /> Export Results (GeoJSON)
                </button>
              </div>
            )}
          </div>
        )}
      </div>

       {/* SECTION 2: MARKET REPORT */}
       <div className="border border-yellow-800/50 rounded-lg overflow-hidden bg-gray-800/50">
        <button 
          onClick={() => toggleSection('report')}
          className="w-full flex items-center justify-between p-3 bg-gray-800 hover:bg-gray-700 transition group"
        >
           <div className="flex items-center gap-2 font-semibold text-sm text-yellow-400 group-hover:text-yellow-300">
              <FileBarChart size={16} /> Market Report
           </div>
           {expandedSection === 'report' ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>

        {expandedSection === 'report' && (
          <div className="p-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
            <p className="text-xs text-gray-400">
               Generate a table comparing property prices across different travel time zones.
            </p>

            <button
              onClick={handleGenerateReport}
              disabled={!hasGrid || !hasIsochrones}
              className={`w-full font-bold py-2 px-4 rounded text-sm ${
                hasGrid && hasIsochrones
                  ? 'bg-yellow-600 hover:bg-yellow-700 text-white' 
                  : 'bg-gray-700 text-gray-500 cursor-not-allowed'
              }`}
            >
              Generate Report
            </button>
            
            {reportData && reportData.length > 0 && (
              <div className="mt-4 bg-black/30 p-2 rounded text-xs">
                 <table className="w-full text-left">
                   <thead>
                     <tr className="border-b border-gray-600 text-gray-400">
                       <th className="pb-1">Time Zone</th>
                       <th className="pb-1 text-right">Avg Price/m²</th>
                     </tr>
                   </thead>
                   <tbody>
                     {reportData.map((row, idx) => (
                       <tr key={idx} className="border-b border-gray-700/50">
                         <td className="py-1 text-gray-300">{row.timeRange}</td>
                         <td className="py-1 text-right font-mono text-yellow-200">
                           {row.avgPricePerSqm.toLocaleString()} €
                         </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
                 <div className="mt-2 text-gray-500 italic text-[10px] text-right">
                   Sample: {reportData.reduce((acc, r) => acc + r.cellCount, 0)} cells
                 </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* SECTION 3: SWEET SPOT ANALYSIS */}
      <div className="border border-purple-800/50 rounded-lg overflow-hidden bg-gray-800/50">
        <button 
          onClick={() => toggleSection('sweetSpot')}
          className="w-full flex items-center justify-between p-3 bg-gray-800 hover:bg-gray-700 transition group"
        >
           <div className="flex items-center gap-2 font-semibold text-sm text-purple-400 group-hover:text-purple-300">
              <Target size={16} /> Sweet Spot Engine
           </div>
           {expandedSection === 'sweetSpot' ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>

        {expandedSection === 'sweetSpot' && (
          <div className="p-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
             <p className="text-xs text-gray-400">
               Combine Price and Travel Time to find the optimal balance (the "Sweet Spot").
             </p>

            <div className="mb-4">
              <label className="flex justify-between text-xs font-medium text-gray-400 mb-1">
                <span>Price Importance ({Math.round(priceWeight * 100)}%)</span>
                <span>Time Importance ({Math.round(timeWeight * 100)}%)</span>
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
               <div className="flex justify-between text-[10px] text-gray-500 mt-1">
                   <span>Cheaper is better</span>
                   <span>Closer is better</span>
               </div>
            </div>

            <button
              onClick={handleRunAnalysis}
              disabled={isAnalyzing || !hasGrid || !hasIsochrones}
              className={`w-full font-bold py-2 px-4 rounded text-sm ${
                hasGrid && hasIsochrones
                  ? 'bg-purple-600 hover:bg-purple-700 text-white' 
                  : 'bg-gray-700 text-gray-500 cursor-not-allowed'
              }`}
            >
              {isAnalyzing ? 'Analyzing...' : 'Find Sweet Spots'}
            </button>
            
            {analysisResults.length > 0 && (
              <div className="text-center text-xs text-purple-300 bg-purple-900/20 p-2 rounded">
                 Analysis Result: {analysisResults.length} optimal areas identified.
              </div>
            )}
            
             {(!hasGrid || !hasIsochrones) && (
                <div className="text-[10px] text-red-400 mt-2 p-2 border border-red-900/50 rounded bg-red-900/10">
                   Requires both Price Grid and Isochrones.
                </div>
             )}
          </div>
        )}
      </div>

      {/* Export & Data */}
      <div key="export-data" className="border border-gray-700 rounded-lg overflow-hidden bg-gray-800">
        <button
          onClick={() => toggleSection('export')}
          className="w-full flex items-center justify-between p-3 bg-gray-800 hover:bg-gray-700 transition"
        >
           <div className="flex items-center gap-2">
             <Download size={16} className="text-green-400" />
             <span className="font-semibold text-gray-200 text-sm">Export Data</span>
           </div>
           {expandedSection === 'export' ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>

        {expandedSection === 'export' && (
          <div className="p-3 border-t border-gray-700 space-y-3 bg-gray-900/50">
             <p className="text-xs text-gray-400">
               Download comprehensive datasets including isochrones, intersection zones, and property listings contained within them.
             </p>
             
             <button
               onClick={handleExportAnalysis}
               className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white py-2 rounded text-xs font-semibold"
             >
               <Download size={14} />
               Export Isochrones & Listings
             </button>
             
             <div className="text-[10px] text-gray-500 italic border-t border-gray-800 pt-2 mt-2">
               Includes all visible layers and intersecting data points.
             </div>
          </div>
        )}
      </div>

    </div>
  );
};

export default ToolsControl;
