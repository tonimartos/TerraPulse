import Papa from 'papaparse';

export interface CadastralData {
  id_mutation: string;
  date_mutation: string;
  valeur_fonciere: number;
  code_departement: string;
  code_commune: string;
  code_postal: string;
  type_local: string;
  surface_reelle_bati: number;
  surface_build?: number; // Alias for surface_reelle_bati if different in source
  latitude?: number;
  longitude?: number;
  geometry?: any; // Add geometry property for polygons
}

// Helper to normalize feature properties
const normalizeFeature = (feature: any): CadastralData => {
  const p = feature.properties || {};
  
  // Clean up INSEE code
  let insee = String(p.insee || p.code_commune || '');
  insee = insee.replace(/[\[\]'\s]/g, '').split(',')[0];

  // Try to find surface in various property keys
  // Priorities: surface_build > livingSpace > Living area in m² > surface_reelle_bati
  const surface = p.surface_build !== undefined ? Number(p.surface_build)
    : p.livingSpace !== undefined ? Number(p.livingSpace)
    : p['Living area in m²'] !== undefined ? Number(p['Living area in m²'])
    : Number(p.surface_reelle_bati || 0);

  // Try to find price
  // Priorities: price > Published price > valeur_fonciere
  const price = p.price !== undefined ? Number(p.price)
    : p['Published price'] !== undefined ? Number(p['Published price'])
    : Number(p.valeur_fonciere || 0);

  // Try to find type
  const typeLocal = p.property_type 
    || String(p.category || p['Property type'] || 'Unknown');

  // Try to find postal code
  const postalCode = p.postalCode 
    || p['Postcode (NPA/PLZ)']
    || '';

  // Calculate generic coords if point
  // Add slight jitter to avoid perfect stacking (especially for zip-code centered points)
  let lat = feature.geometry?.type === 'Point' ? feature.geometry.coordinates[1] : undefined;
  let lon = feature.geometry?.type === 'Point' ? feature.geometry.coordinates[0] : undefined;

  if (lat && lon) {
     // Jitter ~ +/- 0.0001 degrees (approx 10-15m)
     // This helps visualizing stacked points (e.g. from same zip code centroid)
     lat += (Math.random() - 0.5) * 0.0002;
     lon += (Math.random() - 0.5) * 0.0002;
  }
  
  return {
    id_mutation: String(p.id || p.crawlingId || p['Lookmove ID'] || `gen-${Math.random()}`),
    date_mutation: p.date || p.createdAt || p['First appearance'] || new Date().toISOString(),
    valeur_fonciere: price,
    code_departement: insee.length >= 2 ? insee.substring(0, 2) : '00',
    code_commune: insee,
    code_postal: String(postalCode),
    type_local: typeLocal,
    surface_reelle_bati: surface,
    surface_build: surface,
    latitude: lat,
    longitude: lon,
    geometry: feature.geometry
  };
};

export const fetchCadastralGeoJSON = async (fileUrl: string): Promise<CadastralData[]> => {
  const response = await fetch(fileUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch GeoJSON from ${fileUrl}`);
  }
  const geojson = await response.json();
  
  return geojson.features.map(normalizeFeature);
};

export const parseLocalCadastralGeoJSON = async (file: File): Promise<CadastralData[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const geojson = JSON.parse(text);
        if (geojson.features && Array.isArray(geojson.features)) {
           const parsed = geojson.features.map(normalizeFeature);
           resolve(parsed);
        } else {
           resolve([]);
        }
      } catch (e) {
        reject(e);
      }
    };
    reader.onerror = (e) => reject(e);
    reader.readAsText(file);
  });
};


export const parseCadastralCSV = async (fileUrl: string): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    Papa.parse(fileUrl, {
      download: true,
      header: true,
      delimiter: '|',
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: (results) => {
        resolve(results.data);
      },
      error: (error) => {
        reject(error);
      },
    });
  });
};

export const parseLocalCadastralCSV = async (file: File): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      delimiter: '|',
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: (results) => {
        resolve(results.data);
      },
      error: (error) => {
        reject(error);
      },
    });
  });
};

export const filterCadastralData = (data: any[], departmentCode: string) => {
  // Debug log to see one row structure
  if (data.length > 0) {
    console.log('Sample row raw data:', data[0]);
  }
  
  return data.filter((row: any) => {
    // Ensure comparison works (string vs number)
    return String(row.code_departement) === String(departmentCode);
  });
};
