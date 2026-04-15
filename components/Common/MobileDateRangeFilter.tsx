
import React from 'react';
import { formatDateID } from '../../utils/dateFormatter';

interface MobileDateRangeFilterProps {
  startDate: string;
  endDate: string;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  maxDays?: number;
}

const MobileDateRangeFilter: React.FC<MobileDateRangeFilterProps> = ({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  maxDays = 31
}) => {
  return (
    <div className="bg-white p-5 rounded-[32px] border border-gray-100 shadow-sm space-y-4">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Filter Periode</h3>
        {maxDays && (
          <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
            Maks {maxDays} Hari
          </span>
        )}
      </div>

      <div className="space-y-3">
        {/* Start Date */}
        <div className="relative group">
          <div className="absolute inset-0 bg-gray-50 rounded-2xl group-active:scale-[0.98] transition-all" />
          <div className="relative py-3 px-4 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Mulai Dari</span>
            <span className="text-sm font-black text-gray-700 tracking-tight">
              {formatDateID(startDate)}
            </span>
          </div>
          <input 
            type="date" 
            value={startDate}
            onChange={(e) => onStartDateChange(e.target.value)}
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
          />
        </div>

        {/* Separator */}
        <div className="flex items-center justify-center gap-4">
          <div className="h-[1px] flex-1 bg-gray-100" />
          <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest">sampai</span>
          <div className="h-[1px] flex-1 bg-gray-100" />
        </div>

        {/* End Date */}
        <div className="relative group">
          <div className="absolute inset-0 bg-gray-50 rounded-2xl group-active:scale-[0.98] transition-all" />
          <div className="relative py-3 px-4 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Hingga Tanggal</span>
            <span className="text-sm font-black text-gray-700 tracking-tight">
              {formatDateID(endDate)}
            </span>
          </div>
          <input 
            type="date" 
            value={endDate}
            onChange={(e) => onEndDateChange(e.target.value)}
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
          />
        </div>
      </div>
    </div>
  );
};

export default MobileDateRangeFilter;
