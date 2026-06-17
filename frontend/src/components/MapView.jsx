import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from 'react-leaflet';
import { Icon } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.heat';
import './MapView.css';

// Fix for default marker icons in React-Leaflet
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete Icon.Default.prototype._getIconUrl;
Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

// Reverse Geocoding using OpenStreetMap Nominatim API
const reverseGeocode = async (lat, lng) => {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'CitizenComplaintApp/1.0'
        }
      }
    );
    const data = await response.json();
    
    if (data.address) {
      const locality = data.address.suburb 
        || data.address.neighbourhood 
        || data.address.city 
        || data.address.town 
        || data.address.village 
        || 'Unknown area';
      
      return {
        locality,
        fullAddress: data.display_name
      };
    }
    return null;
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    return null;
  }
};

// Heatmap Layer Component
const HeatmapLayer = ({ complaints }) => {
  const map = useMap();

  useEffect(() => {
    if (!complaints || complaints.length === 0) return;

    // Prepare heatmap data: [lat, lng, intensity]
    const heatData = complaints.map(c => {
      let intensity = 0.5; // Default
      
      // Increase intensity based on priority
      if (c.priority === 'High') intensity = 1.0;
      else if (c.priority === 'Medium') intensity = 0.7;
      else if (c.priority === 'Low') intensity = 0.4;
      
      return [c.normalizedLocation.lat, c.normalizedLocation.lng, intensity];
    });

    // Create heatmap layer
    const heat = window.L.heatLayer(heatData, {
      radius: 25,
      blur: 15,
      maxZoom: 17,
      max: 1.0,
      gradient: {
        0.0: '#00ff00',  // Green (low)
        0.5: '#ffff00',  // Yellow (medium)
        0.7: '#ff9900',  // Orange
        1.0: '#ff0000'   // Red (high)
      }
    }).addTo(map);

    return () => {
      map.removeLayer(heat);
    };
  }, [complaints, map]);

  return null;
};

// Component to fit map bounds to markers
const FitBounds = ({ complaints }) => {
  const map = useMap();
  
  useEffect(() => {
    if (complaints && complaints.length > 0) {
      try {
        const bounds = complaints.map(c => [c.normalizedLocation.lat, c.normalizedLocation.lng]);
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
      } catch (error) {
        console.error('Error fitting bounds:', error);
      }
    }
  }, [complaints, map]);
  
  return null;
};

// Custom marker color based on complaint age
const getMarkerColor = (createdAt) => {
  const hours = (Date.now() - new Date(createdAt)) / (1000 * 60 * 60);
  if (hours < 24) return '🟢'; // Green - Fresh
  if (hours < 48) return '🟡'; // Yellow - 1-2 days
  return '🔴'; // Red - Urgent (>72 hours)
};

const getPriorityEmoji = (priority) => {
  switch (priority) {
    case 'High': return '🔥';
    case 'Medium': return '⚡';
    case 'Low': return '📌';
    default: return '📍';
  }
};

