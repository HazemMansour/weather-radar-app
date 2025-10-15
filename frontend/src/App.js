import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import './App.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

function App() {
  const [radarData, setRadarData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);

  const fetchRadarData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/radar/latest`);
      if (!response.ok) throw new Error('Failed to fetch radar data');
      const data = await response.json();
      setRadarData(data);
      setLastUpdate(new Date());
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRadarData();
    const interval = setInterval(fetchRadarData, 120000); // Update every 2 minutes
    return () => clearInterval(interval);
  }, []);

  const getColorForValue = (value) => {
    if (value < 15) return '#40E0D0'; // Light rain
    if (value < 30) return '#00FF00'; // Moderate rain
    if (value < 45) return '#FFFF00'; // Heavy rain
    if (value < 60) return '#FF0000'; // Very heavy
    return '#FF00FF'; // Extreme
  };

  return (
    <div className="App">
      <header className="header">
        <h1>Live Weather Radar - MRMS RALA</h1>
        <div className="controls">
          <button onClick={fetchRadarData} disabled={loading}>
            {loading ? 'Updating...' : 'Refresh Data'}
          </button>
          {lastUpdate && (
            <span className="timestamp">
              Last Updated: {lastUpdate.toLocaleTimeString()}
            </span>
          )}
        </div>
      </header>

      {error && (
        <div className="error">
          Error: {error}
        </div>
      )}

      <div className="legend">
        <h3>Reflectivity (dBZ)</h3>
        <div className="legend-item">
          <span className="color-box" style={{backgroundColor: '#40E0D0'}}></span>
          <span>5-15 (Light)</span>
        </div>
        <div className="legend-item">
          <span className="color-box" style={{backgroundColor: '#00FF00'}}></span>
          <span>15-30 (Moderate)</span>
        </div>
        <div className="legend-item">
          <span className="color-box" style={{backgroundColor: '#FFFF00'}}></span>
          <span>30-45 (Heavy)</span>
        </div>
        <div className="legend-item">
          <span className="color-box" style={{backgroundColor: '#FF0000'}}></span>
          <span>45-60 (Very Heavy)</span>
        </div>
        <div className="legend-item">
          <span className="color-box" style={{backgroundColor: '#FF00FF'}}></span>
          <span>60+ (Extreme)</span>
        </div>
      </div>

      <MapContainer
        center={[37.5, -95]}
        zoom={5}
        style={{ height: 'calc(100vh - 180px)', width: '100%' }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap contributors'
        />
        
        {radarData && radarData.data && radarData.data.map((point, idx) => (
          <CircleMarker
            key={idx}
            center={[point.lat, point.lon]}
            radius={4}
            fillColor={getColorForValue(point.value)}
            color={getColorForValue(point.value)}
            weight={1}
            opacity={0.6}
            fillOpacity={0.6}
          >
            <Popup>
              Reflectivity: {point.value.toFixed(1)} dBZ
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>

      {radarData && (
        <div className="info">
          Data Points: {radarData.count} | Timestamp: {radarData.timestamp}
        </div>
      )}
    </div>
  );
}

export default App;