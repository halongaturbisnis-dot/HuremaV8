
import React, { useRef, useState, useEffect } from 'react';
import { Camera, RefreshCw, ShieldCheck, ArrowRight, ArrowLeft, ArrowUp, ArrowDown, Loader2 } from 'lucide-react';
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
  const [step, setStep] = useState<'RIGHT' | 'LEFT' | 'UP' | 'DOWN' | 'MOUTH' | 'READY'>('RIGHT');
  const [hasCaptured, setHasCaptured] = useState(false);
  const isComponentMounted = useRef(true);
  const lastVideoTimeRef = useRef(-1);

  useEffect(() => {
    if (step === 'READY' && !hasCaptured && !isProcessing) {
      const timer = setTimeout(() => {
        handleCapture();
        setHasCaptured(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [step, hasCaptured, isProcessing]);

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
          const topEdge = landmarks[10];
          const bottomEdge = landmarks[152];

          const faceWidth = Math.abs(leftEdge.x - rightEdge.x);
          const faceHeight = Math.abs(bottomEdge.y - topEdge.y);
          
          const noseRelativeX = (nose.x - Math.min(rightEdge.x, leftEdge.x)) / faceWidth;
          const noseRelativeY = (nose.y - Math.min(topEdge.y, bottomEdge.y)) / faceHeight;

          setStep(prev => {
            if (prev === 'RIGHT' && noseRelativeX < 0.35) return 'LEFT';
            if (prev === 'LEFT' && noseRelativeX > 0.65) return 'MOUTH';
            
            if (prev === 'MOUTH') {
              // Pastikan wajah dalam posisi netral (tidak mendongak/menunduk) sebelum cek mulut
              const isNeutralY = noseRelativeY > 0.4 && noseRelativeY < 0.6;
              const blendshapes = results.faceBlendshapes[0]?.categories;
              if (blendshapes && isNeutralY) {
                const jawOpen = blendshapes.find((c: any) => (c.categoryName === 'jawOpen' || c.label === 'jawOpen'))?.score || 0;
                if (jawOpen > 0.45) return 'DOWN';
              }
            }

            if (prev === 'DOWN' && noseRelativeY > 0.65) return 'UP';
            if (prev === 'UP' && noseRelativeY < 0.35) return 'READY';
            
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

  const FaceSilhouette = ({ direction }: { direction: 'RIGHT' | 'LEFT' | 'UP' | 'DOWN' | 'MOUTH' | 'READY' }) => {
    return (
      <div className="relative w-48 h-56 flex flex-col items-center justify-center">
        {/* Direction Indicator Overlay - Bright color and shadow */}
        <div className="h-12 w-full flex items-center justify-center mb-2 relative overflow-hidden drop-shadow-[0_2px_3px_rgba(0,0,0,0.5)]">
          <AnimatePresence mode="wait">
            {direction === 'RIGHT' && (
              <motion.div
                key="right"
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: [ -20, 20, -20 ], opacity: 1 }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className="text-emerald-400"
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
                className="text-emerald-400"
              >
                <ArrowLeft size={32} />
              </motion.div>
            )}
            {direction === 'UP' && (
              <motion.div
                key="up"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: [ 20, -20, 20 ], opacity: 1 }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className="text-emerald-400"
              >
                <ArrowUp size={32} />
              </motion.div>
            )}
            {direction === 'DOWN' && (
              <motion.div
                key="down"
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: [ -20, 20, -20 ], opacity: 1 }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className="text-emerald-400"
              >
                <ArrowDown size={32} />
              </motion.div>
            )}
            {direction === 'MOUTH' && (
              <motion.div
                key="mouth"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: [0.8, 1.2, 0.8], opacity: 1 }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                className="text-emerald-400"
              >
                <div className="w-8 h-8 border-4 border-current rounded-full" />
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

        <div className="relative w-40 h-40 drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
          <svg viewBox="0 0 200 200" className="w-full h-full transition-all duration-500 text-emerald-400">
            {/* Face Silhouette - Thicker stroke */}
            <g className="transition-transform duration-700 ease-in-out" style={{ 
              transform: `
                ${direction === 'RIGHT' ? 'translateX(20px) rotateY(45deg)' : direction === 'LEFT' ? 'translateX(-20px) rotateY(-45deg)' : ''}
                ${direction === 'UP' ? 'translateY(-15px) rotateX(-30deg)' : direction === 'DOWN' ? 'translateY(15px) rotateX(30deg)' : ''}
              `,
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
              {/* Mouth - Dynamic for Buka Mulut */}
              <path 
                d={direction === 'MOUTH' ? "M85,140 Q100,165 115,140" : "M85,145 Q100,145 115,145"} 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="4" 
                strokeLinecap="round"
                className="transition-all duration-300"
              />
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
          <div className="flex flex-col items-center gap-2">
            <div className="bg-black/40 backdrop-blur-xl px-4 py-2 rounded-full border border-white/10">
              <p className="text-white text-[10px] font-black uppercase tracking-[0.2em]">Verifikasi Wajah</p>
            </div>
            <AnimatePresence>
              {step === 'MOUTH' && (
                <motion.div 
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="bg-emerald-500/20 backdrop-blur-xl px-3 py-1 rounded-lg border border-emerald-500/30"
                >
                  <p className="text-emerald-400 text-[8px] font-bold uppercase tracking-[0.1em]">Wajah Tegak Di Tengah & Lurus ke Depan</p>
                </motion.div>
              )}
            </AnimatePresence>
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
          
          {/* Scanning Animation Overlay */}
          <AnimatePresence>
            {step === 'READY' && !hasCaptured && (
              <motion.div
                initial={{ top: "0%" }}
                animate={{ top: "100%" }}
                transition={{ duration: 2, ease: "linear" }}
                className="absolute left-0 right-0 h-1 bg-[#006E62] shadow-[0_0_15px_#006E62] z-50 pointer-events-none"
              />
            )}
          </AnimatePresence>
          
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
              {step === 'MOUTH' && (
                <p className="text-white text-[11px] font-bold uppercase tracking-[0.2em]">Buka Mulut Anda</p>
              )}
              {step === 'UP' && (
                <p className="text-white text-[11px] font-bold uppercase tracking-[0.2em]">Dangak ke Atas</p>
              )}
              {step === 'DOWN' && (
                <p className="text-white text-[11px] font-bold uppercase tracking-[0.2em]">Menunduk ke Bawah</p>
              )}
              {step === 'READY' && (
                <div className="flex flex-col gap-1">
                  <p className="text-emerald-400 text-[11px] font-bold uppercase tracking-[0.2em]">Identitas Terverifikasi</p>
                  <p className="text-white/60 text-[9px] font-medium uppercase tracking-[0.1em] animate-pulse">Mengambil Foto...</p>
                </div>
              )}
            </div>
          </div>

          {/* Buttons INSIDE the 3:4 frame at the bottom */}
          <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-4 z-50 pointer-events-auto">
            <button 
              onClick={() => { 
                setStep('RIGHT');
                setHasCaptured(false);
                lastVideoTimeRef.current = -1;
              }}
              disabled={isProcessing}
              className="p-4 text-white/70 hover:text-white bg-black/40 backdrop-blur-xl rounded-full border border-white/10 transition-all hover:bg-white/20 disabled:opacity-30"
            >
              <RefreshCw size={24} />
            </button>
          </div>
        </div>

        {/* Bottom Space for Progress Line ONLY */}
        <div className="flex-1 flex flex-col justify-center p-8 z-50">
          <div className="max-w-xs mx-auto w-full">
            <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-700 ease-out shadow-[0_0_15px_rgba(0,110,98,0.5)] bg-[#006E62]`} 
                style={{ 
                  width: step === 'RIGHT' ? '20%' : 
                         step === 'LEFT' ? '40%' : 
                         step === 'MOUTH' ? '60%' : 
                         step === 'DOWN' ? '80%' : 
                         step === 'UP' ? '90%' : '100%' 
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PresenceCamera;
