import React from 'react';
import useCadastralStore from '../store/cadastralStore';
import useAnalysisStore from '../store/analysisStore';

const Legend = () => {
  const { h3Data, isH3Visible } = useCadastralStore();
  const { analysisResults } = useAnalysisStore();

  if (!isH3Visible || (h3Data.length === 0 && analysisResults.length === 0)) {
    return null;
  }

  // MODE 1: ANALYSIS (Sweet Spot)
  if (analysisResults.length > 0) {
    return (
      <div className="absolute bottom-8 right-8 bg-gray-900/90 backdrop-blur-md p-4 rounded-lg shadow-2xl border border-gray-700 w-64 text-white z-20">
        <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Sweet Spot Score</h4>
        
        <div className="h-2 w-full bg-gradient-to-r from-[rgb(0,255,0)] via-[rgb(255,255,0)] to-[rgb(255,0,0)] rounded mb-1"></div>
        <div className="flex justify-between text-xs text-gray-400">
          <span>Best (0)</span>
          <span>Worst (100)</span>
        </div>
        
        <div className="mt-3 text-xs text-gray-500 pt-2 border-t border-gray-800">
           Combination of Price & Time
        </div>
      </div>
    );
  }

  // MODE 2: RAW PRICE GRID (Quantiles)
  // We need to recalculate the quantiles to display the breaks
  const prices = h3Data.map(d => d.averagePricePerSqm).sort((a, b) => a - b);
  const getQuantile = (q: number) => prices[Math.floor((prices.length - 1) * q)];
  
  const q20 = getQuantile(0.20) || 0;
  const q40 = getQuantile(0.40) || 0;
  const q60 = getQuantile(0.60) || 0;
  const q80 = getQuantile(0.80) || 0;
  const max = prices[prices.length - 1] || 0;

  const steps = [
      { color: 'rgb(44, 123, 182)', label: `< ${q20.toLocaleString()} €` },
      { color: 'rgb(171, 217, 233)', label: `< ${q40.toLocaleString()} €` },
      { color: 'rgb(255, 255, 191)', label: `< ${q60.toLocaleString()} €` },
      { color: 'rgb(253, 174, 97)', label: `< ${q80.toLocaleString()} €` },
      { color: 'rgb(215, 25, 28)', label: `< ${max.toLocaleString()} €` },
  ];

  return (
    <div className="absolute bottom-8 right-8 bg-gray-900/90 backdrop-blur-md p-4 rounded-lg shadow-2xl border border-gray-700 text-white z-20">
       <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Price per m²</h4>
       
       <div className="space-y-1">
         {steps.map((step, i) => (
            <div key={i} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: step.color }}></div>
                <div className="text-xs text-gray-300 font-mono">{step.label}</div>
            </div>
         ))}
       </div>
    </div>
  );
};

export default Legend;
