
import React, { useRef, useState, useEffect } from 'react';
import { Camera, RefreshCw, ShieldCheck, ArrowRight, ArrowLeft, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface PresenceCameraProps {
  onCapture: (blob: Blob) => void;
  onClose: () => void;
  isProcessing?: boolean;
  landmarker: any;
}

const PresenceCamera: React.FC<PresenceCameraProps> = ({ onCapture, onClose, isProcessing, landmarker }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const requestRef = useRef<number>(null);
  
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [step, setStep] = useState<'RIGHT' | 'LEFT' | 'READY'>('RIGHT');
  const isComponentMounted = useRef(true);
  const lastVideoTimeRef = useRef(-1);

  useEffect(() => {
    isComponentMounted.current = true;
    startCamera();

    return () => {
      isComponentMounted.current = false;
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    try {
      // Menggunakan resolusi 720p ideal dengan aspect ratio 3:4 untuk portrait mobile yang lebih natural
      const s = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'user', 
          aspectRatio: { ideal: 3/4 },
          width: { ideal: 720 }, 
          height: { ideal: 960 } 
        } 
      });
      
      if (isComponentMounted.current) {
        setStream(s);
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          videoRef.current.onloadedmetadata = () => {
            if (videoRef.current) videoRef.current.play();
            predictLoop();
          };
        }
      }
    } catch (err) {
      console.error("Camera Error:", err);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
  };

  const predictLoop = () => {
    // PAUSE loop jika sedang memproses capture untuk membebaskan resource hardware
    if (!isComponentMounted.current || !videoRef.current || !landmarker || isProcessing) {
      if (isComponentMounted.current && !isProcessing) {
        requestRef.current = requestAnimationFrame(predictLoop);
      }
      return;
    }

    const video = videoRef.current;
    if (video.readyState >= 2 && video.currentTime !== lastVideoTimeRef.current) {
      lastVideoTimeRef.current = video.currentTime;
      
      try {
        const results = landmarker.detectForVideo(video, performance.now());

        if (results.faceLandmarks && results.faceLandmarks.length > 0) {
          const landmarks = results.faceLandmarks[0];
          const nose = landmarks[4];
          const rightEdge = landmarks[234];
          const leftEdge = landmarks[454];

          const faceWidth = Math.abs(leftEdge.x - rightEdge.x);
          const noseRelativeX = (nose.x - Math.min(rightEdge.x, leftEdge.x)) / faceWidth;

          setStep(prev => {
            if (prev === 'RIGHT' && noseRelativeX < 0.35) return 'LEFT';
            if (prev === 'LEFT' && noseRelativeX > 0.65) return 'READY';
            return prev;
          });
        }
      } catch (e) {
        console.error("In-loop detection error:", e);
      }
    }

    if (isComponentMounted.current) {
      requestRef.current = requestAnimationFrame(predictLoop);
    }
  };

  const handleCapture = () => {
    const video = videoRef.current;
    if (!video || video.readyState < 2) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      canvas.toBlob((blob) => {
        if (blob) onCapture(blob);
      }, 'image/jpeg', 0.9);
    }
  };

  const FaceSilhouette = ({ direction }: { direction: 'RIGHT' | 'LEFT' | 'READY' }) => {
    return (
      <div className="relative w-48 h-56 flex flex-col items-center justify-center">
        {/* Direction Indicator Overlay - Moved ABOVE the SVG with sliding animation */}
        <div className="h-12 w-full flex items-center justify-center mb-2 relative overflow-hidden">
          <AnimatePresence mode="wait">
            {direction === 'RIGHT' && (
              <motion.div
                key="right"
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: [ -20, 20, -20 ], opacity: 1 }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className="text-[#006E62]"
              >
                <ArrowRight size={32} />
              </motion.div>
            )}
            {direction === 'LEFT' && (
              <motion.div
                key="left"
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: [ 20, -20, 20 ], opacity: 1 }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className="text-[#006E62]"
              >
                <ArrowLeft size={32} />
              </motion.div>
            )}
            {direction === 'READY' && (
              <motion.div
                key="ready"
                initial={{ scale: 0 }}
                animate={{ scale: 1.25 }}
                className="text-emerald-400"
              >
                <ShieldCheck size={40} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="relative w-40 h-40">
          <svg viewBox="0 0 200 200" className={`w-full h-full transition-all duration-500 ${direction === 'READY' ? 'text-emerald-500' : 'text-[#006E62]'}`}>
            {/* Face Silhouette - Thicker stroke */}
            <g className="transition-transform duration-700 ease-in-out" style={{ 
              transform: direction === 'RIGHT' ? 'translateX(20px) rotateY(45deg)' : direction === 'LEFT' ? 'translateX(-20px) rotateY(-45deg)' : 'none',
              transformOrigin: 'center'
            }}>
              <path 
                d="M100,40 C70,40 50,65 50,100 C50,140 75,170 100,170 C125,170 150,140 150,100 C150,65 130,40 100,40 Z" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="4" 
              />
              {/* Eyes */}
              <circle cx="80" cy="90" r="4" fill="currentColor" opacity={direction === 'LEFT' ? 0.2 : 0.8} />
              <circle cx="120" cy="90" r="4" fill="currentColor" opacity={direction === 'RIGHT' ? 0.2 : 0.8} />
              {/* Nose */}
              <path d="M100,95 L100,115 L95,115" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
            </g>
          </svg>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black flex flex-col animate-in fade-in duration-300">
      <div className="relative flex-1 flex flex-col bg-black">
        {/* Top Space for Navigation */}
        <div className="h-24 flex items-center justify-between px-6 z-50">
          <button 
            onClick={onClose}
            disabled={isProcessing}
            className="p-3 bg-white/10 backdrop-blur-xl rounded-full text-white hover:bg-white/20 transition-all border border-white/10"
          >
            <ArrowLeft size={24} />
          </button>
          <div className="bg-black/40 backdrop-blur-xl px-4 py-2 rounded-full border border-white/10">
            <p className="text-white text-[10px] font-black uppercase tracking-[0.2em]">Verifikasi Wajah</p>
          </div>
          <div className="w-12" />
        </div>

        {/* 3:4 Video Container */}
        <div className="relative w-full aspect-[3/4] bg-black overflow-hidden">
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            muted 
            className="absolute inset-0 w-full h-full object-cover scale-x-[-1]"
          />
          
          {/* Overlay Gradient */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/40 pointer-events-none" />

          {/* Center Content (Face Silhouette) */}
          <div className="absolute inset-0 flex flex-col items-center justify-center z-40 pointer-events-none">
            <div className="mb-4">
              <FaceSilhouette direction={step} />
            </div>

            <div className="bg-black/40 backdrop-blur-xl px-6 py-3 rounded-2xl border border-white/10 text-center animate-in fade-in zoom-in duration-500">
              {step === 'RIGHT' && (
                <p className="text-white text-[11px] font-bold uppercase tracking-[0.2em]">Tengok ke Kanan</p>
              )}
              {step === 'LEFT' && (
                <p className="text-white text-[11px] font-bold uppercase tracking-[0.2em]">Tengok ke Kiri</p>
              )}
              {step === 'READY' && (
                <p className="text-emerald-400 text-[11px] font-bold uppercase tracking-[0.2em]">Identitas Terverifikasi</p>
              )}
            </div>
          </div>

          {/* Buttons INSIDE the 3:4 frame at the bottom */}
          <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-4 z-50 pointer-events-auto">
            <button 
              onClick={() => { 
                setStep('RIGHT');
                lastVideoTimeRef.current = -1;
              }}
              disabled={isProcessing}
              className="p-4 text-white/70 hover:text-white bg-black/40 backdrop-blur-xl rounded-full border border-white/10 transition-all hover:bg-white/20 disabled:opacity-30"
            >
              <RefreshCw size={24} />
            </button>
            <button 
              onClick={handleCapture}
              disabled={step !== 'READY' || isProcessing}
              className={`flex items-center gap-3 px-8 py-4 rounded-full font-black uppercase text-[10px] tracking-[0.2em] shadow-2xl transition-all ${
                step === 'READY'
                ? 'bg-[#006E62] text-white hover:scale-105 active:scale-95 shadow-[#006E62]/40' 
                : 'bg-black/40 text-white/20 cursor-not-allowed border border-white/10'
              }`}
            >
              <Camera size={20} />
              {isProcessing ? 'PROSES...' : 'AMBIL FOTO'}
            </button>
          </div>
        </div>

        {/* Bottom Space for Progress Line ONLY */}
        <div className="flex-1 flex flex-col justify-center p-8 z-50">
          <div className="max-w-xs mx-auto w-full">
            <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-700 ease-out shadow-[0_0_15px_rgba(0,110,98,0.5)] bg-[#006E62]`} 
                style={{ width: step === 'RIGHT' ? '33%' : step === 'LEFT' ? '66%' : '100%' }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PresenceCamera;
