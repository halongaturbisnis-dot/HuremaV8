
import React from 'react';
import { X, Clock, Calendar, CheckCircle2, AlertCircle } from 'lucide-react';
import { Schedule } from '../../../types';

interface ScheduleViewModalProps {
  schedule: Schedule;
  onClose: () => void;
}

const ScheduleViewModal: React.FC<ScheduleViewModalProps> = ({ schedule, onClose }) => {
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

  const getBadgeType = (type: number) => {
    switch(type) {
      case 1: return { label: 'Fixed', color: 'bg-emerald-50 text-emerald-600 border-emerald-100' };
      case 2: return { label: 'Shift', color: 'bg-blue-50 text-blue-600 border-blue-100' };
      case 3: return { label: 'Libur', color: 'bg-rose-50 text-rose-600 border-rose-100' };
      case 4: return { label: 'Khusus', color: 'bg-amber-50 text-amber-600 border-amber-100' };
      default: return { label: 'Jadwal', color: 'bg-gray-50 text-gray-600 border-gray-100' };
    }
  };

  const badge = getBadgeType(schedule.type);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 overflow-hidden">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#006E62]/10 rounded-lg">
              <Clock size={20} className="text-[#006E62]" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-800 leading-tight">Detail Jadwal</h3>
              <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">Informasi Jam Kerja</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <h2 className="text-xl font-bold text-gray-800 tracking-tight">{schedule.name}</h2>
              <span className={`inline-block px-2 py-0.5 rounded border text-[10px] font-bold uppercase tracking-widest ${badge.color}`}>
                {badge.label}
              </span>
            </div>
            <div className="text-right space-y-1">
              <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400">Toleransi</p>
              <div className="flex items-center gap-2 text-xs font-semibold text-gray-700 justify-end">
                <AlertCircle size={12} className="text-[#006E62]" /> 
                {schedule.tolerance_checkin_minutes || 0} In / {schedule.tolerance_checkout_minutes || 0} Out
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Jam Kerja Mingguan</p>
            <div className="grid grid-cols-1 gap-2">
              {days.map((day, index) => {
                const rule = schedule.rules?.find(r => r.day_of_week === index);
                const isHoliday = rule?.is_holiday ?? true;
                
                return (
                  <div 
                    key={day} 
                    className={`flex items-center justify-between p-3 rounded-lg border ${isHoliday ? 'bg-gray-50/50 border-gray-100 opacity-60' : 'bg-white border-gray-100 shadow-sm'}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold ${isHoliday ? 'bg-gray-200 text-gray-400' : 'bg-[#006E62]/10 text-[#006E62]'}`}>
                        {day.slice(0, 1)}
                      </div>
                      <span className={`text-xs font-bold ${isHoliday ? 'text-gray-400' : 'text-gray-700'}`}>{day}</span>
                    </div>
                    
                    {isHoliday ? (
                      <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Libur</span>
                    ) : (
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-[8px] font-bold uppercase text-gray-400">Masuk</p>
                          <p className="text-xs font-bold text-gray-700">{rule?.check_in_time?.slice(0, 5) || '-'}</p>
                        </div>
                        <div className="w-px h-6 bg-gray-100"></div>
                        <div className="text-left">
                          <p className="text-[8px] font-bold uppercase text-gray-400">Pulang</p>
                          <p className="text-xs font-bold text-gray-700">{rule?.check_out_time?.slice(0, 5) || '-'}</p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
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

export default ScheduleViewModal;
