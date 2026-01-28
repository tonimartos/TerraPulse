import { TransportMode } from '../store/isochroneStore';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

const transportModeMapping: Record<TransportMode, string> = {
  walk: 'walking',
  bike: 'cycling',
  car: 'driving',
};

export const fetchMapboxIsochrone = async (
  center: [number, number],
  transportMode: TransportMode,
  travelTime: number
): Promise<GeoJSON.Feature<GeoJSON.Polygon>> => {
  const profile = transportModeMapping[transportMode];
  const coordinates = `${center[0]},${center[1]}`;
  const url = `https://api.mapbox.com/isochrone/v1/mapbox/${profile}/${coordinates}?contours_minutes=${travelTime}&polygons=true&access_token=${MAPBOX_TOKEN}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to fetch isochrone data from Mapbox');
  }
  const data = await response.json();
  
  // The Mapbox Isochrone API returns a FeatureCollection, we extract the first feature which is our polygon.
  return data.features[0];
};
