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
  toggleBikeParking: () => void;
  setSelectedPoi: (poi: GeoJSON.Feature | null) => void;
  findPoisInIsochrones: () => void;
}

const modeDetails: Record<TransportMode, { speed: number; color: [number, number, number, number] }> = {
  walk: { speed: 5, color: [52, 152, 219, 150] }, // Blue
  bike: { speed: 20, color: [46, 204, 113, 150] }, // Green
  car: { speed: 50, color: [231, 76, 60, 150] }, // Red
};

const useStore = create<AppState>((set, get) => ({
  layers: [],
  isSelecting: false,
  currentTransportMode: 'walk',
  currentTravelTime: 15,
  poiData: null,
  showPublicTransport: false,
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
      const poiFiles = ['vaud-pois.geojson', 'lyon-pois.geojson'];
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
    set((state) => ({ showPublicTransport: !state.showPublicTransport }));
    get().findPoisInIsochrones();
  },
  toggleBikeParking: () => {
    set((state) => ({ showBikeParking: !state.showBikeParking }));
    get().findPoisInIsochrones();
  },
  setSelectedPoi: (poi) => set({ selectedPoi: poi }),
  findPoisInIsochrones: () => {
    const { layers, poiData, showPublicTransport, showBikeParking } = get();
    if (!poiData) return;

    const visibleIsochrones = layers.filter((l) => l.isVisible);
    if (visibleIsochrones.length === 0) {
      set({ poisInIsochrones: [] });
      return;
    }

    const visiblePois = poiData.features.filter((poi) => {
      const isPublicTransport =
        poi.properties?.public_transport === 'station' ||
        poi.properties?.public_transport === 'platform' ||
        poi.properties?.highway === 'bus_stop';
      const isBikeParking = poi.properties?.amenity === 'bicycle_parking';

      return (showPublicTransport && isPublicTransport) || (showBikeParking && isBikeParking);
    });

    const containedPois = visiblePois
      .filter(poi => poi.geometry.type === 'Point')
      .filter((poi) => {
      return visibleIsochrones.some((layer) => {
        return booleanPointInPolygon(poi as GeoJSON.Feature<GeoJSON.Point>, layer.geojson);
      });
    });

    set({ poisInIsochrones: containedPois });
  },
}));

export default useStore;
