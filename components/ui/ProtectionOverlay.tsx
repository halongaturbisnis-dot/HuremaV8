import React from 'react';
import { motion } from 'motion/react';
import { AlertCircle, LucideIcon } from 'lucide-react';

interface ProtectionOverlayProps {
  title: string;
  message: string;
  icon?: LucideIcon;
}

const ProtectionOverlay: React.FC<ProtectionOverlayProps> = ({ 
  title, 
  message, 
  icon: Icon = AlertCircle 
}) => {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="absolute inset-0 z-[40] backdrop-blur-md bg-white/80 flex flex-col items-center justify-center p-8 text-center rounded-3xl overflow-hidden"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="flex flex-col items-center"
      >
        <div className="w-24 h-24 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center mb-8 shadow-xl ring-8 ring-rose-50/50">
          <Icon size={56} />
        </div>
        <h3 className="text-3xl font-black text-gray-800 tracking-tight mb-4">
          {title}
        </h3>
        <p className="text-sm text-gray-400 max-w-xs leading-relaxed font-medium">
          {message}
        </p>
      </motion.div>
    </motion.div>
  );
};

export default ProtectionOverlay;
