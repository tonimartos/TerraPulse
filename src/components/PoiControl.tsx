import React, { useState } from 'react';
import useStore from '../store/isochroneStore';

const PoiControl: React.FC = () => {
  const {
    showPublicTransport,
    showRail,
    showBus,
    togglePublicTransport,
    toggleRail,
    toggleBus,
    showBikeParking,
    toggleBikeParking,
    loadPois,
    poiData,
  } = useStore();
  const [isModalOpen, setModalOpen] = useState(false);

  const handlePublicTransportToggle = async () => {
    if (!poiData) {
      await loadPois();
    }
    togglePublicTransport();
  };

  const handleRailToggle = async () => {
    if (!poiData) await loadPois();
    toggleRail();
  };
  
  const handleBusToggle = async () => {
    if (!poiData) await loadPois();
    toggleBus();
  };

  const handleBikeParkingToggle = async () => {
    if (!poiData) {
      await loadPois();
    }
    toggleBikeParking();
  };

  return (
    <div style={{ position: 'absolute', top: 10, right: 10, zIndex: 1 }}>
      <button
        onClick={() => setModalOpen(!isModalOpen)}
        style={{
          padding: '10px',
          background: '#333',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
        }}
      >
        Layers
      </button>
      {isModalOpen && (
        <div
          style={{
            position: 'absolute',
            top: '45px',
            right: '0',
            width: '250px',
            background: '#444',
            padding: '15px',
            borderRadius: '4px',
            color: 'white',
          }}
        >
          <h3 style={{ margin: '0 0 10px 0', fontSize: '16px' }}>Points of Interest</h3>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
            <input
              type="checkbox"
              id="public-transport"
              checked={showPublicTransport}
              onChange={handlePublicTransportToggle}
              style={{ marginRight: '10px' }}
            />
            <label htmlFor="public-transport">Public Transport</label>
          </div>
          
          {showPublicTransport && (
            <div style={{ marginLeft: '20px', marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '5px' }}>
                <input
                  type="checkbox"
                  id="pt-rail"
                  checked={showRail}
                  onChange={handleRailToggle}
                  style={{ marginRight: '10px' }}
                />
                <label htmlFor="pt-rail">Rail</label>
              </div>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <input
                  type="checkbox"
                  id="pt-bus"
                  checked={showBus}
                  onChange={handleBusToggle}
                  style={{ marginRight: '10px' }}
                />
                <label htmlFor="pt-bus">Bus</label>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center' }}>
            <input
              type="checkbox"
              id="bike-parking"
              checked={showBikeParking}
              onChange={handleBikeParkingToggle}
              style={{ marginRight: '10px' }}
            />
            <label htmlFor="bike-parking">Bike Parking</label>
          </div>
        </div>
      )}
    </div>
  );
};

export default PoiControl;
