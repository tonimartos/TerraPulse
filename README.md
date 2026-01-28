# TerraPulse

TerraPulse is a modern, interactive geospatial analysis platform built with React, Deck.gl, and Mapbox. It is designed to visualize complex urban data, including cadastral mutations (real estate values), isochrones (travel time analysis), and points of interest (POIs).

## Features

- **🗺️ Interactive Map**: specific base maps and high-performance rendering using Mapbox GL and Deck.gl.
- **⏱️ Isochrone Analysis**: Calculate and visualize travel time polygons to understand accessibility.
- **🏠 Cadastral Visualization**: Explore real estate transaction data (DVF), including prices, dates, and property types.
- **📍 Points of Interest**: Layer various POIs (Points of Interest) over the map for context.
- **🛠️ Analysis Tools**: Integrated toolbox for geospatial measurements and insights.
- **🎨 Modern UI**: Collapsible sidebar, dark mode aesthetics, and responsive layout built with Tailwind CSS.

## ⚠️ Important: Data Setup

**This project requires external datasets to function correctly.** Large geospatial files are not stored in the repository. You must add the data manually or convert it using the provided tools.

### 1. Cadastral Data (Real Estate)
The application expects processed GeoJSON data for cadastral visualization. 

1. **Source Data**: You need a GeoPackage file (`.gpkg`) containing real estate mutations (e.g., French DVF data formatted as `mutations_d69.gpkg`).
2. **Place File**: Put your source `.gpkg` file in:  
   `public/cadastral/mutations_d69.gpkg`
3. **Process Data**: Run the provided Python script to convert the GeoPackage into the optimized GeoJSON format required by the frontend:
   ```bash
   # Install dependencies if needed (shapely, pyproj)
   pip install shapely pyproj
   
   # Run the converter
   python process_cadastral.py
   ```
   This will generate `public/cadastral/lyon_mutations.geojson`.

### 2. Other Data
Ensure the following directories exist in `public/` and contain your data if referenced by the app:
- `public/cadastral/` (for polygons and mutation values)
- `public/poi/` (for POI GeoJSONs)

## Installation

### Prerequisites
- Node.js (v18+ recommended)
- Python 3.x (for data processing scripts)
- Mapbox Access Token

### Components Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd TerraPulse
   ```

2. **Install JavaScript dependencies**
   ```bash
   npm install
   ```

3. **Configure Environment Variables**
   Create a `.env` file in the root directory and add your Mapbox token:
   ```env
   VITE_MAPBOX_TOKEN=pk.your_mapbox_access_token_here
   ```

## Usage

### Development Server
Start the development server with hot-reload:
```bash
npm run dev
```

### Building for Production
Build the application for deployment:
```bash
npm run build
```

## Tech Stack

- **Frontend Framework**: React, Vite, TypeScript
- **Styling**: Tailwind CSS
- **Maps & Viz**: Mapbox GL JS, Deck.gl, React Map GL
- **State Management**: Zustand
- **Icons**: Lucide React
- **Data Processing**: Python (Shapely, PyProj)

## License

[MIT](LICENSE)
