
import React, { useEffect, useRef } from 'react';

declare var L: any;

interface PresenceMapProps {
  userLat: number;
  userLng: number;
  officeLat: number;
  officeLng: number;
  radius: number;
}

const PresenceMap: React.FC<PresenceMapProps> = ({ userLat, userLng, officeLat, officeLng, radius }) => {
  const mapRef = useRef<any>(null);
  const containerId = useRef(`map-presence-${Math.random().toString(36).substr(2, 9)}`);

  useEffect(() => {
    if (!mapRef.current) {
      mapRef.current = L.map(containerId.current, { zoomControl: false, attributionControl: false }).setView([officeLat, officeLng], 16);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(mapRef.current);
      
      // Office Circle
      L.circle([officeLat, officeLng], {
        color: '#006E62',
        fillColor: '#006E62',
        fillOpacity: 0.1,
        radius: radius
      }).addTo(mapRef.current);

      // Office Marker (Pusat Lokasi)
      L.marker([officeLat, officeLng], {
        icon: L.divIcon({ 
          className: 'bg-[#006E62] w-3 h-3 rounded-full border-2 border-white' 
        })
      })
      .bindTooltip("Lokasi Seharusnya", { permanent: true, direction: 'top', className: 'text-[9px] font-bold text-[#006E62] border-none shadow-none bg-white/80 px-1 rounded' })
      .addTo(mapRef.current);

      // User ACTUAL Location Marker (HERE()) - Red Static Pin
      L.marker([userLat, userLng], {
        icon: L.divIcon({ 
          className: 'bg-red-600 w-3 h-3 rounded-full border-2 border-white shadow-lg' 
        })
      })
      .bindTooltip("Lokasi Presensi", { permanent: true, direction: 'top', className: 'text-[9px] font-bold text-red-600 border-none shadow-none bg-white/80 px-1 rounded' })
      .addTo(mapRef.current);

      const bounds = L.latLngBounds([[userLat, userLng], [officeLat, officeLng]]);
      mapRef.current.fitBounds(bounds, { padding: [20, 20] });
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [userLat, userLng]);

  return (
    <div id={containerId.current} className="w-full h-full rounded-lg border border-gray-100 shadow-inner overflow-hidden" />
  );
};

export default PresenceMap;
