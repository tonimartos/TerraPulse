import { create } from 'zustand';
import { CadastralData } from '../api/cadastralService';

export interface H3PriceData {
  hex: string;
  count: number;
  totalPrice: number;
  averagePrice: number;
  averagePricePerSqm: number;
}


export interface CadastralLayer {
  id: string;
  name: string;
  data: CadastralData[];
  isVisible: boolean;
  color?: [number, number, number];
}

interface CadastralState {
  // Legacy single-source support (to be deprecated or mapped to active layer)
  cadastralData: CadastralData[];
  setCadastralData: (data: CadastralData[]) => void;
  
  // New Multi-layer support
  layers: CadastralLayer[];
  addLayer: (layer: CadastralLayer) => void;
  removeLayer: (id: string) => void;
  toggleLayerVisibility: (id: string) => void;
  
  isVisible: boolean;
  toggleVisibility: () => void;
  
  // H3 Analysis State
  h3Data: H3PriceData[];
  setH3Data: (data: H3PriceData[]) => void;
  h3Resolution: number;
  setH3Resolution: (res: number) => void;
  isH3Visible: boolean;
  toggleH3Visibility: () => void;

  // Arbitrage State
  arbitrageData: CadastralData[];
  setArbitrageData: (data: CadastralData[]) => void;
  arbitrageThreshold: number; // Percentage under market price
  setArbitrageThreshold: (threshold: number) => void;
  isArbitrageVisible: boolean;
  toggleArbitrageVisibility: () => void;
  
  // Context-Aware State
  scopeToIsochrones: boolean;
  setScopeToIsochrones: (scope: boolean) => void;
}

const useCadastralStore = create<CadastralState>((set) => ({
  cadastralData: [],
  setCadastralData: (data) => set({ cadastralData: data }),
  
  layers: [],
  addLayer: (layer) => set((state) => ({ 
    layers: [...state.layers, layer],
    // update legacy property for compatibility
    cadastralData: [...state.cadastralData, ...layer.data] 
  })),
  removeLayer: (id) => set((state) => {
    const newLayers = state.layers.filter(l => l.id !== id);
    // Rebuild combined data
    const combinedData = newLayers.flatMap(l => l.isVisible ? l.data : []);
    return { 
      layers: newLayers,
      cadastralData: combinedData
    };
  }),
  toggleLayerVisibility: (id) => set((state) => {
    const newLayers = state.layers.map(l => 
      l.id === id ? { ...l, isVisible: !l.isVisible } : l
    );
    // Rebuild combined data based on visibility
    const combinedData = newLayers.flatMap(l => l.isVisible ? l.data : []);
    return {
      layers: newLayers,
      cadastralData: combinedData
    };
  }),

  isVisible: true,
  toggleVisibility: () => set((state) => ({ isVisible: !state.isVisible })),
  
  h3Data: [],
  setH3Data: (data) => set({ h3Data: data }),
  h3Resolution: 9, // Default resolution
  setH3Resolution: (res) => set({ h3Resolution: res }),
  isH3Visible: true,
  toggleH3Visibility: () => set((state) => ({ isH3Visible: !state.isH3Visible })),

  arbitrageData: [],
  setArbitrageData: (data) => set({ arbitrageData: data }),
  arbitrageThreshold: 20,
  setArbitrageThreshold: (threshold) => set({ arbitrageThreshold: threshold }),
  isArbitrageVisible: true,
  toggleArbitrageVisibility: () => set((state) => ({ isArbitrageVisible: !state.isArbitrageVisible })),
  
  scopeToIsochrones: false,
  setScopeToIsochrones: (scope) => set({ scopeToIsochrones: scope }),
}));

export default useCadastralStore;
