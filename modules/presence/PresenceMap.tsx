
import React, { useEffect, useRef } from 'react';

declare var L: any;

interface PresenceMapProps {
  userLat: number;
  userLng: number;
  officeLat: number;
  officeLng: number;
  radius: number;
  isDraggable?: boolean;
  onLocationChange?: (lat: number, lng: number) => void;
}

const PresenceMap: React.FC<PresenceMapProps> = ({ 
  userLat, 
  userLng, 
  officeLat, 
  officeLng, 
  radius,
  isDraggable = false,
  onLocationChange
}) => {
  const mapRef = useRef<any>(null);
  const containerId = useRef(`map-presence-${Math.random().toString(36).substr(2, 9)}`);

  useEffect(() => {
    if (!mapRef.current) {
      mapRef.current = L.map(containerId.current, { zoomControl: false, attributionControl: false }).setView([officeLat, officeLng], 16);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(mapRef.current);
      
      // Office Circle
      mapRef.current.officeCircle = L.circle([officeLat, officeLng], {
        color: '#006E62',
        fillColor: '#006E62',
        fillOpacity: 0.1,
        radius: radius
      }).addTo(mapRef.current);

      // Office Marker (Pusat Lokasi)
      mapRef.current.officeMarker = L.marker([officeLat, officeLng], {
        draggable: isDraggable,
        icon: L.divIcon({ 
          className: 'bg-[#006E62] w-3 h-3 rounded-full border-2 border-white' 
        })
      })
      .bindTooltip(isDraggable ? "Geser untuk atur lokasi" : "Lokasi Seharusnya", { 
        permanent: true, 
        direction: 'top', 
        className: 'text-[9px] font-bold text-[#006E62] border-none shadow-none bg-white/80 px-1 rounded' 
      })
      .addTo(mapRef.current);

      if (isDraggable && onLocationChange) {
        mapRef.current.officeMarker.on('dragend', (e: any) => {
          const { lat, lng } = e.target.getLatLng();
          onLocationChange(lat, lng);
        });
      }

      // User ACTUAL Location Marker (HERE()) - Red Static Pin
      if (!isDraggable) {
        mapRef.current.userMarker = L.marker([userLat, userLng], {
          icon: L.divIcon({ 
            className: 'bg-red-600 w-3 h-3 rounded-full border-2 border-white shadow-lg' 
          })
        })
        .bindTooltip("Lokasi Presensi", { permanent: true, direction: 'top', className: 'text-[9px] font-bold text-red-600 border-none shadow-none bg-white/80 px-1 rounded' })
        .addTo(mapRef.current);

        const bounds = L.latLngBounds([[userLat, userLng], [officeLat, officeLng]]);
        mapRef.current.fitBounds(bounds, { padding: [20, 20] });
      }
    } else {
      // Update office marker and circle
      if (mapRef.current.officeMarker) {
        mapRef.current.officeMarker.setLatLng([officeLat, officeLng]);
      }
      if (mapRef.current.officeCircle) {
        mapRef.current.officeCircle.setLatLng([officeLat, officeLng]);
        mapRef.current.officeCircle.setRadius(radius);
      }

      // Update user marker position
      if (mapRef.current.userMarker && !isDraggable) {
        mapRef.current.userMarker.setLatLng([userLat, userLng]);
        
        // Update bounds
        const bounds = L.latLngBounds([[userLat, userLng], [officeLat, officeLng]]);
        mapRef.current.fitBounds(bounds, { padding: [20, 20] });
      } else if (isDraggable) {
        mapRef.current.setView([officeLat, officeLng]);
      }

      // Update draggable state
      if (mapRef.current.officeMarker) {
        if (isDraggable) {
          mapRef.current.officeMarker.dragging.enable();
          mapRef.current.officeMarker.on('dragend', (e: any) => {
            const { lat, lng } = e.target.getLatLng();
            onLocationChange?.(lat, lng);
          });
          mapRef.current.officeMarker.setTooltipContent("Geser untuk atur lokasi");
        } else {
          mapRef.current.officeMarker.dragging.disable();
          mapRef.current.officeMarker.off('dragend');
          mapRef.current.officeMarker.setTooltipContent("Lokasi Seharusnya");
        }
      }
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [userLat, userLng, officeLat, officeLng, radius]);

  return (
    <div id={containerId.current} className="w-full h-48 rounded-lg border border-gray-100 shadow-inner overflow-hidden" />
  );
};

export default PresenceMap;
