import React from 'react';
import MapComponent from './components/Map';
import Sidebar from './components/Sidebar';
import Legend from './components/Legend';

const App: React.FC = () => {
  return (
    <div className="relative h-screen w-full overflow-hidden bg-gray-900 font-sans">
      {/* Map Layer - Always Full Screen, Background */}
      <div className="absolute inset-0 z-0">
        <MapComponent />
      </div>

      {/* Interface Layer - Sidebar Overlay */}
      <div className="absolute top-0 left-0 bottom-0 z-10 pointer-events-none">
        {/* Sidebar captures its own pointer events */}
        <div className="pointer-events-auto h-full">
          <Sidebar />
        </div>
      </div>

      {/* Interface Layer - Floating Legend */}
      <Legend />
    </div>
  );
};

export default App;
