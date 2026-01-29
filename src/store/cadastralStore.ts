import { create } from 'zustand';
import { CadastralData } from '../api/cadastralService';

export interface H3PriceData {
  hex: string;
  count: number;
  totalPrice: number;
  averagePrice: number;
  averagePricePerSqm: number;
}


interface CadastralState {
  cadastralData: CadastralData[];
  setCadastralData: (data: CadastralData[]) => void;
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
}

const useCadastralStore = create<CadastralState>((set) => ({
  cadastralData: [],
  setCadastralData: (data) => set({ cadastralData: data }),
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
}));

export default useCadastralStore;
