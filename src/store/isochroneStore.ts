import { create } from 'zustand';
import { polygonToCells } from 'h3-js';
import { fetchMapboxIsochrone } from '../api/isochroneService';
import * as GeoJSON from 'geojson';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';

export type TransportMode = 'walk' | 'bike' | 'car';
export type Tab = 'isochrones' | 'cadastral' | 'tools';

export interface IsochroneLayer {
  id: string;
  label: string;
  geojson: GeoJSON.Feature<GeoJSON.Polygon>;
  h3Cells: string[];
  isVisible: boolean;
  transportMode: TransportMode;
  travelTime: number; // in minutes
  color: [number, number, number, number];
}

interface AppState {
  layers: IsochroneLayer[];
  isSelecting: boolean;
  currentTransportMode: TransportMode;
  currentTravelTime: number; // in minutes
  poiData: GeoJSON.FeatureCollection | null;
  showPublicTransport: boolean;
  showRail: boolean; // Add granular control for rail
  showBus: boolean; // Add granular control for bus
  showBikeParking: boolean;
  selectedPoi: GeoJSON.Feature | null;
  poisInIsochrones: GeoJSON.Feature[];
  currentTab: Tab;
  setTab: (tab: Tab) => void;
  setTransportMode: (mode: TransportMode) => void;
  setTravelTime: (time: number) => void;
  startSelection: () => void;
  stopSelection: () => void;
  addLayer: (center: [number, number]) => Promise<void>;
  toggleLayerVisibility: (id: string) => void;
  deleteLayer: (id: string) => void;
  loadPois: () => Promise<void>;
  togglePublicTransport: () => void;
  toggleRail: () => void; // Add toggle for rail
  toggleBus: () => void; // Add toggle for bus
  toggleBikeParking: () => void;
  setSelectedPoi: (poi: GeoJSON.Feature | null) => void;
  findPoisInIsochrones: () => void;
}
import { persist } from 'zustand/middleware';

const modeDetails: Record<TransportMode, { speed: number; color: [number, number, number, number] }> = {
  walk: { speed: 5, color: [52, 152, 219, 150] }, // Blue
  bike: { speed: 20, color: [46, 204, 113, 150] }, // Green
  car: { speed: 50, color: [231, 76, 60, 150] }, // Red
};

