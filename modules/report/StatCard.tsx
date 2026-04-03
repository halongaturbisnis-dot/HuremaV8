import React from 'react';

interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ElementType;
  color: string;
  description?: string;
  onClick?: () => void;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, color, description, onClick }) => {
  return (
    <div 
      className={`bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4 ${onClick ? 'cursor-pointer hover:shadow-md transition-all' : ''}`} 
      onClick={onClick}
    >
      <div className={`p-4 rounded-lg ${color} bg-opacity-10 text-${color.split('-')[1]}-600`}>
        <Icon size={24} />
      </div>
      <div>
        <p className="text-sm text-gray-500 font-medium">{title}</p>
        <h3 className="text-2xl font-bold text-gray-900">{value}</h3>
        {description && <p className="text-xs text-gray-400 mt-1">{description}</p>}
      </div>
    </div>
  );
};

export default StatCard;
