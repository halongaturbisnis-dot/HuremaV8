
import React from 'react';
import { X, MapPin, Phone, Target, Layers } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Location } from '../../../types';

// Fix Leaflet icon issue
let DefaultIcon = L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

interface LocationViewModalProps {
  location: Location;
  onClose: () => void;
}

const LocationViewModal: React.FC<LocationViewModalProps> = ({ location, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#006E62]/10 rounded-lg">
              <MapPin size={20} className="text-[#006E62]" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-800 leading-tight">Detail Lokasi</h3>
              <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">Informasi Penempatan</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Layers size={14} className="text-[#006E62]" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#006E62]">{location.location_type || 'Lokasi'}</span>
                </div>
                <h2 className="text-xl font-bold text-gray-800 tracking-tight">{location.name}</h2>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400">Alamat Lengkap</p>
                  <p className="text-xs text-gray-600 leading-relaxed font-medium">
                    {location.address}, {location.city}, {location.province} {location.zip_code}
                  </p>
                </div>

                <div className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border border-gray-100">
                  <div className="space-y-1">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400">Telepon</p>
                    <div className="flex items-center gap-2 text-xs font-semibold text-gray-700">
                      <Phone size={12} className="text-[#006E62]" /> {location.phone || '-'}
                    </div>
                  </div>
                  <div className="space-y-1 text-right">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400">Radius Presensi</p>
                    <div className="flex items-center gap-2 text-xs font-semibold text-gray-700 justify-end">
                      <Target size={12} className="text-[#006E62]" /> {location.radius}m
                    </div>
                  </div>
                </div>

                {location.description && (
                  <div className="space-y-1">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400">Keterangan</p>
                    <p className="text-xs text-gray-600 italic leading-relaxed bg-gray-50 p-3 rounded border border-gray-100">
                      "{location.description}"
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="h-[250px] md:h-full min-h-[250px] rounded-xl overflow-hidden border border-gray-200 shadow-inner">
              {location.latitude && location.longitude ? (
                <MapContainer 
                  center={[location.latitude, location.longitude]} 
                  zoom={15} 
                  style={{ height: '100%', width: '100%' }}
                  zoomControl={false}
                >
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <Marker position={[location.latitude, location.longitude]} />
                  <Circle 
                    center={[location.latitude, location.longitude]} 
                    radius={location.radius}
                    pathOptions={{ color: '#006E62', fillColor: '#006E62', fillOpacity: 0.1 }}
                  />
                </MapContainer>
              ) : (
                <div className="w-full h-full bg-gray-50 flex flex-col items-center justify-center text-gray-400">
                  <MapPin size={40} strokeWidth={1} className="mb-2" />
                  <p className="text-[10px] font-bold uppercase tracking-widest">Koordinat tidak tersedia</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end">
          <button 
            onClick={onClose}
            className="px-6 py-2 bg-white border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors text-xs font-bold uppercase tracking-widest"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};

export default LocationViewModal;