const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      layers: [],
      isSelecting: false,
      currentTransportMode: 'walk',
      currentTravelTime: 15,
      poiData: null,
      showPublicTransport: false,
      showRail: true, // Default to true
      showBus: true, // Default to true
      showBikeParking: false,
      selectedPoi: null,
      poisInIsochrones: [],
      currentTab: 'isochrones',
      setTab: (tab) => set({ currentTab: tab }),
      setTransportMode: (mode) => set({ currentTransportMode: mode }),
      setTravelTime: (time) => set({ currentTravelTime: time }),
      startSelection: () => set({ isSelecting: true }),
      stopSelection: () => set({ isSelecting: false }),
      addLayer: async (center) => {
        const { currentTransportMode, currentTravelTime } = get();
        const { color } = modeDetails[currentTransportMode];
        
        try {
          const polygon = await fetchMapboxIsochrone(center, currentTransportMode, currentTravelTime);
          
          if (!polygon || !polygon.geometry) {
            throw new Error("Invalid GeoJSON received from API");
          }

          const h3Cells = polygonToCells((polygon.geometry as GeoJSON.Polygon).coordinates[0], 9);
          console.log("Generated H3 Cells:", h3Cells);

          const newLayer: IsochroneLayer = {
            id: `isochrone-${Date.now()}`,
            label: `${currentTransportMode} - ${currentTravelTime} min`,
            geojson: polygon,
            h3Cells,
            isVisible: true,
            transportMode: currentTransportMode,
            travelTime: currentTravelTime,
            color,
          };

          set((state) => ({ layers: [...state.layers, newLayer], isSelecting: false }));
          get().findPoisInIsochrones();
        } catch (error) {
          console.error("Failed to generate isochrone:", error);
          set({ isSelecting: false }); // Stop selection mode on error
        }
      },
      toggleLayerVisibility: (id) =>
        set((state) => ({
          layers: state.layers.map((layer) =>
            layer.id === id ? { ...layer, isVisible: !layer.isVisible } : layer
          ),
        })),
      deleteLayer: (id) =>
        set((state) => ({
          layers: state.layers.filter((layer) => layer.id !== id),
        })),
      loadPois: async () => {
        try {
          const poiFiles = ['switzerland-pois.geojson', 'lyon-pois.geojson'];
          const features: GeoJSON.Feature[] = [];

          await Promise.all(poiFiles.map(async (file) => {
            try {
              const response = await fetch(`/poi/${file}`);
              if (response.ok) {
                const data = await response.json();
                 if (data.type === 'FeatureCollection') {
                    features.push(...data.features);
                 } else if (data.type === 'Feature') {
                    features.push(data);
                 }
              }
            } catch (err) {
                console.error(`Failed to load ${file}`, err);
            }
          }));

          set({ poiData: { type: 'FeatureCollection', features } });
        } catch (error) {
          console.error("Failed to load POI data:", error);
        }
      },
      togglePublicTransport: () => {
        set((state) => {
          const newState = !state.showPublicTransport;
          // If turning on, ensure both sub-layers are on by default if both were off? 
          // If I toggle main, I expect everything to toggle.
          // BUT request says: "if i choose "public transport" all the different modes are checked"
          if (newState) {
             return { showPublicTransport: true, showRail: true, showBus: true };
          } else {
             return { showPublicTransport: false, showRail: false, showBus: false };
          }
        });
        get().findPoisInIsochrones();
      },
      toggleRail: () => {
        set((state) => {
           const newRail = !state.showRail;
           // If we turn on rail, we should turn on parent if it was off?
           // If we turn off rail, and bus is also off, should we turn off parent?
           const newShowPublicTransport = newRail || state.showBus;
           return { showRail: newRail, showPublicTransport: newShowPublicTransport };
        });
        get().findPoisInIsochrones();
      },
      toggleBus: () => {
        set((state) => {
           const newBus = !state.showBus;
           const newShowPublicTransport = newBus || state.showRail;
           return { showBus: newBus, showPublicTransport: newShowPublicTransport };
        });
        get().findPoisInIsochrones();
      },
      toggleBikeParking: () => {
        set((state) => ({ showBikeParking: !state.showBikeParking }));
        get().findPoisInIsochrones();
      },
      setSelectedPoi: (poi) => set({ selectedPoi: poi }),
      findPoisInIsochrones: () => {
        const { layers, poiData, showBikeParking, showRail, showBus } = get();
        if (!poiData) return;

        const visibleLayers = layers.filter(l => l.isVisible);
        if (visibleLayers.length === 0) {
            set({ poisInIsochrones: [] });
            return;
        }
        
        // Filter relevant POIs based on visibility flags
        const activePois = poiData.features.filter(f => {
            const isRail = f.properties?.train === 'yes' || f.properties?.railway === 'station' || f.properties?.public_transport === 'station';
            const isBus = (f.properties?.bus === 'yes' || f.properties?.highway === 'bus_stop') && !isRail;
            const isBio = f.properties?.amenity === 'bicycle_parking';

            if (showRail && isRail) return true;
            if (showBus && isBus) return true;
            if (showBikeParking && isBio) return true;
            return false;
        });

        const intersectingPois: GeoJSON.Feature[] = [];

        // Simple check: is point in any visible isochrone polygon
        activePois.forEach(poi => {
            if (poi.geometry.type !== 'Point') return;
            const point = poi as GeoJSON.Feature<GeoJSON.Point>;
            
            const isInside = visibleLayers.some(layer => {
                 return booleanPointInPolygon(point, layer.geojson);
            });

            if (isInside) {
                intersectingPois.push(poi);
            }
        });

        set({ poisInIsochrones: intersectingPois });
      }
    }),
    {
      name: 'isochrone-storage',
      partialize: (state) => ({ 
          layers: state.layers,
          // Don't persist large POI data
      }), 
    }
  )
);

export default useStore;
