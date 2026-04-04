
import React, { useRef, useState, useEffect } from 'react';
import { Camera, RefreshCw, ShieldCheck, ArrowRight, ArrowLeft, Loader2 } from 'lucide-react';
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

interface PresenceCameraProps {
  onCapture: (blob: Blob) => void;
  onClose: () => void;
  isProcessing?: boolean;
}

const PresenceCamera: React.FC<PresenceCameraProps> = ({ onCapture, onClose, isProcessing }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const landmarkerRef = useRef<any>(null);
  const requestRef = useRef<number>(null);
  
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [step, setStep] = useState<'RIGHT' | 'LEFT' | 'READY'>('RIGHT');
  const [isAiLoaded, setIsAiLoaded] = useState(false);
  const isComponentMounted = useRef(true);
  const lastVideoTimeRef = useRef(-1);

  useEffect(() => {
    isComponentMounted.current = true;
    initializeAi();

    return () => {
      isComponentMounted.current = false;
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      stopCamera();
    };
  }, []);

  useEffect(() => {
    if (isAiLoaded) {
      startCamera();
    }
  }, [isAiLoaded]);

  const initializeAi = async () => {
    try {
      const filesetResolver = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
      );
      const landmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
        baseOptions: {
          modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
          delegate: "GPU"
        },
        outputFaceBlendshapes: true,
        runningMode: "VIDEO",
        numFaces: 1
      });
      
      if (isComponentMounted.current) {
        landmarkerRef.current = landmarker;
        setIsAiLoaded(true);
      }
    } catch (err) {
      console.error("AI Init Error:", err);
    }
  };

  const startCamera = async () => {
    try {
      // Menggunakan resolusi 720p ideal dengan aspect ratio 9:16 untuk portrait mobile
      const s = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'user', 
          aspectRatio: { ideal: 9/16 },
          width: { ideal: 720 }, 
          height: { ideal: 1280 } 
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
    if (!isComponentMounted.current || !videoRef.current || !landmarkerRef.current || isProcessing) {
      if (isComponentMounted.current && !isProcessing) {
        requestRef.current = requestAnimationFrame(predictLoop);
      }
      return;
    }

    const video = videoRef.current;
    if (video.readyState >= 2 && video.currentTime !== lastVideoTimeRef.current) {
      lastVideoTimeRef.current = video.currentTime;
      
      try {
        const results = landmarkerRef.current.detectForVideo(video, performance.now());

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
      <div className="relative w-48 h-48 flex items-center justify-center">
        <svg viewBox="0 0 200 200" className={`w-full h-full transition-all duration-500 ${direction === 'READY' ? 'text-emerald-500' : 'text-[#006E62]'}`}>
          {/* Outer Ring */}
          <circle cx="100" cy="100" r="98" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="4 4" className={direction === 'READY' ? 'animate-none' : 'animate-[spin_10s_linear_infinite]'} />
          
          {/* Face Silhouette */}
          <g className="transition-transform duration-700 ease-in-out" style={{ 
            transform: direction === 'RIGHT' ? 'translateX(20px) rotateY(45deg)' : direction === 'LEFT' ? 'translateX(-20px) rotateY(-45deg)' : 'none',
            transformOrigin: 'center'
          }}>
            <path 
              d="M100,40 C70,40 50,65 50,100 C50,140 75,170 100,170 C125,170 150,140 150,100 C150,65 130,40 100,40 Z" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
            />
            {/* Eyes */}
            <circle cx="80" cy="90" r="3" fill="currentColor" opacity={direction === 'LEFT' ? 0.2 : 0.8} />
            <circle cx="120" cy="90" r="3" fill="currentColor" opacity={direction === 'RIGHT' ? 0.2 : 0.8} />
            {/* Nose */}
            <path d="M100,95 L100,115 L95,115" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </g>
        </svg>
        
        {/* Direction Indicator Overlay */}
        <div className="absolute inset-0 flex items-center justify-center">
          {direction === 'RIGHT' && <ArrowRight className="text-[#006E62] animate-ping" size={32} />}
          {direction === 'LEFT' && <ArrowLeft className="text-[#006E62] animate-ping" size={32} />}
          {direction === 'READY' && <ShieldCheck className="text-emerald-400 scale-125" size={40} />}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black flex flex-col animate-in fade-in duration-300">
      {!isAiLoaded ? (
        <div className="flex-1 flex flex-col items-center justify-center text-white/50 gap-4">
          <Loader2 className="animate-spin text-[#006E62]" size={48} />
          <p className="text-[10px] font-bold uppercase tracking-widest text-center px-6">Inisialisasi Keamanan AI...</p>
        </div>
      ) : (
        <div className="relative flex-1 flex flex-col overflow-hidden">
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            muted 
            className="absolute inset-0 w-full h-full object-cover bg-black scale-x-[-1]"
          />
          
          {/* Overlay Gradient */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/60 pointer-events-none" />

          {/* Top Navigation */}
          <div className="relative z-50 flex items-center justify-between p-6 pointer-events-auto">
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
            <div className="w-12" /> {/* Spacer */}
          </div>

          {/* Center Content */}
          <div className="flex-1 flex flex-col items-center justify-center relative z-40 pointer-events-none">
            <div className="mb-8">
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

          {/* Bottom Controls */}
          <div className="relative z-50 p-8 pb-12 space-y-6 pointer-events-auto">
            <div className="max-w-xs mx-auto">
              <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-700 ease-out shadow-[0_0_15px_rgba(0,110,98,0.5)] bg-[#006E62]`} 
                  style={{ width: step === 'RIGHT' ? '33%' : step === 'LEFT' ? '66%' : '100%' }}
                />
              </div>
            </div>

            <div className="flex justify-center gap-4">
              <button 
                onClick={() => { 
                  setStep('RIGHT');
                  lastVideoTimeRef.current = -1;
                }}
                disabled={isProcessing}
                className="p-5 text-white/70 hover:text-white bg-white/10 backdrop-blur-xl rounded-full border border-white/10 transition-all hover:bg-white/20 disabled:opacity-30"
              >
                <RefreshCw size={28} />
              </button>
              <button 
                onClick={handleCapture}
                disabled={step !== 'READY' || isProcessing}
                className={`flex items-center gap-3 px-12 py-5 rounded-full font-black uppercase text-[11px] tracking-[0.2em] shadow-2xl transition-all ${
                  step === 'READY'
                  ? 'bg-[#006E62] text-white hover:scale-105 active:scale-95 shadow-[#006E62]/40' 
                  : 'bg-white/5 text-white/20 cursor-not-allowed border border-white/5'
                }`}
              >
                <Camera size={22} />
                {isProcessing ? 'PROSES...' : 'AMBIL FOTO'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PresenceCamera;
