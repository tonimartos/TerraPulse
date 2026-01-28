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

export const fetchCadastralGeoJSON = async (fileUrl: string): Promise<CadastralData[]> => {
  const response = await fetch(fileUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch GeoJSON from ${fileUrl}`);
  }
  const geojson = await response.json();
  
  return geojson.features.map((feature: any) => {
    // Clean up INSEE code which might be in format "['69383']" from the python script/gpkg
    let insee = String(feature.properties.insee || '');
    insee = insee.replace(/[\[\]'\s]/g, '').split(',')[0];

    const surface = feature.properties.surface_build !== undefined 
      ? Number(feature.properties.surface_build) 
      : Number(feature.properties.surface_reelle_bati || 0);

    return {
      id_mutation: feature.properties.id,
      date_mutation: feature.properties.date,
      valeur_fonciere: Number(feature.properties.price),
      code_departement: insee.substring(0, 2),
      code_commune: insee,
      code_postal: '', // Not in our GeoJSON properties currently
      type_local: feature.properties.property_type,
      surface_reelle_bati: surface,
      surface_build: surface,
      latitude: feature.geometry.type === 'Point' ? feature.geometry.coordinates[1] : undefined,
      longitude: feature.geometry.type === 'Point' ? feature.geometry.coordinates[0] : undefined,
      geometry: feature.geometry
    };
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
