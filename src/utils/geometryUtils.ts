import * as GeoJSON from 'geojson';
import { featureCollection } from '@turf/helpers';
import intersect from '@turf/intersect';
import rewind from '@turf/rewind';
import buffer from '@turf/buffer';

/**
 * Calculates the intersection (common ground) of multiple isochrone polygons.
 * Handles geometry cleaning (rewind, buffer) and performs iterative intersection.
 * 
 * @param polygons Array of GeoJSON Polygon features to intersect
 * @returns The intersection Polygon/MultiPolygon feature, or null if no overlap exists.
 */
export const calculateCommonGround = (
  polygons: GeoJSON.Feature<GeoJSON.Polygon>[]
): GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon> | null => {
  if (polygons.length < 2) return null;

  // 1. Pre-process: Ensure valid geometry (winding order + topology fix)
  const cleanFeatures = polygons.map(poly => {
    // Ensure correct winding order (CCW for outer rings)
    // @ts-ignore - rewind types can be tricky
    const correctWinding = rewind(poly, { reverse: false, mutate: false });
    
    // Apply zero-buffer to fix self-intersections or degenerate edges
    // @ts-ignore - buffer types
    return buffer(correctWinding, 0, { units: 'meters' }) as GeoJSON.Feature<GeoJSON.Polygon>;
  }).filter(Boolean); // Filter out any nulls from buffer

  if (cleanFeatures.length < 2) return null;

  // 2. Iterative Intersection
  // Start with the first polygon
  let intersectionResult: GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon> | null = cleanFeatures[0];

  for (let i = 1; i < cleanFeatures.length; i++) {
    // If we already lost the intersection, stop early
    if (!intersectionResult) return null;

    const f1: GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon> = intersectionResult;
    const f2: GeoJSON.Feature<GeoJSON.Polygon> = cleanFeatures[i];

    try {
      // @ts-ignore - Turf v7
      const pair = featureCollection([f1, f2]);
      // @ts-ignore - Turf v7
      const stepResult = intersect(pair);
      
      if (!stepResult) {
        console.warn(`No intersection found between accumulated area and layer ${i + 1}`);
        return null;
      }
      intersectionResult = stepResult;
    } catch (e) {
      console.error(`Intersection failed at step ${i}`, e);
      return null;
    }
  }

  // 3. Final Sanity Check
  if (!intersectionResult || 
      (intersectionResult.geometry.type === 'Polygon' && intersectionResult.geometry.coordinates.length === 0) ||
      (intersectionResult.geometry.type === 'MultiPolygon' && intersectionResult.geometry.coordinates.length === 0)) {
    return null;
  }

  return intersectionResult;
};
