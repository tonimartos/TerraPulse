import { featureCollection } from '@turf/helpers';
import { Feature } from 'geojson';

/**
 * Downloads a GeoJSON FeatureCollection as a file in the browser.
 * @param features - Array of GeoJSON Features
 * @param filename - Name of the file to download (e.g., 'data.geojson')
 */
export const downloadGeoJSON = (features: Feature[], filename: string) => {
  try {
    const fc = featureCollection(features);
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(fc));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute('href', dataStr);
    downloadAnchorNode.setAttribute('download', filename);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  } catch (e) {
    console.error("Download failed", e);
  }
};