const MapView = ({ complaints, onComplaintClick }) => {
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [localityCache, setLocalityCache] = useState({});
  const defaultCenter = [20.5937, 78.9629]; // Center of India
  const defaultZoom = 5;

  // Fetch localities for complaints
  useEffect(() => {
    const fetchLocalities = async () => {
      if (!complaints || complaints.length === 0) return;

      for (const complaint of complaints) {
        const key = `${complaint.normalizedLocation.lat},${complaint.normalizedLocation.lng}`;
        
        // Skip if already cached or has locality
        if (localityCache[key] || complaint.locality) continue;

        const geocodeResult = await reverseGeocode(
          complaint.normalizedLocation.lat,
          complaint.normalizedLocation.lng
        );

        if (geocodeResult) {
          setLocalityCache(prev => ({
            ...prev,
            [key]: geocodeResult
          }));
        }

        // Rate limiting - wait 1 second between requests
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    };

    fetchLocalities();
  }, [complaints]);

  if (!complaints || complaints.length === 0) {
    return (
      <div className="map-empty-state">
        <p>📍 No complaints to display on map</p>
      </div>
    );
  }

  // Filter complaints with valid locations and normalize coordinates
  const validComplaints = complaints.filter(c => {
    // Check for GeoJSON format
    if (c.location?.coordinates && Array.isArray(c.location.coordinates)) {
      return c.location.coordinates[0] && c.location.coordinates[1];
    }
    // Check for old format
    if (c.location?.latitude && c.location?.longitude) {
      return true;
    }
    return false;
  }).map(c => {
    // Normalize location to [lat, lng] for Leaflet
    let lat, lng;
    
    if (c.location.coordinates && Array.isArray(c.location.coordinates)) {
      // GeoJSON format: [longitude, latitude]
      lng = c.location.coordinates[0];
      lat = c.location.coordinates[1];
    } else {
      // Old format: {latitude, longitude}
      lat = c.location.latitude;
      lng = c.location.longitude;
    }
    
    // Get locality from cache
    const key = `${lat},${lng}`;
    const cachedLocality = localityCache[key];
    
    return {
      ...c,
      normalizedLocation: { lat, lng },
      locality: c.locality || cachedLocality?.locality || 'Fetching location...',
      fullAddress: c.address || cachedLocality?.fullAddress
    };
  });

  if (validComplaints.length === 0) {
    return (
      <div className="map-empty-state">
        <p>📍 No complaints with valid location data</p>
      </div>
    );
  }

  console.log('📍 Valid complaints for map:', validComplaints.length);

  return (
    <div className="map-container">
      {/* Map Controls */}
      <div className="map-controls">
        <button 
          className={`map-control-btn ${showHeatmap ? 'active' : ''}`}
          onClick={() => setShowHeatmap(!showHeatmap)}
        >
          {showHeatmap ? '🔥 Hide Heatmap' : '🗺️ Show Heatmap'}
        </button>
      </div>

      <MapContainer
        center={defaultCenter}
        zoom={defaultZoom}
        style={{ height: '600px', width: '100%', borderRadius: '10px' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <FitBounds complaints={validComplaints} />
        
        {showHeatmap && <HeatmapLayer complaints={validComplaints} />}

        {validComplaints.map((complaint) => (
          <Marker
            key={complaint._id}
            position={[complaint.normalizedLocation.lat, complaint.normalizedLocation.lng]}
          >
            <Popup maxWidth={350}>
              <div className="map-popup">
                <div className="popup-header">
                  <h4>
                    {getMarkerColor(complaint.createdAt)} {complaint.title}
                  </h4>
                  <span className={`badge badge-${complaint.priority?.toLowerCase() || 'medium'}`}>
                    {getPriorityEmoji(complaint.priority)} {complaint.priority || 'Medium'}
                  </span>
                </div>
                
                <div className="popup-content">
                  <p className="popup-description">{complaint.description}</p>
                  
                  <div className="popup-details">
                    <div className="popup-detail-item">
                      <strong>🏢 Department:</strong>
                      <span>{complaint.department}</span>
                    </div>
                    <div className="popup-detail-item">
                      <strong>📊 Status:</strong>
                      <span className={`status-${complaint.status.toLowerCase().replace(' ', '-')}`}>
                        {complaint.status}
                      </span>
                    </div>
                    <div className="popup-detail-item">
                      <strong>📍 Location:</strong>
                      <span>{complaint.locality}</span>
                    </div>
                    {complaint.fullAddress && (
                      <div className="popup-detail-item">
                        <strong>🗺️ Address:</strong>
                        <span style={{ fontSize: '0.8rem' }}>{complaint.fullAddress}</span>
                      </div>
                    )}
                    <div className="popup-detail-item">
                      <strong>📅 Reported:</strong>
                      <span>{new Date(complaint.createdAt).toLocaleDateString()}</span>
                    </div>
                    {complaint.citizen && (
                      <div className="popup-detail-item">
                        <strong>👤 Citizen:</strong>
                        <span>{complaint.citizen.name}</span>
                      </div>
                    )}
                  </div>

                  {complaint.aiAnalysis?.summary && (
                    <div className="popup-ai-summary">
                      <strong>🤖 AI Analysis:</strong>
                      <p>{complaint.aiAnalysis.summary}</p>
                    </div>
                  )}

                  {onComplaintClick && (
                    <button
                      className="popup-btn"
                      onClick={() => onComplaintClick(complaint)}
                    >
                      View Full Details
                    </button>
                  )}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Map Legend */}
      <div className="map-legend">
        <h4>🗺️ Map Legend</h4>
        
        <div className="legend-section">
          <h5>Age Indicators:</h5>
          <div className="legend-items">
            <div className="legend-item">
              <span className="legend-marker">🟢</span>
              <span>{"< 24 hours (Fresh)"}</span>
            </div>
            <div className="legend-item">
              <span className="legend-marker">🟡</span>
              <span>24-48 hours</span>
            </div>
            <div className="legend-item">
              <span className="legend-marker">🔴</span>
              <span>{"> 72 hours (Urgent)"}</span>
            </div>
          </div>
        </div>

        <div className="legend-section">
          <h5>Priority Levels:</h5>
          <div className="legend-items">
            <div className="legend-item">
              <span className="legend-marker">🔥</span>
              <span>High Priority</span>
            </div>
            <div className="legend-item">
              <span className="legend-marker">⚡</span>
              <span>Medium Priority</span>
            </div>
            <div className="legend-item">
              <span className="legend-marker">📌</span>
              <span>Low Priority</span>
            </div>
          </div>
        </div>

        {showHeatmap && (
          <div className="legend-section">
            <h5>Heatmap:</h5>
            <div className="legend-items">
              <div className="legend-item">
                <span className="legend-color" style={{ background: '#ff0000' }}></span>
                <span>High Density</span>
              </div>
              <div className="legend-item">
                <span className="legend-color" style={{ background: '#ff9900' }}></span>
                <span>Medium Density</span>
              </div>
              <div className="legend-item">
                <span className="legend-color" style={{ background: '#00ff00' }}></span>
                <span>Low Density</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MapView;