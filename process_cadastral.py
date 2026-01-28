import sqlite3
import json
import shapely.wkb
import shapely.geometry
from pyproj import Transformer

# Paths
INPUT_GPKG = 'public/cadastral/mutations_d69.gpkg'
OUTPUT_GEOJSON = 'public/cadastral/lyon_mutations.geojson'

# Initialize transformer (Lambert 93 -> WGS84)
transformer = Transformer.from_crs("EPSG:2154", "EPSG:4326", always_xy=True)

def parse_gpkg_geometry(blob):
    # GeoPackage Binary Header
    # Byte 0-1: Magic 'GP'
    # Byte 2: Version 0
    # Byte 3: Flags
    # Byte 4-7: SRS ID
    # Then Envelope (optional)
    # Then WKB
    
    if not blob:
        return None
        
    flags = blob[3]
    envelope_indicator = (flags >> 1) & 0x07
    
    offset = 8 # Basic header
    
    if envelope_indicator == 0:
        pass
    elif envelope_indicator == 1:
        offset += 32
    elif envelope_indicator == 2:
        offset += 48
    elif envelope_indicator == 3:
        offset += 48
    elif envelope_indicator == 4:
        offset += 64
        
    wkb_bytes = blob[offset:]
    return shapely.wkb.loads(wkb_bytes)

def main():
    conn = sqlite3.connect(INPUT_GPKG)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    # We select relevant columns and filter by year 2024 (and maybe 2023 if 2024 is empty, assume 2024 for now)
    # We use mutation_geompar as it contains value/price.
    # We limit to reasonable number to avoid browser crash if too big, or just filter.
    query = """
        SELECT 
            idmutation, datemut, valeurfonc, libnatmut, libtypbien, 
            sbati, sterr, code_postal, nom_commune, geom
        FROM mutation_geompar 
        WHERE anneemut >= 2023 AND valeurfonc > 0
        LIMIT 50000
    """
    
    # Check if columns exist (some might have different names in different versions)
    # Based on table_info saw earlier:
    # valeurfonc, datemut, libnatmut, libtypbien, sbati, sterr are there.
    # code_postal, nom_commune - wait, I didn't see these in table_info!
    # table_info showed: l_codinsee. I might need to join with another table or just use l_codinsee.
    # Let's fix the query.
    
    query = """
        SELECT 
            idmutation, datemut, valeurfonc, libnatmut, libtypbien, 
            sbati, sterr, l_codinsee, geom
        FROM mutation_geompar 
        WHERE anneemut >= 2023 AND valeurfonc > 0
    """
    
    print("Executing query...")
    cursor.execute(query)
    
    features = []
    
    count = 0
    for row in cursor:
        try:
            geom = parse_gpkg_geometry(row['geom'])
            if geom is None:
                continue
                
            # Convert to point (centroid)
            centroid = geom.centroid
            
            # Reproject
            lon, lat = transformer.transform(centroid.x, centroid.y)
            
            properties = {
                'id': row['idmutation'],
                'date': row['datemut'],
                'price': row['valeurfonc'],
                'type': row['libnatmut'],
                'property_type': row['libtypbien'],
                'surface_build': row['sbati'],
                'surface_land': row['sterr'],
                'insee': row['l_codinsee']
            }
            
            feature = {
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": [lon, lat]
                },
                "properties": properties
            }
            features.append(feature)
            count += 1
            
            if count % 1000 == 0:
                print(f"Processed {count} records...")
                
        except Exception as e:
            print(f"Error processing row: {e}")
            continue

    geojson = {
        "type": "FeatureCollection",
        "features": features
    }
    
    print(f"Writing {len(features)} features to {OUTPUT_GEOJSON}...")
    with open(OUTPUT_GEOJSON, 'w') as f:
        json.dump(geojson, f)

    conn.close()
    print("Done.")

if __name__ == "__main__":
    main()
