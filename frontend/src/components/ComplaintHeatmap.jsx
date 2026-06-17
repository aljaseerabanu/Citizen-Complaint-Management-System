import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Load leaflet.heat from CDN
const loadLeafletHeat = () => {
  return new Promise((resolve, reject) => {
    if (window.L && window.L.heatLayer) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet.heat/0.2.0/leaflet-heat.js';
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
};

const ComplaintHeatmap = ({ complaints }) => {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const heatLayer = useRef(null);
  const markersLayer = useRef(null);

  useEffect(() => {
    const initMap = async () => {
      // Load leaflet.heat library
      try {
        await loadLeafletHeat();
      } catch (error) {
        console.error('Failed to load leaflet.heat:', error);
        return;
      }

      // Initialize map only once
      if (!mapInstance.current && mapRef.current) {
        mapInstance.current = L.map(mapRef.current).setView([20.5937, 78.9629], 5);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors',
          maxZoom: 18
        }).addTo(mapInstance.current);

        // Create layer for markers
        markersLayer.current = L.layerGroup().addTo(mapInstance.current);
      }
    };

    initMap();
  }, []);

  useEffect(() => {
    if (!mapInstance.current || !window.L.heatLayer) return;

    // Clear existing layers
    if (heatLayer.current) {
      mapInstance.current.removeLayer(heatLayer.current);
    }
    if (markersLayer.current) {
      markersLayer.current.clearLayers();
    }

    if (complaints.length === 0) return;

    // Filter complaints with valid locations
    const validComplaints = complaints.filter(
      c => c.location?.latitude && c.location?.longitude
    );

    if (validComplaints.length === 0) {
      console.warn('No complaints with valid locations');
      return;
    }

    // Prepare heatmap data
    const heatData = validComplaints.map(complaint => {
      let intensity = 0.5;
      if (complaint.priority === 'High') intensity = 1.0;
      else if (complaint.priority === 'Medium') intensity = 0.7;
      else if (complaint.priority === 'Low') intensity = 0.4;

      return [
        parseFloat(complaint.location.latitude),
        parseFloat(complaint.location.longitude),
        intensity
      ];
    });

    // Create heat layer
    heatLayer.current = L.heatLayer(heatData, {
      radius: 25,
      blur: 15,
      maxZoom: 17,
      max: 1.0,
      gradient: {
        0.0: '#0000ff',
        0.5: '#ffff00',
        0.7: '#ff9900',
        1.0: '#ff0000'
      }
    }).addTo(mapInstance.current);

    // Add individual markers
    validComplaints.forEach(complaint => {
      const lat = parseFloat(complaint.location.latitude);
      const lng = parseFloat(complaint.location.longitude);

      const markerColor = 
        complaint.priority === 'High' ? '#ef4444' :
        complaint.priority === 'Medium' ? '#f59e0b' : '#3b82f6';

      const marker = L.circleMarker([lat, lng], {
        radius: 6,
        fillColor: markerColor,
        color: '#fff',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.8
      });

      marker.bindPopup(`
        <div style="min-width: 200px;">
          <h4 style="margin: 0 0 8px 0; color: #1e293b; font-size: 14px;">${complaint.title}</h4>
          <p style="margin: 4px 0; color: #64748b; font-size: 13px;">
            <strong>Status:</strong> ${complaint.status}
          </p>
          <p style="margin: 4px 0; color: #64748b; font-size: 13px;">
            <strong>Priority:</strong> 
            <span style="color: ${markerColor}; font-weight: 600;">${complaint.priority || 'Medium'}</span>
          </p>
          <p style="margin: 4px 0; color: #64748b; font-size: 13px;">
            <strong>Location:</strong> ${complaint.locality || 'Unknown'}
          </p>
          <p style="margin: 4px 0; color: #64748b; font-size: 13px;">
            <strong>Department:</strong> ${complaint.department}
          </p>
        </div>
      `);

      markersLayer.current.addLayer(marker);
    });

    // Fit map to show all points
    const bounds = L.latLngBounds(heatData.map(d => [d[0], d[1]]));
    mapInstance.current.fitBounds(bounds, { padding: [50, 50] });

  }, [complaints]);

  return (
    <div>
      <div 
        ref={mapRef} 
        style={{ 
          width: '100%', 
          height: '600px', 
          borderRadius: '12px', 
          overflow: 'hidden',
          border: '1px solid #e5e7eb'
        }} 
      />
      <div style={{ 
        marginTop: '1rem', 
        padding: '1rem', 
        background: '#f8fafc', 
        borderRadius: '8px',
        display: 'flex',
        gap: '2rem',
        flexWrap: 'wrap',
        alignItems: 'center'
      }}>
        <div>
          <strong>🎨 Legend:</strong>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ 
            width: '20px', 
            height: '20px', 
            borderRadius: '50%', 
            background: '#ef4444',
            border: '2px solid white',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }} />
          <span>High Priority</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ 
            width: '20px', 
            height: '20px', 
            borderRadius: '50%', 
            background: '#f59e0b',
            border: '2px solid white',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }} />
          <span>Medium Priority</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ 
            width: '20px', 
            height: '20px', 
            borderRadius: '50%', 
            background: '#3b82f6',
            border: '2px solid white',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }} />
          <span>Low Priority</span>
        </div>
        <div style={{ marginLeft: 'auto', fontWeight: '600', color: '#1e293b' }}>
          📍 Total: {complaints.filter(c => c.location?.latitude).length} complaints
        </div>
      </div>
    </div>
  );
};

export default ComplaintHeatmap;