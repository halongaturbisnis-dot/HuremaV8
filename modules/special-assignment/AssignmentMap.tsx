import React, { useEffect, useRef } from 'react';

declare var L: any;

interface AssignmentMapProps {
  lat: number;
  lng: number;
  radius: number;
  isDraggable?: boolean;
  onLocationChange?: (lat: number, lng: number) => void;
}

const AssignmentMap: React.FC<AssignmentMapProps> = ({ 
  lat, 
  lng, 
  radius,
  isDraggable = false,
  onLocationChange
}) => {
  const mapRef = useRef<any>(null);
  const containerId = useRef(`map-assignment-${Math.random().toString(36).substr(2, 9)}`);

  useEffect(() => {
    if (!mapRef.current) {
      mapRef.current = L.map(containerId.current, { zoomControl: false, attributionControl: false }).setView([lat, lng], 16);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(mapRef.current);
      
      // Circle
      mapRef.current.officeCircle = L.circle([lat, lng], {
        color: '#006E62',
        fillColor: '#006E62',
        fillOpacity: 0.1,
        radius: radius || 0
      }).addTo(mapRef.current);

      // Marker
      mapRef.current.officeMarker = L.marker([lat, lng], {
        draggable: isDraggable,
        icon: L.divIcon({ 
          className: 'bg-[#006E62] w-3 h-3 rounded-full border-2 border-white shadow-lg' 
        })
      })
      .bindTooltip(isDraggable ? "Geser untuk atur lokasi" : "Lokasi Penugasan", { 
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
    } else {
      // Update marker and circle
      if (mapRef.current.officeMarker) {
        mapRef.current.officeMarker.setLatLng([lat, lng]);
        
        // Update draggable state dynamically if needed
        if (isDraggable) {
          mapRef.current.officeMarker.dragging?.enable();
          mapRef.current.officeMarker.setTooltipContent("Geser untuk atur lokasi");
        } else {
          mapRef.current.officeMarker.dragging?.disable();
          mapRef.current.officeMarker.setTooltipContent("Lokasi Penugasan");
        }
      }
      
      if (mapRef.current.officeCircle) {
        mapRef.current.officeCircle.setLatLng([lat, lng]);
        mapRef.current.officeCircle.setRadius(radius || 0);
      }

      mapRef.current.setView([lat, lng]);
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [lat, lng, radius, isDraggable]);

  return (
    <div id={containerId.current} className="w-full h-full" />
  );
};

export default AssignmentMap;
