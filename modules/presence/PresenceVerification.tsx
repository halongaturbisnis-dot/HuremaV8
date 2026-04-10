
import React, { useState, useEffect, useRef } from 'react';
/* Added ShieldCheck to lucide-react imports */
import { Fingerprint, Clock, MapPin, History, AlertCircle, Map as MapIcon, Camera, Search, UserX, CalendarClock, MessageSquare, ShieldCheck, Umbrella, RefreshCw, Check, Loader2, ChevronLeft } from 'lucide-react';
import Swal from 'sweetalert2';
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import { presenceService } from '../../services/presenceService';
import { overtimeService } from '../../services/overtimeService';
import { accountService } from '../../services/accountService';
import { scheduleService } from '../../services/scheduleService';
import { specialAssignmentService } from '../../services/specialAssignmentService';
import { authService } from '../../services/authService';
import { googleDriveService } from '../../services/googleDriveService';
import { timeUtils } from '../../lib/timeUtils';
import { Account, Attendance, Schedule, ScheduleRule, SpecialAssignment } from '../../types';
import PresenceCamera from './PresenceCamera';
import PresenceMap from './PresenceMap';
import PresenceHistory from './PresenceHistory';
import LoadingSpinner from '../../components/Common/LoadingSpinner';
import ProtectionOverlay from '../../components/ui/ProtectionOverlay';

interface PresenceVerificationProps {
  onBack: () => void;
}

