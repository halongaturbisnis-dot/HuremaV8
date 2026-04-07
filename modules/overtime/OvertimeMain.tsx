import React, { useState, useEffect, useRef } from 'react';
import { Timer, Clock, MapPin, History, AlertCircle, Map as MapIcon, Camera, UserX, ShieldCheck, Info, Loader2, RefreshCw, Check } from 'lucide-react';
import Swal from 'sweetalert2';
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import { overtimeService } from '../../services/overtimeService';
import { presenceService } from '../../services/presenceService';
import { accountService } from '../../services/accountService';
import { specialAssignmentService } from '../../services/specialAssignmentService';
import { authService } from '../../services/authService';
import { googleDriveService } from '../../services/googleDriveService';
import { settingsService } from '../../services/settingsService';
import { submissionService } from '../../services/submissionService';
import { timeUtils } from '../../lib/timeUtils';
import { Account, Overtime, SpecialAssignment } from '../../types';
import PresenceCamera from '../presence/PresenceCamera';
import PresenceMap from '../presence/PresenceMap';
import OvertimeHistory from './OvertimeHistory';
import LoadingSpinner from '../../components/Common/LoadingSpinner';
import ProtectionOverlay from '../../components/ui/ProtectionOverlay';

const OvertimeMain: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'capture' | 'history'>('capture');
  const [account, setAccount] = useState<Account | null>(null);
  const [todayOT, setTodayOT] = useState<Overtime | null>(null);
  const [activeOT, setActiveOT] = useState<Overtime | null>(null);
  const [recentLogs, setRecentLogs] = useState<Overtime[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isRegularActive, setIsRegularActive] = useState(false);
  const [serverTime, setServerTime] = useState<Date>(new Date());
  const [coords, setCoords] = useState<{lat: number, lng: number} | null>(null);
  const [currentAddress, setCurrentAddress] = useState<string | null>(null);
  const [isFetchingAddress, setIsFetchingAddress] = useState(false);
  const [distance, setDistance] = useState<number | null>(null);
  const [activeSpecialAssignment, setActiveSpecialAssignment] = useState<SpecialAssignment | null>(null);
  const [landmarker, setLandmarker] = useState<any>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<Blob | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [detectedTz, setDetectedTz] = useState<string>(timeUtils.getLocalTimeZone());
  const [otReason, setOtReason] = useState('');
  const watchId = useRef<number | null>(null);

  const currentUser = authService.getCurrentUser();
  const currentAccountId = currentUser?.id;

  useEffect(() => {
    if (!currentAccountId) return;
    
    fetchInitialData();
    initializeAi();
    const timeInterval = setInterval(() => {
      setServerTime(prev => new Date(prev.getTime() + 1000));
    }, 1000);
    
    startWatchingLocation();

    return () => {
      clearInterval(timeInterval);
      if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
      if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
    };
  }, [currentAccountId, photoPreviewUrl]);

  // Update timezone based on coordinates
  useEffect(() => {
    if (coords) {
      const tz = timeUtils.getTimeZoneFromCoords(coords.lat, coords.lng);
      if (tz !== detectedTz) {
        setDetectedTz(tz);
      }
    }
  }, [coords, detectedTz]);

  // Re-fetch today's data if timezone changes
  useEffect(() => {
    if (currentAccountId && detectedTz) {
      const refreshData = async () => {
        const [ot, activeOvertime, isRegActive] = await Promise.all([
          overtimeService.getTodayOvertime(currentAccountId, detectedTz),
          overtimeService.getActiveOvertime(currentAccountId),
          presenceService.isRegularSessionActive(currentAccountId)
        ]);
        setTodayOT(ot);
        setActiveOT(activeOvertime);
        setIsRegularActive(isRegActive);
      };
      refreshData();
    }
  }, [currentAccountId, detectedTz]);

  const fetchInitialData = async () => {
    if (!currentAccountId) return;
    try {
      setIsLoading(true);
      const [acc, ot, activeOvertime, history, isRegActive, sTime] = await Promise.all([
        accountService.getById(currentAccountId),
        overtimeService.getTodayOvertime(currentAccountId, detectedTz),
        overtimeService.getActiveOvertime(currentAccountId),
        overtimeService.getRecentHistory(currentAccountId),
        presenceService.isRegularSessionActive(currentAccountId),
        presenceService.getServerTime()
      ]);
      setAccount(acc as any);
      setTodayOT(ot);
      setActiveOT(activeOvertime);
      setRecentLogs(history);
      setIsRegularActive(isRegActive);
      setServerTime(sTime);

      const dateStr = sTime.toISOString().split('T')[0];
      const specialAssignment = await specialAssignmentService.getActiveForAccount(currentAccountId, dateStr);
      setActiveSpecialAssignment(specialAssignment);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const initializeAi = async () => {
    if (landmarker || isAiLoading) return;
    try {
      setIsAiLoading(true);
      const filesetResolver = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
      );
      const lm = await FaceLandmarker.createFromOptions(filesetResolver, {
        baseOptions: {
          modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
          delegate: "GPU"
        },
        outputFaceBlendshapes: true,
        runningMode: "VIDEO",
        numFaces: 1
      });
      setLandmarker(lm);
    } catch (err) {
      console.error("AI Background Init Error:", err);
    } finally {
      setIsAiLoading(false);
    }
  };

  const startWatchingLocation = () => {
    if (navigator.geolocation) {
      watchId.current = navigator.geolocation.watchPosition(
        (pos) => {
          if (pos.coords.accuracy < 1000) {
            setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          }
        },
        (err) => console.error("GPS Error:", err),
        { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 }
      );
    }
  };

  useEffect(() => {
    if (coords) {
      if (activeSpecialAssignment) {
        const d = presenceService.calculateDistance(
          coords.lat, coords.lng,
          activeSpecialAssignment.latitude, activeSpecialAssignment.longitude
        );
        setDistance(d);
      } else if (account?.location) {
        const d = presenceService.calculateDistance(
          coords.lat, coords.lng,
          account.location.latitude, account.location.longitude
        );
        setDistance(d);
      }
    }
  }, [coords, account, activeSpecialAssignment]);

  useEffect(() => {
    if (coords && !currentAddress && !isFetchingAddress) {
      const fetchAddress = async () => {
        try {
          setIsFetchingAddress(true);
          const addr = await presenceService.getReverseGeocode(coords.lat, coords.lng);
          setCurrentAddress(addr);
        } catch (error) {
          console.error("Error fetching address:", error);
        } finally {
          setIsFetchingAddress(false);
        }
      };
      fetchAddress();
    }
  }, [coords, currentAddress, isFetchingAddress]);

  const handleCaptureComplete = (photoBlob: Blob) => {
    setCapturedPhoto(photoBlob);
    setPhotoPreviewUrl(URL.createObjectURL(photoBlob));
    setIsCameraActive(false);
  };

  const resetCapture = () => {
    setCapturedPhoto(null);
    if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
    setPhotoPreviewUrl(null);
    setOtReason('');
  };

  const handleSubmitOvertime = async () => {
    if (!capturedPhoto || !account || !coords) return;

    if (!otReason.trim()) {
      return Swal.fire('Alasan Wajib', 'Sebutkan alasan/kegiatan lembur Anda.', 'warning');
    }

    try {
      setIsCapturing(true);
      
      const isCurrentlyCheckingOut = !!activeOT;

      const [address, photoId, otPolicy] = await Promise.all([
        currentAddress || presenceService.getReverseGeocode(coords.lat, coords.lng),
        googleDriveService.uploadFile(new File([capturedPhoto], `OT_${isCurrentlyCheckingOut ? 'OUT' : 'IN'}_${Date.now()}.jpg`)),
        settingsService.getSetting('ot_approval_policy', 'manual')
      ]);

      const currentTimeStr = serverTime.toISOString();
      
      if (!isCurrentlyCheckingOut) {
        await overtimeService.checkIn({
          account_id: account.id,
          check_in: currentTimeStr,
          in_latitude: coords.lat,
          in_longitude: coords.lng,
          in_photo_id: photoId,
          in_address: address,
          reason: otReason
        });
      } else {
        if (!activeOT?.id) {
          throw new Error("ID referensi lembur tidak ditemukan. Harap muat ulang halaman.");
        }

        const start = new Date(activeOT.check_in!);
        const diffMs = serverTime.getTime() - start.getTime();
        const diffMins = Math.max(0, Math.floor(diffMs / 60000));
        
        const h = Math.floor(diffMs / 3600000);
        const m = Math.floor((diffMs % 3600000) / 60000);
        const s = Math.floor((diffMs % 60000) / 1000);
        const durationFormatted = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;

        await overtimeService.checkOut(activeOT.id, {
          check_out: currentTimeStr,
          out_latitude: coords.lat,
          out_longitude: coords.lng,
          out_photo_id: photoId,
          out_address: address,
          duration_minutes: diffMins,
          work_duration: durationFormatted,
          reason: otReason
        });

        if (otPolicy === 'manual') {
          await submissionService.create({
            account_id: account.id,
            type: 'Lembur',
            description: `Lembur pada ${new Date(activeOT.check_in!).toLocaleDateString('id-ID')}. Kegiatan: ${otReason}`,
            file_id: photoId,
            submission_data: {
              overtime_id: activeOT.id,
              date: activeOT.check_in!.split('T')[0],
              duration: durationFormatted,
              minutes: diffMins,
              check_in: activeOT.check_in,
              check_out: currentTimeStr
            }
          });
        }
      }

      resetCapture();
      
      let successMsg = `Presensi Lembur dicatat.`;
      if (isCurrentlyCheckingOut && otPolicy === 'manual') {
        successMsg = `Presensi Lembur tersimpan. Pengajuan verifikasi telah dikirim ke Admin.`;
      } else if (isCurrentlyCheckingOut && otPolicy === 'auto') {
        successMsg = `Presensi Lembur tersimpan dan disetujui otomatis oleh sistem.`;
      }

      Swal.fire({ title: 'Berhasil!', text: successMsg, icon: 'success', timer: 3000, showConfirmButton: false });
      await fetchInitialData();
    } catch (error: any) {
      console.error("Overtime Process Error:", error);
      Swal.fire({
        title: 'Gagal',
        text: error.message || 'Terjadi kesalahan sistem saat memproses lembur.',
        icon: 'error',
        confirmButtonColor: '#d97706'
      });
    } finally {
      setIsCapturing(false);
    }
  };

  const getOTDurationLive = () => {
    if (!todayOT?.check_in || todayOT.check_out) return null;
    const start = new Date(todayOT.check_in);
    const diffMs = serverTime.getTime() - start.getTime();
    if (diffMs < 0) return "00 : 00 : 00";
    const hours = Math.floor(diffMs / 3600000);
    const minutes = Math.floor((diffMs % 3600000) / 60000);
    const seconds = Math.floor((diffMs % 60000) / 1000);
    return `${String(hours).padStart(2, '0')} : ${String(minutes).padStart(2, '0')} : ${String(seconds).padStart(2, '0')}`;
  };

  if (isLoading) return <LoadingSpinner message="Menghubungkan Modul Lembur..." />;
  if (!account) return <div className="p-10 text-center">Akun tidak valid.</div>;

  const isCheckOut = !!todayOT && !todayOT.check_out;
  const isLimited = isCheckOut 
    ? account.is_presence_limited_ot_out === true 
    : account.is_presence_limited_ot_in === true;
  const effectiveRadius = activeSpecialAssignment ? activeSpecialAssignment.radius : (account?.location?.radius || 100);
  const isWithinRadius = distance !== null && distance <= effectiveRadius;
  const isBlockedByLocation = isLimited && !isWithinRadius;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {activeSpecialAssignment && (
        <div className="bg-amber-50 border border-amber-200 rounded-3xl p-6 flex items-center gap-6 animate-in slide-in-from-top duration-500 shadow-sm">
          <div className="w-14 h-14 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-600 shrink-0 shadow-inner">
            <ShieldCheck size={32} />
          </div>
          <div className="flex-1">
            <h4 className="text-xs font-black text-amber-800 uppercase tracking-[0.2em] mb-1">Penugasan Khusus Aktif</h4>
            <p className="text-[11px] text-amber-600 font-bold uppercase tracking-widest">{activeSpecialAssignment.title} • {activeSpecialAssignment.location_name}</p>
          </div>
          <div className="px-4 py-2 bg-amber-200/50 rounded-xl text-[10px] font-black text-amber-800 uppercase tracking-[0.2em] shadow-sm">
            Prioritas Utama
          </div>
        </div>
      )}

      {/* Desktop Header - Hidden on Mobile */}
      <div className="hidden md:flex bg-white rounded-3xl border border-gray-100 p-8 shadow-sm justify-between items-center gap-8">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600 shadow-inner">
            <Timer size={32} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-gray-800 tracking-tight">Presensi Lembur</h2>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-[0.2em] mt-1">
              {account.full_name} • {account.internal_nik}
            </p>
          </div>
        </div>
        
        <div className="flex gap-2 p-1.5 bg-gray-50 rounded-2xl border border-gray-100">
          <button 
            onClick={() => setActiveTab('capture')}
            className={`flex items-center gap-2.5 px-8 py-3.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'capture' ? 'bg-white text-amber-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
          >
            <Camera size={18} /> Capturing
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2.5 px-8 py-3.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'history' ? 'bg-white text-amber-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
          >
            <History size={18} /> Log OT
          </button>
        </div>
      </div>

      {activeTab === 'capture' ? (
        <div className="flex flex-col gap-8 animate-in fade-in duration-700">
          {/* 1. Geotag Card (Top) */}
          <div className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm">
             <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-50 rounded-lg text-amber-600">
                    <MapPin size={18} />
                  </div>
                  <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-400">Status Geotag</h4>
                </div>
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${!isLimited ? 'bg-blue-50 text-blue-600' : (isWithinRadius ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600')}`}>
                  <div className={`w-2 h-2 rounded-full ${!isLimited ? 'bg-blue-500' : (isWithinRadius ? 'bg-emerald-500' : 'bg-rose-500')}`}></div>
                  {!isLimited ? 'Bebas Lokasi' : (isWithinRadius ? 'Area Kerja' : 'Diluar Area')}
                </div>
             </div>
             
             {((activeSpecialAssignment) || (account?.location)) && coords ? (
               <div className="space-y-6">
                  <PresenceMap 
                    userLat={coords.lat} 
                    userLng={coords.lng} 
                    officeLat={activeSpecialAssignment ? activeSpecialAssignment.latitude : account.location.latitude} 
                    officeLng={activeSpecialAssignment ? activeSpecialAssignment.longitude : account.location.longitude}
                    radius={effectiveRadius}
                  />
                  
                  <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin size={14} className="text-amber-600" />
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Alamat Geotag</span>
                    </div>
                    <p className="text-[11px] font-bold text-gray-700 leading-relaxed">
                      {isFetchingAddress ? (
                        <span className="flex items-center gap-2 italic text-gray-400">
                          <Loader2 size={12} className="animate-spin" /> Mencari alamat...
                        </span>
                      ) : currentAddress || 'Alamat tidak ditemukan'}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                     <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] block mb-1.5">Jarak</span>
                        <span className="text-sm font-black text-gray-800">{distance !== null ? `${Math.round(distance)}m` : '...'}</span>
                     </div>
                     <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] block mb-1.5">Maks Radius</span>
                        <span className="text-sm font-black text-amber-600">{effectiveRadius}m</span>
                     </div>
                  </div>
                  
                  {isBlockedByLocation && (
                    <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex gap-4 items-start animate-pulse">
                       <AlertCircle size={20} className="text-rose-500 shrink-0 mt-0.5" />
                       <p className="text-[10px] text-rose-600 font-black leading-tight uppercase tracking-widest">Presensi Lembur dikunci. Anda berada diluar zona yang diizinkan ({activeSpecialAssignment ? activeSpecialAssignment.location_name : account.location.name}).</p>
                    </div>
                  )}
               </div>
             ) : (
               <div className="flex flex-col items-center justify-center py-20 text-gray-300">
                  <MapIcon size={48} className="animate-bounce" />
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] mt-6">Mengunci Sinyal GPS...</p>
               </div>
             )}
          </div>

          {/* 2. Time Card (Middle) */}
          <div className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm">
             <div className="text-center py-6">
                <div className="text-6xl font-sans font-black text-gray-800 tracking-tighter">
                  {serverTime.toLocaleTimeString('id-ID', { hour12: false, timeZone: detectedTz })}
                </div>
                <div className="text-[11px] font-black text-amber-500 uppercase tracking-[0.2em] mt-4">
                  {serverTime.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}
                </div>

                {todayOT?.check_in && !todayOT.check_out && (
                  <div className="mt-10 p-5 bg-amber-50 rounded-3xl border border-amber-100/50 animate-pulse">
                    <p className="text-[9px] font-black text-amber-600 uppercase tracking-[0.2em] mb-2">Durasi Lembur Berjalan</p>
                    <div className="text-3xl font-sans font-black text-amber-700 tracking-widest">
                      {getOTDurationLive()}
                    </div>
                  </div>
                )}
             </div>

             <div className="mt-8 pt-8 border-t border-gray-50 grid grid-cols-2 gap-4">
               <div className="text-center">
                 <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Status Masuk</p>
                 <p className="text-sm font-black text-amber-600">
                   {todayOT?.check_in ? new Date(todayOT.check_in).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                 </p>
               </div>
               <div className="text-center">
                 <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Status Pulang</p>
                 <p className="text-sm font-black text-amber-600">
                   {todayOT?.check_out ? new Date(todayOT.check_out).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                 </p>
               </div>
             </div>
          </div>

          {/* 3. Action Card (Bottom) */}
          <div className="space-y-6">
            {isCameraActive ? (
              <PresenceCamera 
                onCapture={handleCaptureComplete}
                onClose={() => setIsCameraActive(false)}
                isProcessing={isCapturing}
                landmarker={landmarker}
              />
            ) : capturedPhoto ? (
              <div className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm flex flex-col items-center animate-in zoom-in duration-500">
                <div className="relative w-full aspect-[3/4] max-w-sm bg-black rounded-2xl overflow-hidden shadow-2xl ring-4 ring-amber-50">
                  <img 
                    src={photoPreviewUrl!} 
                    alt="Preview" 
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-4 right-4 bg-emerald-500 text-white px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg">
                    <ShieldCheck size={14} /> Identitas Terverifikasi
                  </div>
                </div>

                {/* Alasan Lembur Input directly in UI */}
                <div className="mt-8 w-full max-w-sm space-y-3">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block ml-1">
                    Alasan / Kegiatan Lembur
                  </label>
                  <textarea
                    value={otReason}
                    onChange={(e) => setOtReason(e.target.value)}
                    placeholder="Sebutkan kegiatan lembur Anda..."
                    className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-medium focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all resize-none h-24"
                  />
                </div>
                
                <div className="mt-8 flex gap-4 w-full max-w-sm">
                  <button 
                    onClick={resetCapture}
                    disabled={isCapturing}
                    className="flex-1 flex items-center justify-center gap-3 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest border-2 border-gray-100 text-gray-400 hover:bg-gray-50 transition-all"
                  >
                    <RefreshCw size={18} /> Ulangi
                  </button>
                  <button 
                    onClick={handleSubmitOvertime}
                    disabled={isCapturing}
                    className="flex-[2] flex items-center justify-center gap-3 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest bg-amber-600 text-white hover:bg-amber-700 shadow-lg shadow-amber-200 transition-all disabled:opacity-50"
                  >
                    {isCapturing ? <Loader2 className="animate-spin" size={18} /> : <Check size={18} />}
                    {isCapturing ? 'MEMPROSES...' : 'KONFIRMASI PRESENSI'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="relative bg-white rounded-3xl border border-gray-100 p-16 flex flex-col items-center justify-center shadow-sm text-center overflow-hidden">
                {isRegularActive && !activeOT && (
                  <ProtectionOverlay 
                    title="Sesi Reguler Aktif"
                    message="Sistem mendeteksi Anda masih berada dalam jam kerja reguler (Belum Check-Out). Lembur hanya bisa dimulai di luar jam sesi kerja reguler."
                  />
                )}
                <div className={`w-28 h-28 rounded-full flex items-center justify-center mb-10 shadow-xl transition-all duration-700 ring-8 ${!isBlockedByLocation ? 'bg-amber-50 text-amber-600 ring-amber-50/50' : 'bg-rose-50 text-rose-500 ring-rose-50/50'}`}>
                   <Timer size={56} />
                </div>
                <h3 className="text-3xl font-black text-gray-800 tracking-tight">
                   {activeOT ? 'Selesaikan Lembur?' : 'Mulai Lembur Sekarang?'}
                </h3>
                <p className="text-sm text-gray-400 mt-3 max-w-xs font-medium">
                  {!isBlockedByLocation 
                    ? 'Verifikasi identitas diperlukan untuk mencatat waktu tambahan kerja Anda hari ini.'
                    : 'Akses presensi lembur terkunci. Anda harus berada di area lokasi penempatan.'}
                </p>
                <button 
                  disabled={isBlockedByLocation || isCapturing || !landmarker}
                  onClick={() => setIsCameraActive(true)}
                  className={`mt-12 flex items-center gap-4 px-16 py-5 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] shadow-xl transition-all ${
                    !isBlockedByLocation && !isCapturing && landmarker
                    ? 'bg-amber-600 text-white hover:bg-amber-700 hover:scale-105 shadow-amber-200' 
                    : 'bg-gray-100 text-gray-300 cursor-not-allowed shadow-none'
                  }`}
                >
                  {isAiLoading ? <Loader2 className="animate-spin" size={20} /> : <Camera size={20} />}
                  {isCapturing ? 'MEMPROSES...' : (isAiLoading ? 'MENYIAPKAN...' : 'VERIFIKASI')}
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
          <OvertimeHistory logs={recentLogs} isLoading={isLoading} />
        </div>
      )}
    </div>
  );
};

export default OvertimeMain;