import React from 'react';
import { User, Check } from 'lucide-react';
import { Account } from '../../types';
import { googleDriveService } from '../../services/googleDriveService';

interface AccountListItemProps {
  account: Account;
  isSelected: boolean;
  onClick: () => void;
  showCheck?: boolean;
}

const AccountListItem: React.FC<AccountListItemProps> = ({ 
  account, 
  isSelected, 
  onClick,
  showCheck = true
}) => {
  const photoUrl = account.photo_google_id ? googleDriveService.getFileUrl(account.photo_google_id) : null;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${
        isSelected
          ? 'bg-[#006E62]/5 border-[#006E62]/20'
          : 'bg-white border-gray-100 hover:bg-gray-50'
      }`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="relative shrink-0">
          {photoUrl ? (
            <img 
              src={photoUrl} 
              alt={account.full_name}
              referrerPolicy="no-referrer"
              className="w-10 h-10 rounded-lg object-cover shadow-sm"
            />
          ) : (
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              isSelected ? 'bg-[#006E62] text-white' : 'bg-gray-100 text-gray-400'
            }`}>
              <User size={20} />
            </div>
          )}
        </div>
        <div className="text-left min-w-0">
          <p className="text-[10px] font-bold text-gray-700 truncate">{account.full_name}</p>
          <p className="text-[9px] text-gray-400 font-medium truncate">
            {account.internal_nik} • {account.location?.name || '-'} • {account.grade || '-'} • {account.position || '-'}
          </p>
        </div>
      </div>
      {isSelected && showCheck && (
        <div className="w-5 h-5 bg-[#006E62] rounded-full flex items-center justify-center text-white shrink-0 ml-2">
          <Check size={12} />
        </div>
      )}
    </button>
  );
};

export default AccountListItem;