const PresenceVerification: React.FC<PresenceVerificationProps> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<'capture' | 'history'>('capture');
  const [account, setAccount] = useState<Account | null>(null);
  const [todayAttendance, setTodayAttendance] = useState<Attendance | null>(null);
  const [activeAttendance, setActiveAttendance] = useState<Attendance | null>(null);
  const [recentLogs, setRecentLogs] = useState<Attendance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [serverTime, setServerTime] = useState<Date>(new Date());
  const [coords, setCoords] = useState<{lat: number, lng: number} | null>(null);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [currentAddress, setCurrentAddress] = useState<string | null>(null);
  const [isFetchingAddress, setIsFetchingAddress] = useState(false);
  const [distance, setDistance] = useState<number | null>(null);
  const [activeHoliday, setActiveHoliday] = useState<any>(null);
  const [activeSpecialSchedule, setActiveSpecialSchedule] = useState<any>(null);
  const [activeLeave, setActiveLeave] = useState<any>(null);
  const [activeSpecialAssignment, setActiveSpecialAssignment] = useState<SpecialAssignment | null>(null);
  const [isOvertimeActive, setIsOvertimeActive] = useState(false);
  const [detectedTz, setDetectedTz] = useState<string>(timeUtils.getLocalTimeZone());
  const [capturedPhoto, setCapturedPhoto] = useState<Blob | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  
  // Out of Range Presence Request
  const [isOutOfRangeRequested, setIsOutOfRangeRequested] = useState(false);
  const [checkInType, setCheckInType] = useState('Tugas Luar');
  const [checkOutType, setCheckOutType] = useState('Tugas Luar');
  const [checkInReason, setCheckInReason] = useState('');
  const [checkOutReason, setCheckOutReason] = useState('');
  const [lateEarlyReason, setLateEarlyReason] = useState('');
  const [lateCheckoutReason, setLateCheckoutReason] = useState('');
  const [lockedCoords, setLockedCoords] = useState<{lat: number, lng: number} | null>(null);
  
  // State khusus Shift Dinamis
  const [dynamicShifts, setDynamicShifts] = useState<Schedule[]>([]);
  const [selectedShift, setSelectedShift] = useState<Schedule | null>(null);
  
  // Lock selected shift based on active attendance (database-based locking)
  useEffect(() => {
    if (activeAttendance?.schedule_id && dynamicShifts.length > 0) {
      const found = dynamicShifts.find(s => s.id === activeAttendance.schedule_id);
      if (found) setSelectedShift(found);
    }
  }, [activeAttendance?.schedule_id, dynamicShifts]);

  const [isFetchingShifts, setIsFetchingShifts] = useState(false);
  const [landmarker, setLandmarker] = useState<any>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

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
        const [attendance, activeAtt, isOTActive] = await Promise.all([
          presenceService.getTodayAttendance(currentAccountId, detectedTz),
          presenceService.getActiveAttendance(currentAccountId),
          overtimeService.isOvertimeSessionActive(currentAccountId)
        ]);
        setTodayAttendance(attendance);
        setActiveAttendance(activeAtt);
        setIsOvertimeActive(isOTActive);
      };
      refreshData();
    }
  }, [currentAccountId, detectedTz]);

  const fetchInitialData = async () => {
    if (!currentAccountId) return;
    try {
      setIsLoading(true);
      const [acc, attendance, activeAtt, history, isOTActive, sTime] = await Promise.all([
        accountService.getById(currentAccountId),
        presenceService.getTodayAttendance(currentAccountId, detectedTz),
        presenceService.getActiveAttendance(currentAccountId),
        presenceService.getRecentHistory(currentAccountId),
        overtimeService.isOvertimeSessionActive(currentAccountId),
        presenceService.getServerTime()
      ]);
      setAccount(acc as any);
      setTodayAttendance(attendance);
      setActiveAttendance(activeAtt);
      setRecentLogs(history);
      setIsOvertimeActive(isOTActive);
      setServerTime(sTime);

      const dateStr = timeUtils.getTodayLocalString(detectedTz);
      
      let specialAssignment = null;
      if (activeAtt?.special_assignment_id) {
        specialAssignment = await specialAssignmentService.getById(activeAtt.special_assignment_id);
      } else {
        specialAssignment = await specialAssignmentService.getActiveForAccount(currentAccountId, dateStr);
      }
      setActiveSpecialAssignment(specialAssignment);

      const leaveStatus = await presenceService.checkLeaveStatus(currentAccountId, sTime, detectedTz);
      setActiveLeave(leaveStatus);

      if (acc && acc.schedule_type === 'Shift Dinamis' && acc.location_id) {
        setIsFetchingShifts(true);
        const shifts = await scheduleService.getByLocation(acc.location_id);
        const filteredShifts = shifts.filter((s: any) => s.type === 2);
        setDynamicShifts(filteredShifts);
        setIsFetchingShifts(false);

        if (activeAtt?.schedule_id) {
          const lockedShift = filteredShifts.find((s: any) => s.id === activeAtt.schedule_id);
          if (lockedShift) setSelectedShift(lockedShift);
        }
      }

      if (acc && acc.location_id) {
        const [holiday, specialSchedule] = await Promise.all([
          presenceService.checkHolidayStatus(currentAccountId, acc.location_id, sTime, detectedTz),
          presenceService.checkSpecialScheduleStatus(currentAccountId, acc.location_id, sTime, detectedTz)
        ]);
        setActiveHoliday(holiday);
        
        if (activeAtt?.schedule_id && acc.schedule_type !== 'Shift Dinamis') {
          const lockedSchedule = await scheduleService.getById(activeAtt.schedule_id);
          if (lockedSchedule.type === 4) {
            setActiveSpecialSchedule(lockedSchedule);
          } else {
            setActiveSpecialSchedule(specialSchedule);
          }
        } else {
          setActiveSpecialSchedule(specialSchedule);
        }
      }
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

  const getLiveWorkDuration = () => {
    if (!todayAttendance?.check_in || todayAttendance.check_out) return null;
    const start = new Date(todayAttendance.check_in);
    const diffMs = serverTime.getTime() - start.getTime();
    if (diffMs < 0) return "00 : 00 : 00";
    const hours = Math.floor(diffMs / 3600000);
    const minutes = Math.floor((diffMs % 3600000) / 60000);
    const seconds = Math.floor((diffMs % 60000) / 1000);
    return `${String(hours).padStart(2, '0')} : ${String(minutes).padStart(2, '0')} : ${String(seconds).padStart(2, '0')}`;
  };

  const startWatchingLocation = () => {
    if (navigator.geolocation) {
      watchId.current = navigator.geolocation.watchPosition(
        (pos) => {
          setGpsAccuracy(pos.coords.accuracy);
          if (pos.coords.accuracy < 1000) {
            setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          }
        },
        (err) => {
          console.error("GPS Error:", err);
        },
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
    const photoFile = new File([photoBlob], `presence_${Date.now()}.jpg`, { type: 'image/jpeg' });
    setCapturedPhoto(photoFile);
    setPhotoPreviewUrl(URL.createObjectURL(photoFile));
    setIsCameraActive(false);
    setLockedCoords(coords);
  };

  const resetCapture = () => {
    if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
    setCapturedPhoto(null);
    setPhotoPreviewUrl(null);
    setLockedCoords(null);
  };

  const handleToggleOutOfRange = (value: boolean) => {
    setIsOutOfRangeRequested(value);
    if (!value) {
      resetCapture();
      setCheckInReason('');
      setCheckOutReason('');
    }
  };
  const isCheckOut = !!activeAttendance;
  const todayDay = timeUtils.getDayIndexInTimeZone(serverTime, detectedTz);
  
  const formatDisplayTime = (timeStr: string | null | undefined, forceTimeZone?: string | null) => {
    if (!timeStr) return '--:--';
    if (timeStr.includes('-') || timeStr.includes('T')) {
      try {
        const date = new Date(timeStr);
        if (isNaN(date.getTime())) return '--:--';
        
        const tz = forceTimeZone || Intl.DateTimeFormat().resolvedOptions().timeZone;
        return new Intl.DateTimeFormat('id-ID', { 
          hour: '2-digit', 
          minute: '2-digit', 
          hour12: false,
          timeZone: tz 
        }).format(date).replace(/\./g, ':');
      } catch (e) {
        return '--:--';
      }
    }
    return timeStr.slice(0, 5);
  };

  const getEffectiveSchedule = () => {
    if (activeAttendance) {
      return {
        id: activeAttendance.schedule_id || 'SNAPSHOT',
        name: activeAttendance.schedule_name_snapshot || 'Jadwal Terkunci',
        type: activeAttendance.special_assignment_id ? 1 : (account?.schedule_type === 'Shift Dinamis' ? 2 : 1),
        tolerance_checkin_minutes: activeAttendance.target_late_tolerance || 0,
        tolerance_checkout_minutes: activeAttendance.target_early_tolerance || 0,
        rules: [{
          id: 'SNAPSHOT_RULE',
          day_of_week: todayDay,
          check_in_time: activeAttendance.target_check_in,
          check_out_time: activeAttendance.target_check_out,
          is_holiday: false
        }]
      } as any;
    }

    if (activeSpecialAssignment && (activeSpecialAssignment.custom_check_in || activeSpecialAssignment.custom_check_out)) {
      return {
        id: activeSpecialAssignment.id,
        name: activeSpecialAssignment.title,
        type: 1,
        tolerance_checkin_minutes: activeSpecialAssignment.custom_late_tolerance || 0,
        tolerance_checkout_minutes: activeSpecialAssignment.custom_early_tolerance || 0,
        rules: [{
          id: 'SPECIAL_RULE',
          schedule_id: activeSpecialAssignment.id,
          day_of_week: todayDay,
          check_in_time: activeSpecialAssignment.custom_check_in,
          check_out_time: activeSpecialAssignment.custom_check_out,
          is_holiday: false
        }]
      } as any;
    }
    if (activeSpecialSchedule) {
      return {
        ...activeSpecialSchedule,
        tolerance_checkin_minutes: activeSpecialSchedule.tolerance_checkin_minutes ?? 0,
        tolerance_checkout_minutes: activeSpecialSchedule.tolerance_checkout_minutes ?? 0
      };
    }
    if (account?.schedule_type === 'Shift Dinamis') {
      if (!selectedShift) return null;
      return {
        ...selectedShift,
        tolerance_checkin_minutes: selectedShift.tolerance_checkin_minutes ?? 0,
        tolerance_checkout_minutes: selectedShift.tolerance_checkout_minutes ?? 0
      };
    }
    if (!account?.schedule) return null;
    return {
      ...account.schedule,
      tolerance_checkin_minutes: account.schedule.tolerance_checkin_minutes ?? 0,
      tolerance_checkout_minutes: account.schedule.tolerance_checkout_minutes ?? 0
    };
  };

  const effectiveSchedule = getEffectiveSchedule();
  
  const resolveScheduleRule = () => {
    if (!effectiveSchedule) return undefined;
    const ruleForToday = effectiveSchedule.rules?.find(r => r.day_of_week === todayDay);
    if (ruleForToday) return ruleForToday;
    const isSpecialOrDynamic = !!(activeSpecialAssignment || activeSpecialSchedule || (account?.schedule_type === 'Shift Dinamis' && selectedShift));
    if (isSpecialOrDynamic && effectiveSchedule.rules?.[0]) {
      return effectiveSchedule.rules[0];
    }
    if (isSpecialOrDynamic && (effectiveSchedule.check_in_time || effectiveSchedule.check_out_time)) {
      return {
        check_in_time: effectiveSchedule.check_in_time,
        check_out_time: effectiveSchedule.check_out_time,
        is_holiday: false
      } as any;
    }
    return undefined;
  };

  const scheduleRule = resolveScheduleRule();

  const scheduleResult = effectiveSchedule && scheduleRule
    ? presenceService.calculateStatus(serverTime, { ...effectiveSchedule, rules: [scheduleRule] }, isCheckOut ? 'OUT' : 'IN', detectedTz)
    : { status: 'Tepat Waktu' };
  
  const isLate = scheduleResult.status === 'Terlambat';
  const isEarly = scheduleResult.status === 'Pulang Cepat';
  const isLateOrEarly = isLate || isEarly;
  const isLateCheckout = scheduleResult.status === 'Terlambat Pulang';

  const handleAttendance = async () => {
    if (!capturedPhoto) return;
    if (isLateOrEarly && !lateEarlyReason.trim()) {
      return Swal.fire('Peringatan', 'Alasan keterlambatan/pulang awal wajib diisi.', 'warning');
    }
    if (isLateCheckout && !lateCheckoutReason.trim()) {
      return Swal.fire('Peringatan', 'Alasan telat absen pulang wajib diisi.', 'warning');
    }
    if (isOutOfRangeRequested && (isCheckOut ? !checkOutReason.trim() : !checkInReason.trim())) {
      return Swal.fire('Peringatan', 'Alasan presensi luar wajib diisi.', 'warning');
    }
    const reason = isLateOrEarly ? lateEarlyReason : null;
    setIsCapturing(true);
    try {
      const photoId = await googleDriveService.uploadFile(capturedPhoto as File);
      const address = currentAddress || 'Lokasi tidak diketahui';
      const currentTimeStr = serverTime.toISOString();
      const isCurrentlyCheckingOut = isCheckOut;
      const submissionCoords = lockedCoords || coords;

      if (!isCurrentlyCheckingOut) {
        const isSpecial = !!activeSpecialAssignment;
        const targetLat = isSpecial ? activeSpecialAssignment.latitude : account?.location?.latitude;
        const targetLng = isSpecial ? activeSpecialAssignment.longitude : account?.location?.longitude;
        const targetRad = isSpecial ? activeSpecialAssignment.radius : account?.location?.radius;
        let targetCheckIn: string | null = null;
        let targetCheckOut: string | null = null;
        if (scheduleRule?.check_in_time && scheduleRule?.check_out_time) {
          targetCheckIn = scheduleRule.check_in_time;
          targetCheckOut = scheduleRule.check_out_time;
        }
        const payload: any = {
          account_id: account.id,
          check_in: currentTimeStr,
          in_latitude: submissionCoords?.lat,
          in_longitude: submissionCoords?.lng,
          in_photo_id: photoId,
          in_address: address,
          in_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          status_in: scheduleResult.status,
          late_minutes: (scheduleResult as any).minutes || 0,
          late_reason: reason,
          check_in_type: isOutOfRangeRequested ? checkInType : 'Reguler',
          check_in_reason: isOutOfRangeRequested ? checkInReason : null,
          check_in_validity: isOutOfRangeRequested ? 'FALSE' : 'TRUE',
          schedule_id: isSpecial ? null : effectiveSchedule?.id,
          special_assignment_id: isSpecial ? activeSpecialAssignment.id : null,
          target_latitude: targetLat,
          target_longitude: targetLng,
          target_radius: targetRad,
          schedule_name_snapshot: effectiveSchedule?.name,
          target_check_in: targetCheckIn,
          target_check_out: targetCheckOut,
          target_late_tolerance: effectiveSchedule?.tolerance_checkin_minutes || 0,
          target_early_tolerance: effectiveSchedule?.tolerance_checkout_minutes || 0
        };
        await presenceService.checkIn(payload);
      } else {
        if (!activeAttendance?.id) {
          throw new Error("ID referensi presensi tidak ditemukan. Harap muat ulang halaman.");
        }
        const durationFormatted = presenceService.calculateWorkDuration(activeAttendance.check_in!, serverTime);
        const payload: any = {
          check_out: currentTimeStr,
          out_latitude: submissionCoords?.lat,
          out_longitude: submissionCoords?.lng,
          out_photo_id: photoId,
          out_address: address,
          out_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          status_out: scheduleResult.status,
          early_departure_minutes: scheduleResult.status === 'Pulang Cepat' ? ((scheduleResult as any).minutes || 0) : 0,
          late_checkout_minutes: scheduleResult.status === 'Terlambat Pulang' ? ((scheduleResult as any).lateCheckoutMinutes || 0) : 0,
          early_departure_reason: scheduleResult.status === 'Pulang Cepat' ? reason : null,
          late_checkout_reason: isLateCheckout ? lateCheckoutReason : null,
          check_out_type: isOutOfRangeRequested ? checkOutType : 'Reguler',
          check_out_reason: isOutOfRangeRequested ? checkOutReason : null,
          check_out_validity: (isOutOfRangeRequested || isLateCheckout) ? 'FALSE' : 'TRUE',
          work_duration: durationFormatted
        };
        await presenceService.checkOut(activeAttendance.id, payload);
      }
      setIsCameraActive(false); 
      await Swal.fire({ 
        title: 'Berhasil!', 
        text: `Presensi ${isCurrentlyCheckingOut ? 'Pulang' : 'Masuk'} berhasil dicatat.`, 
        icon: 'success', 
        timer: 2000,
        showConfirmButton: false
      });
      window.location.href = '/';
    } catch (error) {
      console.error(error);
      Swal.fire('Gagal', 'Terjadi kesalahan saat menyimpan presensi.', 'error');
    } finally {
      setIsCapturing(false);
    }
  };

  if (isLoading) return <LoadingSpinner message="Sinkronisasi Data Satelit..." />;

  if (!account) {
    return (
      <div className="max-w-md mx-auto mt-20 p-8 bg-white rounded-3xl border border-gray-100 shadow-xl text-center">
        <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center text-rose-500 mx-auto mb-6">
          <UserX size={40} />
        </div>
        <h3 className="text-xl font-bold text-gray-800">Akun Tidak Dikenali</h3>
        <p className="text-sm text-gray-500 mt-2">ID karyawan tidak terdaftar atau telah dinonaktifkan. Harap hubungi Admin HR.</p>
        <button 
          onClick={() => window.location.reload()}
          className="mt-8 w-full py-3 bg-[#006E62] text-white rounded-xl font-bold text-sm uppercase tracking-widest shadow-lg hover:bg-[#005a50] transition-all"
        >
          Coba Muat Ulang
        </button>
      </div>
    );
  }

  const isLimited = isCheckOut 
    ? account.is_presence_limited_checkout === true 
    : account.is_presence_limited_checkin === true;
  
  const effectiveRadius = activeSpecialAssignment ? activeSpecialAssignment.radius : (account?.location?.radius || 100);
  const isWithinRadius = distance !== null && distance <= effectiveRadius;
  const isBlockedByLocation = isLimited && !isWithinRadius;
  
  const isHolidayToday = !activeSpecialAssignment && !activeSpecialSchedule && (!!activeHoliday || (account?.schedule_type !== 'Fleksibel' && !!scheduleRule?.is_holiday));
  const isLeaveToday = !activeSpecialAssignment && !activeSpecialSchedule && !isHolidayToday && !!activeLeave;

  const showScheduleInfo = !isHolidayToday && !isLeaveToday && (
    !!activeSpecialAssignment || 
    !!activeSpecialSchedule || 
    (account?.schedule_type === 'Shift Dinamis' && !!selectedShift) ||
    (account?.schedule_type !== 'Fleksibel' && !!scheduleRule && !scheduleRule.is_holiday)
  );

  const isFinished = !!(todayAttendance && todayAttendance.check_out);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-4 w-full justify-center relative py-2">
          <button 
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 absolute left-0"
          >
            <ChevronLeft size={24} />
          </button>
          <h2 className="text-xl font-bold text-gray-800 tracking-tight text-center">Presensi {isCheckOut ? 'Keluar' : 'Masuk'}</h2>
        </div>

        {activeSpecialAssignment && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-4 animate-in slide-in-from-top duration-500">
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600 shrink-0">
              <ShieldCheck size={24} />
            </div>
            <div className="flex-1">
              <h4 className="text-xs font-bold text-amber-800 uppercase tracking-wider">Penugasan Khusus Aktif</h4>
              <p className="text-[10px] text-amber-600 font-medium">{activeSpecialAssignment.title} • {activeSpecialAssignment.location_name}</p>
            </div>
            <div className="px-3 py-1 bg-amber-200/50 rounded-full text-[9px] font-black text-amber-800 uppercase tracking-widest">
              Penugasan
            </div>
          </div>
        )}

        {activeSpecialSchedule && !activeSpecialAssignment && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center gap-4 animate-in slide-in-from-top duration-500">
            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600 shrink-0">
              <CalendarClock size={24} />
            </div>
            <div className="flex-1">
              <h4 className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Hari Kerja Khusus</h4>
              <p className="text-[10px] text-emerald-600 font-medium">{activeSpecialSchedule.name}</p>
            </div>
            <div className="px-3 py-1 bg-emerald-200/50 rounded-full text-[9px] font-black text-emerald-800 uppercase tracking-widest">
              Jadwal Khusus
            </div>
          </div>
        )}

        {activeHoliday && !activeSpecialAssignment && !activeSpecialSchedule && (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-center gap-4 animate-in slide-in-from-top duration-500">
            <div className="w-10 h-10 bg-rose-100 rounded-xl flex items-center justify-center text-rose-500 shrink-0">
              <Umbrella size={24} />
            </div>
            <div className="flex-1">
              <h4 className="text-xs font-bold text-rose-800 uppercase tracking-wider">Hari Libur Khusus</h4>
              <p className="text-[10px] text-rose-600 font-medium">{activeHoliday.name}</p>
            </div>
            <div className="px-3 py-1 bg-rose-200/50 rounded-full text-[9px] font-black text-rose-800 uppercase tracking-widest">
              Libur Khusus
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col lg:grid lg:grid-cols-12 gap-4 lg:gap-8 items-start animate-in fade-in duration-500">
        <div className="lg:col-span-7 order-3 lg:order-1 w-full">
          {isCameraActive ? (
            <PresenceCamera 
              onCapture={handleCaptureComplete}
              onClose={() => setIsCameraActive(false)}
              isProcessing={isCapturing}
              landmarker={landmarker}
            />
          ) : photoPreviewUrl ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-6 flex flex-col items-center shadow-sm animate-in zoom-in duration-300">
              <div className="relative w-full aspect-[3/4] max-w-sm rounded-2xl overflow-hidden shadow-2xl mb-6 ring-1 ring-gray-100">
                <img src={photoPreviewUrl} alt="Preview" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
                <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-white">
                    <ShieldCheck size={16} className="text-emerald-400" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Identitas Terverifikasi</span>
                  </div>
                </div>
              </div>

              <div className="w-full max-sm space-y-3">
                <button 
                  disabled={isCapturing}
                  onClick={handleAttendance}
                  className={`w-full flex items-center justify-center gap-3 py-4 rounded-2xl font-bold uppercase text-xs tracking-widest shadow-lg transition-all ${
                    isCheckOut 
                    ? 'bg-rose-500 text-white hover:bg-rose-600' 
                    : 'bg-[#006E62] text-white hover:bg-[#005a50]'
                  } hover:scale-[1.02] active:scale-95 disabled:opacity-50`}
                >
                  {isCheckOut ? <AlertCircle size={18} /> : <Fingerprint size={18} />}
                  {isCapturing ? 'MEMPROSES...' : (isCheckOut ? 'KONFIRMASI PULANG' : 'KONFIRMASI MASUK')}
                </button>
                
                <button 
                  disabled={isCapturing}
                  onClick={resetCapture}
                  className="w-full py-3 text-gray-400 font-bold text-[10px] uppercase tracking-widest hover:text-gray-600 transition-colors"
                >
                  Ambil Ulang Foto
                </button>
              </div>
            </div>
          ) : isHolidayToday ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-12 flex flex-col items-center justify-center shadow-sm text-center">
              <div className="w-24 h-24 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center mb-8 shadow-xl">
                 <Umbrella size={48} />
              </div>
              <h3 className="text-2xl font-bold text-gray-800">
                {activeHoliday ? 'Hari Libur Khusus' : 'Hari Libur Terjadwal'}
              </h3>
              <p className="text-sm text-rose-600 font-bold mt-2 max-w-xs uppercase tracking-tight">
                {activeHoliday ? `"${activeHoliday.name}"` : '"Off Day / Hari Libur"'}
              </p>
              <div className="mt-8 p-4 bg-gray-50 rounded-xl border border-gray-100">
                <p className="text-xs text-gray-500 leading-relaxed font-medium">Sesuai kebijakan manajemen, sistem presensi dinonaktifkan selama periode libur ini. Nikmati waktu istirahat Anda.</p>
              </div>
            </div>
          ) : isLeaveToday ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-20 flex flex-col items-center justify-center shadow-sm text-center">
              <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center text-amber-600 mb-6 animate-pulse">
                <CalendarClock size={48} />
              </div>
              <h3 className="text-2xl font-bold text-gray-800">
                Sedang {activeLeave?.type}
              </h3>
              <p className="text-sm text-amber-600 font-bold mt-2 max-w-xs uppercase tracking-tight">
                "{activeLeave?.data.description || 'Izin Disetujui'}"
              </p>
              <div className="mt-8 p-4 bg-gray-50 rounded-xl border border-gray-100">
                <p className="text-xs text-gray-500 leading-relaxed font-medium">Status Anda saat ini sedang dalam masa {activeLeave?.type.toLowerCase()}. Sistem presensi diistirahatkan untuk Anda.</p>
              </div>
            </div>
          ) : (!activeAttendance && todayAttendance && todayAttendance.check_out) ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-20 flex flex-col items-center justify-center shadow-sm text-center">
              <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center text-[#006E62] mb-6 animate-pulse">
                <ShieldCheck size={48} />
              </div>
              <h3 className="text-2xl font-bold text-gray-800">Selesai!</h3>
              <p className="text-sm text-gray-500 mt-2 max-w-xs">Terima kasih, Anda telah menyelesaikan presensi masuk dan pulang untuk hari ini.</p>
            </div>
          ) : (
            <div className="relative bg-white rounded-2xl border border-gray-100 p-8 flex flex-col items-center justify-center shadow-sm text-center overflow-hidden">
              {isOvertimeActive && !isCheckOut && (
                <ProtectionOverlay 
                  title="Sesi Lembur Aktif"
                  message="Selesaikan sesi lembur Anda terlebih dahulu sebelum memulai presensi reguler."
                />
              )}
              <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 shadow-xl transition-all duration-500 ${(!isBlockedByLocation || isOutOfRangeRequested) ? 'bg-emerald-50 text-[#006E62]' : 'bg-rose-50 text-rose-500'}`}>
                 <Fingerprint size={40} />
              </div>
              <h3 className="text-xl font-bold text-gray-800">
                 {isCheckOut ? 'Waktunya Pulang?' : 'Siap Bekerja Hari Ini?'}
              </h3>
              
              <p className="text-xs text-gray-400 mt-6 max-w-xs leading-tight">
                {(!isBlockedByLocation || isOutOfRangeRequested)
                  ? (account.schedule_type === 'Shift Dinamis' && !todayAttendance && !selectedShift 
                      ? 'Silahkan pilih salah satu shift.'
                      : 'Verifikasi identitas dan lokasi Anda.')
                  : 'Akses presensi terkunci. Anda harus berada di area lokasi penempatan.'}
              </p>
              
              <button 
                disabled={(isBlockedByLocation && !isOutOfRangeRequested) || isCapturing || !landmarker || (account.schedule_type === 'Shift Dinamis' && !isCheckOut && !selectedShift) || (isOvertimeActive && !isCheckOut)}
                onClick={() => setIsCameraActive(true)}
                className={`mt-8 flex items-center gap-3 px-12 py-4 rounded-2xl font-bold uppercase text-xs tracking-widest shadow-lg transition-all ${
                  (!isBlockedByLocation || isOutOfRangeRequested) && !isCapturing && landmarker && (account.schedule_type !== 'Shift Dinamis' || isCheckOut || !!selectedShift) && !(isOvertimeActive && !isCheckOut)
                  ? 'bg-[#006E62] text-white hover:bg-[#005a50] hover:scale-105 active:scale-95' 
                  : 'bg-gray-100 text-gray-300 cursor-not-allowed shadow-none'
                }`}
              >
                {isAiLoading ? <Loader2 className="animate-spin" size={18} /> : <Camera size={18} />}
                {isCapturing ? 'MEMPROSES...' : (isAiLoading ? 'MENYIAPKAN...' : 'VERIFIKASI')}
              </button>
            </div>
          )}
        </div>

        <div className="lg:col-span-5 order-2 lg:order-2 space-y-4 lg:space-y-6 w-full flex flex-col">
          {/* Status Geotag Card - Order 1 on Mobile */}
          {!(isFinished || isHolidayToday || isOvertimeActive) && (
            <div className="bg-white rounded-2xl border border-gray-100 p-4 lg:p-6 shadow-sm order-1 lg:order-2 relative z-0">
               <div className="hidden lg:flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <MapPin size={16} className="text-[#006E62]" />
                    <h4 className="text-[11px] font-bold uppercase tracking-widest text-gray-500">Status Geotag</h4>
                  </div>
                  <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-[9px] font-bold uppercase ${!isLimited ? 'bg-blue-50 text-blue-600' : (isWithinRadius ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600')}`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${!isLimited ? 'bg-blue-500' : (isWithinRadius ? 'bg-emerald-500' : 'bg-rose-500')}`}></div>
                    {!isLimited ? 'Bebas Lokasi' : (isWithinRadius ? 'Dalam Radius' : 'Luar Radius')}
                  </div>
               </div>
               
               {((activeSpecialAssignment) || (account?.location)) && coords ? (
                 <div className="space-y-4">
                    <PresenceMap 
                      userLat={coords.lat} 
                      userLng={coords.lng} 
                      officeLat={activeSpecialAssignment ? activeSpecialAssignment.latitude : account.location.latitude} 
                      officeLng={activeSpecialAssignment ? activeSpecialAssignment.longitude : account.location.longitude}
                      radius={effectiveRadius}
                    />
                    
                    <div className="mt-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                      <div className="flex items-center gap-2 mb-1">
                        <MapPin size={12} className="text-[#006E62]" />
                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Alamat Geotag</span>
                      </div>
                      <p className="text-[10px] font-medium text-gray-700 leading-relaxed">
                        {isFetchingAddress ? (
                          <span className="flex items-center gap-2 italic text-gray-400">
                            <Loader2 size={10} className="animate-spin" /> Mencari alamat...
                          </span>
                        ) : currentAddress || 'Alamat tidak ditemukan'}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-[10px] pt-2">
                       <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 text-center">
                          <span className="text-gray-400 font-bold uppercase block mb-1">Jarak</span>
                          <span className={`text-sm font-bold ${isWithinRadius ? 'text-[#006E62]' : 'text-rose-500'}`}>
                            {distance !== null ? `${new Intl.NumberFormat('id-ID').format(Math.round(distance))} meter` : 'Calculating...'}
                          </span>
                       </div>
                       <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 text-center">
                          <span className="text-gray-400 font-bold uppercase block mb-1">Maks Radius</span>
                          <span className="text-sm font-bold text-gray-700">
                            {new Intl.NumberFormat('id-ID').format(effectiveRadius)} meter
                          </span>
                       </div>
                    </div>
                    {isBlockedByLocation && (
                      <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl flex gap-3 items-start animate-pulse">
                         <AlertCircle size={16} className="text-rose-500 shrink-0 mt-0.5" />
                         <p className="text-[10px] text-rose-600 font-bold leading-tight uppercase tracking-tight text-center flex-1">Lokasi anda berada di luar radius jangkauan lokasi {activeSpecialAssignment ? activeSpecialAssignment.location_name : account.location.name}</p>
                      </div>
                    )}

                    {isBlockedByLocation && (
                      <div className="mt-4 p-4 bg-white rounded-xl border border-gray-100">
                        <div className="flex items-center justify-between mb-4">
                          <span className="text-xs font-bold text-gray-700">Ajukan Presensi Luar</span>
                          <button
                            onClick={() => handleToggleOutOfRange(!isOutOfRangeRequested)}
                            className={`w-10 h-6 rounded-full transition-colors ${isOutOfRangeRequested ? 'bg-[#006E62]' : 'bg-gray-200'}`}
                          >
                            <div className={`w-4 h-4 bg-white rounded-full transition-transform ${isOutOfRangeRequested ? 'translate-x-5' : 'translate-x-1'}`} />
                          </button>
                        </div>
                        {isOutOfRangeRequested && (
                          <div className="space-y-3">
                            <select 
                              value={isCheckOut ? checkOutType : checkInType} 
                              onChange={(e) => isCheckOut ? setCheckOutType(e.target.value) : setCheckInType(e.target.value)}
                              className="w-full p-2 text-xs border border-gray-200 rounded-lg"
                            >
                              <option value="Tugas Luar">Tugas Luar</option>
                              <option value="WFH">WFH</option>
                              <option value="Ketemu Client">Ketemu Client</option>
                              <option value="Lainnya">Lainnya</option>
                            </select>
                            <textarea 
                              value={isCheckOut ? checkOutReason : checkInReason} 
                              onChange={(e) => isCheckOut ? setCheckOutReason(e.target.value) : setCheckInReason(e.target.value)}
                              placeholder="Alasan presensi luar..."
                              className="w-full p-2 text-xs border border-gray-200 rounded-lg"
                            />
                          </div>
                        )}
                      </div>
                    )}
                 </div>
               ) : (
                 <div className="flex flex-col items-center justify-center py-14 text-gray-300">
                    <MapIcon size={40} strokeWidth={1} className="animate-bounce" />
                    <p className="text-[10px] font-bold uppercase tracking-widest mt-4">Mengunci Sinyal GPS...</p>
                 </div>
               )}
            </div>
          )}

          {/* Waktu Terverifikasi Card - Order 2 on Mobile */}
          {!(isFinished || isHolidayToday || isOvertimeActive) && (
            <div className="bg-white rounded-2xl border border-gray-100 p-4 lg:p-5 shadow-sm overflow-hidden relative order-2 lg:order-1">
               <div className="hidden lg:flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <Clock size={16} className="text-[#006E62]" />
                    <h4 className="text-[11px] font-bold uppercase tracking-widest text-gray-500">Waktu Terverifikasi</h4>
                  </div>
               </div>
               <div className="text-center py-4 relative z-10">
                  <div className="text-5xl font-sans font-bold text-gray-800 tracking-tighter">
                    {serverTime.toLocaleTimeString('id-ID', { hour12: false, timeZone: detectedTz }).replace(/\./g, ':')}
                  </div>
                  <div className="text-[11px] font-bold text-[#006E62] uppercase tracking-widest mt-2">
                    {serverTime.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </div>

                  {isOvertimeActive && !isCheckOut && (
                    <div className="mt-4 p-3 bg-orange-50 border border-orange-100 rounded-xl flex gap-3 items-start animate-pulse">
                      <AlertCircle size={16} className="text-orange-500 shrink-0 mt-0.5" />
                      <p className="text-[10px] text-orange-600 font-bold leading-tight uppercase tracking-tight text-center flex-1">Ada sesi lembur yang sedang aktif</p>
                    </div>
                  )}

                  {todayAttendance?.check_in && !todayAttendance.check_out && (
                    <div className="mt-8 p-3 bg-[#006E62]/5 rounded-2xl border border-emerald-100/50 animate-in fade-in zoom-in duration-700">
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">Durasi Kerja Berjalan</p>
                      <div className="text-2xl font-sans font-black text-[#006E62] tracking-widest">
                        {getLiveWorkDuration()}
                      </div>
                    </div>
                  )}
               </div>

                {/* LOGIKA KHUSUS SHIFT DINAMIS: PILEH JADWAL (Cek via schedule_type) */}
                {account.schedule_type === 'Shift Dinamis' && !activeSpecialAssignment && !activeSpecialSchedule && (
                  <div className="mt-6 w-full space-y-3">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest text-left mb-2">
                      {todayAttendance ? 'Shift Kerja Terpilih:' : 'Pilih Shift Kerja Hari Ini:'}
                    </p>
                    {isFetchingShifts ? (
                      <div className="py-4 text-xs text-gray-400 italic">Mengambil daftar shift...</div>
                    ) : dynamicShifts.length === 0 ? (
                      <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl text-[10px] text-rose-600 font-bold">Tidak ada jadwal Shift Kerja (Type 2) tersedia di lokasi Anda.</div>
                    ) : (
                      <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto pr-1">
                        {dynamicShifts.map(s => (
                          <button 
                            key={s.id}
                            onClick={() => !todayAttendance && setSelectedShift(s)}
                            disabled={!!todayAttendance}
                            className={`flex items-center justify-between p-3 rounded-xl border transition-all text-left group ${selectedShift?.id === s.id ? 'border-[#006E62] bg-emerald-50' : 'border-gray-100 bg-white hover:border-[#006E62]'} ${todayAttendance ? 'opacity-80 cursor-not-allowed' : ''}`}
                          >
                            <div className="flex-1">
                              <p className={`text-xs font-bold ${selectedShift?.id === s.id ? 'text-[#006E62]' : 'text-gray-700'}`}>{s.name}</p>
                              <p className="text-[9px] text-gray-400 uppercase font-bold">
                                {s.rules?.find(r => r.day_of_week === todayDay)?.check_in_time?.slice(0,5)} - {s.rules?.find(r => r.day_of_week === todayDay)?.check_out_time?.slice(0,5)}
                              </p>
                            </div>
                            <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${selectedShift?.id === s.id ? 'bg-[#006E62] border-[#006E62] text-white' : 'border-gray-200 group-hover:border-[#006E62]'}`}>
                               {selectedShift?.id === s.id && <Check size={12} />}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

               {isLateOrEarly && (
                 <div className="mt-4 p-4 bg-rose-50 rounded-xl border border-rose-100">
                   <p className="text-[10px] font-bold text-rose-600 uppercase mb-2">
                     {isLate ? 'Alasan Keterlambatan' : 'Alasan Pulang Awal'}
                   </p>
                   <textarea
                     value={lateEarlyReason}
                     onChange={(e) => setLateEarlyReason(e.target.value)}
                     placeholder="Masukkan alasan..."
                     className="w-full p-3 text-xs border border-rose-200 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                   />
                 </div>
               )}

               {isLateCheckout && (
                 <div className="mt-4 p-4 bg-rose-50 rounded-xl border border-rose-100">
                   <p className="text-[10px] font-bold text-rose-600 uppercase mb-2">Alasan Keterlambatan Pulang</p>
                   <textarea
                     value={lateCheckoutReason}
                     onChange={(e) => setLateCheckoutReason(e.target.value)}
                     placeholder="Masukkan alasan telat absen pulang..."
                     className="w-full p-3 text-xs border border-rose-200 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                   />
                 </div>
               )}

               {showScheduleInfo && (
                 <div className="mt-4 lg:mt-8 p-4 bg-emerald-50/50 rounded-xl border border-emerald-100/50 space-y-3">
                    <div className="relative flex justify-center items-center text-[10px] font-bold text-[#006E62] uppercase tracking-wider mb-2">
                      <div className="absolute left-0 top-0">
                        <CalendarClock size={14} />
                      </div>
                      <span className="text-center">
                        {activeSpecialAssignment ? 'Jadwal Penugasan' : activeSpecialSchedule ? 'Jadwal Khusus' : account.schedule_type === 'Shift Dinamis' ? 'Shift Terpilih' : 'Jadwal Hari Ini'}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                       <div className="text-center">
                          <p className="text-[9px] text-gray-400 font-bold uppercase">Jam Masuk</p>
                          <p className="text-xs font-bold text-gray-700">{formatDisplayTime(scheduleRule?.check_in_time, activeAttendance?.in_timezone)}</p>
                          <p className="text-[9px] text-[#006E62] font-medium mt-1">
                            Toleransi: {effectiveSchedule?.tolerance_checkin_minutes || 0} menit
                          </p>
                       </div>
                       <div className="text-center">
                          <p className="text-[9px] text-gray-400 font-bold uppercase">Jam Pulang</p>
                          <p className="text-xs font-bold text-gray-700">{formatDisplayTime(scheduleRule?.check_out_time, activeAttendance?.in_timezone)}</p>
                          <p className="text-[9px] text-[#006E62] font-medium mt-1">
                            Toleransi: {effectiveSchedule?.tolerance_checkout_minutes || 0} menit
                          </p>
                       </div>
                    </div>
                 </div>
               )}

               <div className="mt-4 pt-4 lg:mt-6 lg:pt-6 border-t border-gray-50">
                  {showScheduleInfo && (
                    <div className="flex justify-center mb-4">
                      <span className="text-[10px] font-bold text-[#006E62] bg-[#006E62]/5 px-2 py-0.5 rounded uppercase tracking-tighter">
                        {effectiveSchedule?.name || (account.schedule_type === 'Fleksibel' ? 'Fleksibel' : 'Reguler')}
                      </span>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <p className="text-[9px] font-bold text-gray-400 uppercase mb-1">Status Masuk</p>
                      <p className={`text-xs font-bold ${todayAttendance?.status_in === 'Terlambat' ? 'text-rose-500' : 'text-[#006E62]'}`}>
                        {todayAttendance?.check_in ? `${formatDisplayTime(todayAttendance.check_in, todayAttendance.in_timezone)} • ${todayAttendance.status_in}` : '--:--'}
                      </p>
                    </div>
                    <div className="text-center border-l border-gray-50">
                      <p className="text-[9px] font-bold text-gray-400 uppercase mb-1">Status Pulang</p>
                      <p className={`text-xs font-bold ${todayAttendance?.status_out === 'Pulang Cepat' ? 'text-rose-500' : 'text-blue-500'}`}>
                        {todayAttendance?.check_out ? `${formatDisplayTime(todayAttendance.check_out, todayAttendance.out_timezone)} • ${todayAttendance.status_out}` : '--:--'}
                      </p>
                    </div>
                  </div>
               </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PresenceVerification;
