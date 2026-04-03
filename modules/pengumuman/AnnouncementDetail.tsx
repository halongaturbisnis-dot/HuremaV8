import React, { useEffect, useState } from 'react';
import { X, User, Megaphone, Paperclip, ExternalLink, ChevronLeft } from 'lucide-react';
import { Announcement } from '../../types';
import { announcementService } from '../../services/announcementService';

interface AnnouncementDetailProps {
  announcement: Announcement;
  userId: string;
  isAdmin: boolean;
  onClose: () => void;
  onRead?: () => void;
}

const AnnouncementDetail: React.FC<AnnouncementDetailProps> = ({ announcement, userId, isAdmin, onClose, onRead }) => {

  useEffect(() => {
    if (!announcement.is_read) {
      announcementService.markAsRead(announcement.id, userId).then(() => {
        if (onRead) onRead();
      });
    }
  }, [announcement.id, userId]);

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500 bg-white min-h-screen">
      <button onClick={onClose} className="flex items-center gap-2 text-[#006E62] font-bold text-xs uppercase tracking-widest hover:underline">
        <ChevronLeft size={16} /> Kembali
      </button>

      <div className="max-w-3xl mx-auto space-y-8">
        <header className="space-y-4 flex flex-col items-center">
          <h1 className="text-3xl font-black text-gray-800 tracking-tight text-center">{announcement.title}</h1>
          <div className="flex items-center gap-3 justify-center">
            <div className="w-10 h-10 rounded-full bg-[#006E62]/10 text-[#006E62] flex items-center justify-center font-bold text-sm">
              {announcement.creator?.full_name?.charAt(0) || <User size={20} />}
            </div>
            <p className="text-sm font-bold text-gray-700">{announcement.creator?.full_name}</p>
          </div>
        </header>

        <div className="prose prose-sm max-w-none">
          <div className="text-gray-700 leading-relaxed whitespace-pre-wrap text-sm font-medium border-2 border-[#006E62] rounded-xl shadow-sm p-6 bg-white">
            {announcement.content}
          </div>
        </div>

        {announcement.attachments.length > 0 && (
          <div className="pt-8 border-t border-gray-100 space-y-4">
            <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Lampiran</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {announcement.attachments.map((attachment, idx) => {
                const fileId = attachment.split('|')[0];
                return (
                  <a 
                    key={idx}
                    href={`https://drive.google.com/file/d/${fileId}/view`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-4 bg-gray-50 border border-gray-100 rounded-xl hover:border-[#006E62]/20 hover:bg-[#006E62]/5 transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <Paperclip size={16} className="text-gray-400 group-hover:text-[#006E62]" />
                      <span className="text-xs font-bold text-gray-600 group-hover:text-[#006E62]">Dokumen_{idx + 1}</span>
                    </div>
                    <ExternalLink size={16} className="text-gray-300 group-hover:text-[#006E62]" />
                  </a>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AnnouncementDetail;
