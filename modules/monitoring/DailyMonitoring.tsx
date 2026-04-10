
import React, { useState, useEffect } from 'react';
import { 
  Users, UserCheck, UserX, Clock, Calendar, 
  Heart, Briefcase, Search, ArrowLeft, Eye,
  Coffee, Moon, Sun, AlertCircle, CheckCircle2,
  Baby, UserCircle, CircleAlert, Check, TriangleAlert, X
} from 'lucide-react';
import { monitoringService } from '../../services/monitoringService';
import { googleDriveService } from '../../services/googleDriveService';
import AccountDetail from '../account/AccountDetail';
import AttendanceDetail from './AttendanceDetail';
import LoadingSpinner from '../../components/Common/LoadingSpinner';

const DailyMonitoring: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'present' | 'notPresentYet' | 'holiday' | 'overtime' | 'leave' | 'permission'>('present');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [selectedAttendance, setSelectedAttendance] = useState<any>(null);
  const [selectedAccountForAttendance, setSelectedAccountForAttendance] = useState<any>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const result = await monitoringService.getDailyMonitoringData();
      setData(result);
    } catch (error) {
      console.error('Error fetching monitoring data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) return <LoadingSpinner />;

  const getFilteredList = (list: any[]) => {
    if (!list) return [];
    return list.filter(item => 
      item.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.internal_nik?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const formatTime = (isoString: string | null, forceTimeZone?: string | null) => {
    if (!isoString) return '-';
    if (isoString.includes(':') && isoString.length <= 8) return isoString.substring(0, 5);
    try {
      const date = new Date(isoString);
      const tz = forceTimeZone || Intl.DateTimeFormat().resolvedOptions().timeZone;
      return new Intl.DateTimeFormat('id-ID', { 
        hour: '2-digit', 
        minute: '2-digit', 
        hour12: false,
        timeZone: tz 
      }).format(date).replace(/\./g, ':');
    } catch (e) {
      return '-';
    }
  };

  const renderList = (list: any[], type: string) => {
    const filtered = getFilteredList(list);

    if (filtered.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400 bg-white rounded-2xl border border-dashed border-gray-200">
          <Users size={48} strokeWidth={1} className="mb-4 opacity-20" />
          <p className="text-sm font-medium">Tidak ada data ditemukan</p>
        </div>
      );
    }

    return (
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">Karyawan</th>
                {(type !== 'present' && type !== 'notPresentYet') && <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Jabatan</th>}
                <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">Jadwal</th>
                
                {type === 'present' && (
                  <>
                    <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">Presensi Masuk</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">Presensi Keluar</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">Status</th>
                  </>
                )}

                {type === 'overtime' && (
                  <>
                    <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Mulai Lembur</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Selesai Lembur</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Status</th>
                  </>
                )}

                {(type === 'leave' || type === 'permission' || type === 'holiday') && (
                  <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Keterangan / Alasan</th>
                )}

                <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((item) => (
                <tr 
                  key={item.id} 
                  className="hover:bg-gray-50/50 transition-colors group cursor-pointer"
                  onClick={() => {
                    if (type === 'present') {
                      setSelectedAttendance(item.attendance);
                      setSelectedAccountForAttendance(item);
                    } else if (type === 'notPresentYet') {
                      setSelectedAccountId(item.id);
                    }
                  }}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 overflow-hidden shrink-0 border border-gray-200">
                        {item.photo_google_id ? (
                          <img src={googleDriveService.getFileUrl(item.photo_google_id)} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <UserCircle size={20} />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-gray-800 truncate">{item.full_name}</p>
                        <div className="flex flex-col">
                          <p className="text-[10px] font-bold text-gray-400 tracking-tighter">{item.internal_nik}</p>
                          <p className="text-[10px] font-bold text-gray-400 tracking-tighter">{item.grade || item.department}</p>
                          <p className="text-[10px] font-bold text-gray-400 tracking-tighter">{item.position}</p>
                        </div>
                      </div>
                    </div>
                  </td>
                  {(type !== 'present' && type !== 'notPresentYet') && (
                    <td className="px-4 py-3">
                      <p className="text-xs text-gray-600 font-medium">{item.position}</p>
                      <p className="text-[10px] text-gray-400 uppercase">{item.grade}</p>
                    </td>
                  )}
                  <td className="px-4 py-3 text-center">
                    <div className="flex flex-col items-center gap-1">
                      <span className={`px-2 py-0.5 text-white text-[10px] font-bold rounded uppercase ${item.is_special_assignment ? 'bg-amber-600' : 'bg-[#006E62]'}`}>
                        {item.schedule_name}
                      </span>
                      <p className="text-[10px] text-gray-500 font-medium">
                        {formatTime(item.today_rule?.check_in_time)} - {formatTime(item.today_rule?.check_out_time)}
                      </p>
                    </div>
                  </td>

                  {type === 'present' && (
                    <>
                      <td className="px-4 py-3 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <p className="text-sm font-black font-mono text-gray-900">
                            {formatTime(item.attendance?.check_in, item.attendance?.in_timezone)}
                          </p>
                          {(item.attendance?.check_in_type && item.attendance.check_in_type !== 'Reguler') && (
                            <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[9px] font-bold rounded uppercase flex items-center gap-1">
                              {item.attendance.check_in_type === 'Tugas Luar' || item.attendance.check_in_type === 'WFH' || item.attendance.check_in_type === 'Ketemu Client' ? 'Luar Lokasi' : item.attendance.check_in_type}
                              {item.attendance.check_in_validity === 'TRUE' ? (
                                <Check size={10} className="text-[#006E62]" />
                              ) : item.attendance.check_in_validity === 'DENY' ? (
                                <X size={10} className="text-red-600" />
                              ) : (
                                <TriangleAlert size={10} className="text-amber-600" />
                              )}
                            </span>
                          )}
                          <p className={`text-[9px] font-bold uppercase ${item.attendance?.late_minutes > 0 ? 'text-red-600' : 'text-[#006E62]'}`}>
                            {item.attendance?.late_minutes > 0 ? `Terlambat ${item.attendance.late_minutes} Menit` : 'Tepat Waktu'}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <p className="text-sm font-black font-mono text-gray-900">
                            {formatTime(item.attendance?.check_out, item.attendance?.out_timezone)}
                          </p>
                          {(item.attendance?.check_out_type && item.attendance.check_out_type !== 'Reguler') && (
                            <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[9px] font-bold rounded uppercase flex items-center gap-1">
                              {item.attendance.check_out_type === 'Tugas Luar' || item.attendance.check_out_type === 'WFH' || item.attendance.check_out_type === 'Ketemu Client' ? 'Luar Lokasi' : item.attendance.check_out_type}
                              {item.attendance.check_out_validity === 'TRUE' ? (
                                <Check size={10} className="text-[#006E62]" />
                              ) : item.attendance.check_out_validity === 'DENY' ? (
                                <X size={10} className="text-red-600" />
                              ) : (
                                <TriangleAlert size={10} className="text-amber-600" />
                              )}
                            </span>
                          )}
                          {item.attendance?.check_out && (
                            <>
                              {item.attendance?.status_out === 'Terlambat Pulang' ? (
                                <span className="px-1.5 py-0.5 bg-rose-100 text-rose-700 text-[9px] font-bold rounded uppercase flex items-center gap-1">
                                  Terlambat Pulang {item.attendance.late_checkout_minutes > 0 ? `(${item.attendance.late_checkout_minutes} Menit)` : ''}
                                  {item.attendance.check_out_validity === 'TRUE' ? (
                                    <Check size={10} className="text-[#006E62]" />
                                  ) : item.attendance.check_out_validity === 'DENY' ? (
                                    <X size={10} className="text-red-600" />
                                  ) : (
                                    <TriangleAlert size={10} className="text-amber-600" />
                                  )}
                                </span>
                              ) : (
                                <p className={`text-[9px] font-bold uppercase ${item.attendance?.early_departure_minutes > 0 ? 'text-red-600' : 'text-[#006E62]'}`}>
                                  {item.attendance?.early_departure_minutes > 0 
                                    ? `Pulang Awal ${item.attendance.early_departure_minutes} Menit` 
                                    : 'Tepat Waktu'}
                                </p>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-3 py-1 text-[10px] font-bold rounded-full uppercase ${item.attendance?.check_out ? 'bg-[#006E62] text-white' : 'bg-amber-100 text-amber-700'}`}>
                          {item.attendance?.check_out ? 'Sudah Pulang' : 'Belum Pulang'}
                        </span>
                      </td>
                    </>
                  )}

                  {type === 'overtime' && (
                    <>
                      <td className="px-4 py-3 text-xs text-orange-600 font-bold font-mono">{formatTime(item.overtime?.check_in)}</td>
                      <td className="px-4 py-3 text-xs text-gray-600 font-mono">{formatTime(item.overtime?.check_out)}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase ${item.overtime?.check_out ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-600'}`}>
                          {item.overtime?.check_out ? 'Selesai' : 'Berjalan'}
                        </span>
                      </td>
                    </>
                  )}

                  {type === 'leave' && (
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <span className={`w-fit px-2 py-0.5 text-[10px] font-bold rounded uppercase ${item.annualLeave ? 'bg-blue-50 text-blue-600' : 'bg-pink-50 text-pink-600'}`}>
                          {item.annualLeave ? 'Cuti Tahunan' : 'Cuti Melahirkan'}
                        </span>
                        <p className="text-xs text-gray-500 italic">"{item.annualLeave?.description || item.maternityLeave?.description || '-'}"</p>
                      </div>
                    </td>
                  )}

                  {type === 'permission' && (
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <span className="w-fit px-2 py-0.5 bg-purple-50 text-purple-600 text-[10px] font-bold rounded uppercase">
                          Izin: {item.permission?.permission_type}
                        </span>
                        <p className="text-xs text-gray-500 italic">"{item.permission?.description || '-'}"</p>
                      </div>
                    </td>
                  )}

                  {type === 'holiday' && (
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <span className={`w-fit px-2 py-0.5 text-[10px] font-bold rounded uppercase ${item.leaveRequest ? 'bg-amber-50 text-amber-600' : 'bg-gray-100 text-gray-500'}`}>
                          {item.leaveRequest ? 'Libur Mandiri' : 'Hari Libur'}
                        </span>
                        <p className="text-xs text-gray-500 italic">"{item.leaveRequest?.description || 'Libur sesuai jadwal kerja'}"</p>
                      </div>
                    </td>
                  )}

                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      {type !== 'notPresentYet' && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            if (type === 'present') {
                              setSelectedAttendance(item.attendance);
                              setSelectedAccountForAttendance(item);
                            }
                          }}
                          className="p-2 hover:bg-gray-100 text-gray-400 hover:text-[#006E62] transition-colors rounded-lg"
                          title="Lihat Detail Presensi"
                        >
                          <Eye size={16} />
                        </button>
                      )}
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedAccountId(item.id);
                        }}
                        className="p-2 hover:bg-gray-100 text-gray-400 hover:text-amber-600 transition-colors rounded-lg"
                        title="Lihat Profil Karyawan"
                      >
                        <CircleAlert size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const TabButton = ({ id, label, icon: Icon, count, color }: { id: any, label: string, icon: any, count: number, color: string }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${
        activeTab === id 
          ? `border-${color}-500 bg-${color}-50 text-${color}-700 shadow-sm` 
          : 'border-gray-100 bg-white text-gray-400 hover:border-gray-200'
      }`}
    >
      <Icon size={24} className={activeTab === id ? `text-${color}-600` : 'text-gray-300'} />
      <span className="text-[10px] font-bold uppercase tracking-wider mt-2">{label}</span>
      <span className={`text-lg font-black mt-1 ${activeTab === id ? `text-${color}-700` : 'text-gray-500'}`}>{count}</span>
    </button>
  );

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 tracking-tight">Pemantauan Harian</h2>
          <p className="text-[10px] font-bold text-gray-400 tracking-widest">
            <span className="uppercase">Status kehadiran karyawan hari</span> <span className="uppercase text-[#006E62]">{new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
          </p>
        </div>
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Cari nama atau NIK..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#006E62]/20 focus:border-[#006E62] transition-all"
          />
        </div>
      </div>

      {/* Stats Tabs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <TabButton id="present" label="Sudah Masuk" icon={UserCheck} count={data?.present?.length || 0} color="emerald" />
        <TabButton id="notPresentYet" label="Belum Masuk" icon={UserX} count={data?.notPresentYet?.length || 0} color="red" />
        <TabButton id="holiday" label="Libur" icon={Coffee} count={(data?.onHoliday?.length || 0) + (data?.onLeaveMandiri?.length || 0)} color="amber" />
        <TabButton id="overtime" label="Lembur" icon={Clock} count={data?.onOvertime?.length || 0} color="orange" />
        <TabButton id="leave" label="Cuti" icon={Briefcase} count={(data?.onAnnualLeave?.length || 0) + (data?.onMaternityLeave?.length || 0)} color="blue" />
        <TabButton id="permission" label="Izin" icon={AlertCircle} count={data?.onPermission?.length || 0} color="purple" />
      </div>

      {/* List Content */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
          <h3 className="text-sm font-bold text-gray-700 uppercase tracking-widest">
            {activeTab === 'present' && 'Daftar Karyawan Sudah Masuk'}
            {activeTab === 'notPresentYet' && 'Daftar Karyawan Belum Masuk'}
            {activeTab === 'holiday' && 'Daftar Karyawan Libur / Libur Mandiri'}
            {activeTab === 'overtime' && 'Daftar Karyawan Lembur'}
            {activeTab === 'leave' && 'Daftar Karyawan Cuti Tahunan / Melahirkan'}
            {activeTab === 'permission' && 'Daftar Karyawan Izin'}
          </h3>
          <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-[10px] font-bold rounded-full">
            {activeTab === 'present' && (data?.present?.length || 0)}
            {activeTab === 'notPresentYet' && (data?.notPresentYet?.length || 0)}
            {activeTab === 'holiday' && ((data?.onHoliday?.length || 0) + (data?.onLeaveMandiri?.length || 0))}
            {activeTab === 'overtime' && (data?.onOvertime?.length || 0)}
            {activeTab === 'leave' && ((data?.onAnnualLeave?.length || 0) + (data?.onMaternityLeave?.length || 0))}
            {activeTab === 'permission' && (data?.onPermission?.length || 0)}
          </span>
        </div>

        {activeTab === 'present' && renderList(data?.present, 'present')}
        {activeTab === 'notPresentYet' && renderList(data?.notPresentYet, 'notPresentYet')}
        {activeTab === 'holiday' && renderList([...(data?.onHoliday || []), ...(data?.onLeaveMandiri || [])], 'holiday')}
        {activeTab === 'overtime' && renderList(data?.onOvertime, 'overtime')}
        {activeTab === 'leave' && renderList([...(data?.onAnnualLeave || []), ...(data?.onMaternityLeave || [])], 'leave')}
        {activeTab === 'permission' && renderList(data?.onPermission, 'permission')}
      </div>

      {/* Account Detail Modal */}
      {selectedAccountId && (
        <div className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
                  <CircleAlert size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-800">Detail Profil Karyawan</h3>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Informasi lengkap data karyawan</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedAccountId(null)}
                className="p-2 hover:bg-gray-200 rounded-full transition-colors"
              >
                <ArrowLeft size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <AccountDetail 
                id={selectedAccountId} 
                onClose={() => setSelectedAccountId(null)}
                onEdit={() => {}} // Disable edit from here
                onDelete={() => {}} // Disable delete from here
                isReadOnly={true}
                hideLogs={true}
              />
            </div>
          </div>
        </div>
      )}

      {/* Attendance Detail Modal */}
      {selectedAttendance && selectedAccountForAttendance && (
        <AttendanceDetail 
          attendance={selectedAttendance}
          account={selectedAccountForAttendance}
          onClose={() => {
            setSelectedAttendance(null);
            setSelectedAccountForAttendance(null);
          }}
        />
      )}
    </div>
  );
};

export default DailyMonitoring;
