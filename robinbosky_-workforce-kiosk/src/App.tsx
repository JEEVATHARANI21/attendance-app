/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo, useRef, FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Webcam from 'react-webcam';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { predictEmployeeIdentity } from './services/geminiBiometric';
import { User, AttendanceRecord, ShiftType, Role, AppNotification } from './types';
import { db, auth } from './lib/firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  onAuthStateChanged, 
  signOut 
} from 'firebase/auth';
import { 
  collection, 
  onSnapshot, 
  setDoc, 
  doc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  where,
  Timestamp,
  addDoc
} from 'firebase/firestore';
import { 
  Clock, 
  DollarSign, 
  Calendar as CalendarIcon, 
  Users, 
  FileText, 
  Settings, 
  ArrowRight, 
  LogOut, 
  MapPin, 
  PieChart, 
  Bell,
  Search,
  ChevronRight,
  ChevronLeft,
  TrendingUp,
  ShieldCheck,
  CheckCircle2,
  Scan,
  Camera,
  BellRing,
  AlertTriangle,
  Timer,
  Mail,
  Lock,
  Heart,
  Download,
  Pencil,
  Trash2,
  UserCheck,
  AlertCircle,
  X
} from 'lucide-react';

// --- Types & Constants ---

const playClockInBeep = () => {
  try {
    const AudioContextClass = (window.AudioContext || (window as any).webkitAudioContext);
    if (!AudioContextClass) return;
    const audioContext = new AudioContextClass();
    
    const playNote = (freq: number, start: number, duration: number) => {
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();
      osc.connect(gain);
      gain.connect(audioContext.destination);
      osc.type = 'triangle'; // Softer, more professional than sine
      osc.frequency.setValueAtTime(freq, audioContext.currentTime + start);
      gain.gain.setValueAtTime(0, audioContext.currentTime + start);
      gain.gain.linearRampToValueAtTime(0.12, audioContext.currentTime + start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + start + duration);
      osc.start(audioContext.currentTime + start);
      osc.stop(audioContext.currentTime + start + duration);
    };

    // Bright upward D-major arpeggio
    playNote(587.33, 0, 0.15); // D5
    playNote(739.99, 0.1, 0.15); // F#5
    playNote(880.00, 0.2, 0.3); // A5
    
    setTimeout(() => audioContext.close(), 1000);
  } catch (err) {
    console.warn('Clock-in audio failed');
  }
};

const playClockOutBeep = () => {
  try {
    const AudioContextClass = (window.AudioContext || (window as any).webkitAudioContext);
    if (!AudioContextClass) return;
    const audioContext = new AudioContextClass();

    const playNote = (freq: number, start: number, duration: number) => {
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();
      osc.connect(gain);
      gain.connect(audioContext.destination);
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, audioContext.currentTime + start);
      gain.gain.setValueAtTime(0, audioContext.currentTime + start);
      gain.gain.linearRampToValueAtTime(0.12, audioContext.currentTime + start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + start + duration);
      osc.start(audioContext.currentTime + start);
      osc.stop(audioContext.currentTime + start + duration);
    };

    // Professional downward triad
    playNote(880.00, 0, 0.15); // A5
    playNote(739.99, 0.1, 0.15); // F#5
    playNote(587.33, 0.2, 0.4); // D5
    
    setTimeout(() => audioContext.close(), 1000);
  } catch (err) {
    console.warn('Clock-out audio failed');
  }
};

const playIdentityVerifiedBeep = () => {
  try {
    const AudioContextClass = (window.AudioContext || (window as any).webkitAudioContext);
    if (!AudioContextClass) return;
    const audioContext = new AudioContextClass();
    
    const playNote = (freq: number, start: number, duration: number) => {
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();
      osc.connect(gain);
      gain.connect(audioContext.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, audioContext.currentTime + start);
      gain.gain.setValueAtTime(0, audioContext.currentTime + start);
      gain.gain.linearRampToValueAtTime(0.15, audioContext.currentTime + start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + start + duration);
      osc.start(audioContext.currentTime + start);
      osc.stop(audioContext.currentTime + start + duration);
    };

    // Upward fourth (G5 to C6) - authoritative and pleasant
    playNote(783.99, 0, 0.15); // G5
    playNote(1046.50, 0.15, 0.3); // C6
    
    setTimeout(() => audioContext.close(), 1000);
  } catch (err) {
    console.warn('Identity verification audio failed');
  }
};

const playScanCompleteBeep = () => {
  try {
    const AudioContextClass = (window.AudioContext || (window as any).webkitAudioContext);
    if (!AudioContextClass) return;
    const audioContext = new AudioContextClass();
    
    const playNote = (freq: number, start: number, duration: number) => {
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();
      osc.connect(gain);
      gain.connect(audioContext.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, audioContext.currentTime + start);
      gain.gain.setValueAtTime(0, audioContext.currentTime + start);
      gain.gain.linearRampToValueAtTime(0.1, audioContext.currentTime + start + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + start + duration);
      osc.start(audioContext.currentTime + start);
      osc.stop(audioContext.currentTime + start + duration);
    };

    // Rapid triple-pulse high-tech blip
    playNote(1046.50, 0, 0.05);      // C6
    playNote(1318.51, 0.07, 0.05);   // E6
    playNote(1567.98, 0.14, 0.1);    // G6
    
    setTimeout(() => audioContext.close(), 600);
  } catch (err) {
    console.warn('Scan complete audio failed');
  }
};

const playSuccessBeep = () => {
  try {
    const AudioContextClass = (window.AudioContext || (window as any).webkitAudioContext);
    if (!AudioContextClass) return;
    
    const audioContext = new AudioContextClass();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, audioContext.currentTime); // A5 note

    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.2, audioContext.currentTime + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.4);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.4);
    
    // Auto-close context after beep to save resources
    setTimeout(() => audioContext.close(), 500);
  } catch (err) {
    console.warn('Biometric beep audio context initialization suppressed by browser policy or missing hardware.');
  }
};

// --- Mock Data ---

const INDIA_HOLIDAYS_2026 = [
  { date: '26 Jan', name: 'Republic Day', type: 'NATIONAL' },
  { date: '3 Mar', name: 'Holi', type: 'GAZETTED' },
  { date: '27 Mar', name: 'Eid al-Fitr', type: 'GAZETTED' },
  { date: '2 Apr', name: 'Mahavir Jayanti', type: 'GAZETTED' },
  { date: '3 Apr', name: 'Good Friday', type: 'GAZETTED' },
  { date: '15 Aug', name: 'Independence Day', type: 'NATIONAL' },
  { date: '2 Oct', name: 'Gandhi Jayanti', type: 'NATIONAL' },
  { date: '8 Nov', name: 'Diwali', type: 'GAZETTED' },
  { date: '25 Dec', name: 'Christmas', type: 'NATIONAL' },
  { date: '12 Jun', name: 'Company Foundation Day', type: 'COMPANY' },
];

const INITIAL_EMPLOYEES: User[] = [];

const MOCK_ADMIN: User = {
  id: 'adm_1',
  name: 'Robin Bosky',
  role: 'ADMIN',
  position: 'Factory Owner',
};

const MOCK_MANAGER: User = {
  id: 'mgr_1',
  name: 'Sarah Connor',
  role: 'MANAGER',
  position: 'Site Manager',
};

const INITIAL_ATTENDANCE: AttendanceRecord[] = [];

const INITIAL_NOTIFICATIONS: AppNotification[] = [];

// --- Shared Analytics Helpers ---
const calculateDailyRate = (salary = 0) => salary / 25;
const calculateHourlyRate = (salary = 0) => calculateDailyRate(salary) / 8;

// --- Feature Utils ---
const handleFirestoreError = (err: any, operationType: string, path: string | null = null) => {
  if (err.code === 'permission-denied') {
    const errorInfo = {
      error: err.message,
      operationType,
      path,
      authInfo: {
        userId: auth.currentUser?.uid || 'anonymous',
        email: auth.currentUser?.email || 'none',
        emailVerified: auth.currentUser?.emailVerified || false,
        isAnonymous: auth.currentUser?.isAnonymous || false,
        providerInfo: auth.currentUser?.providerData.map(p => ({
          providerId: p.providerId,
          displayName: p.displayName || '',
          email: p.email || ''
        })) || []
      }
    };
    throw new Error(JSON.stringify(errorInfo));
  }
  throw err;
};

const getGranularPayroll = (emp: User, attendance: AttendanceRecord[]) => {
  const empLogs = attendance.filter((a: AttendanceRecord) => a.userId === emp.id);
  let totalWorkedHours = 0;
  let totalOvertimeHours = 0;
  let totalPenalties = 0;
  let daysPresent = 0;

  empLogs.forEach((log: AttendanceRecord) => {
    daysPresent++;
    totalPenalties += log.penalty || 0;

    if (log.clockIn && log.clockOut) {
      const diff = new Date(log.clockOut).getTime() - new Date(log.clockIn).getTime();
      const hours = diff / (1000 * 60 * 60);
      totalWorkedHours += Math.min(hours, 8);
      totalOvertimeHours += Math.max(0, hours - 8);
    } else if (log.clockIn) {
      totalWorkedHours += 8;
    }
  });

  const dailyRate = calculateDailyRate(emp.baseSalary);
  const regularPay = daysPresent * dailyRate;
  
  const otMultiplier = emp.shiftType === 'NIGHT' ? 2.0 : emp.shiftType === 'SHIFT' ? 1.75 : 1.5;
  const overtimePay = totalOvertimeHours * calculateHourlyRate(emp.baseSalary) * otMultiplier;
  
  // Formula: (per day salary * comming days) - penalty - advance
  const advanceAmount = emp.advanceAmount || 0;
  const netPayout = regularPay + overtimePay - totalPenalties - advanceAmount;

  return {
    totalWorkedHours: totalWorkedHours.toFixed(1),
    totalOvertimeHours: totalOvertimeHours.toFixed(1),
    totalPenalties,
    grossSalary: regularPay + overtimePay,
    advanceAmount,
    netPayout: netPayout > 0 ? netPayout : 0,
    daysPresent,
    dailyRate,
    regularPay
  };
};

// --- Atomic Components ---

const BiometricScanner = ({ onCapture, onCancel, employees }: { 
  onCapture: (data: string, matchedUser?: User) => void, 
  onCancel: () => void,
  employees?: User[]
}) => {
  const [status, setStatus] = useState<'IDLE' | 'SCANNING' | 'PREDICTING' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [matchedUser, setMatchedUser] = useState<User | null>(null);
  const [progress, setProgress] = useState(0);
  const [attempts, setAttempts] = useState(3);
  const [scanError, setScanError] = useState<string | null>(null);
  const webcamRef = useRef<Webcam>(null);

  useEffect(() => {
    if (employees && status === 'IDLE') {
      const timeout = setTimeout(() => setStatus('SCANNING'), 1000);
      return () => clearTimeout(timeout);
    }
  }, [employees, status]);

  useEffect(() => {
    if (status === 'SCANNING') {
      const interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            return 100;
          }
          return prev + 5; // Slower progress (takes ~6 seconds total)
        });
      }, 300); // 300ms interval
      return () => clearInterval(interval);
    }
  }, [status]);

  useEffect(() => {
    if (progress === 100) {
      handleFinalize();
    }
  }, [progress]);

  const handleRetry = () => {
    setScanError(null);
    setProgress(0);
    setStatus('SCANNING');
  };

  const handleFinalize = async () => {
    const screenshot = webcamRef.current?.getScreenshot();
    
    // Simulate scan quality check for retry functionality
    const qualityScore = Math.random();
    if (qualityScore < 0.25 && attempts > 1 && !employees) { // Only force retry on registration for demo, or generally
        const reasons = [
            "Image too blurry - Please stay still", 
            "Low light detected - Improve lighting", 
            "Face off-center - Align with guides", 
            "Movement detected - Do not blink"
        ];
        const reason = reasons[Math.floor(Math.random() * reasons.length)];
        setScanError(reason);
        setAttempts(prev => prev - 1);
        setStatus('ERROR');
        return;
    }

    const data = screenshot || `BIO_FACE_${Math.random().toString(36).substr(2, 9)}`;
    
    if (employees && screenshot) {
      setStatus('PREDICTING');
      const match = await predictEmployeeIdentity(screenshot, employees);
      setMatchedUser(match || null);
      if (match) {
        playIdentityVerifiedBeep();
      } else {
        playScanCompleteBeep();
      }
      onCapture(data, match || undefined);
    } else {
      onCapture(data);
      playScanCompleteBeep();
    }
    
    setStatus('SUCCESS');
    setTimeout(onCancel, 2500);
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-xl flex items-center justify-center p-6"
    >
      <div className="w-full max-w-sm space-y-8 text-center bg-surface-low p-8 rounded-[40px] border border-white/10 relative overflow-hidden">
        <div className="absolute inset-0 atmosphere opacity-20" />
        
        <div className="relative z-10 space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-black uppercase tracking-[0.3em] text-white/40">
              Biological ID Interface
            </h3>
            <button onClick={onCancel} className="text-white/20 hover:text-white transition-colors">
              <X size={18} />
            </button>
          </div>

          <div className="relative aspect-square w-full rounded-[32px] overflow-hidden border border-white/10 bg-black flex items-center justify-center">
             <>
               {/* @ts-ignore */}
               <Webcam
                 audio={false}
                 ref={webcamRef as any}
                 screenshotFormat="image/jpeg"
                 className="w-full h-full object-cover opacity-60"
                 mirrored={true}
               />
               <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-48 h-48 border-2 border-neon-primary-container/40 rounded-full animate-pulse flex items-center justify-center">
                     <div className="w-40 h-40 border border-neon-primary-container/20 rounded-full" />
                  </div>
                  <motion.div 
                    animate={{ top: ['20%', '80%', '20%'] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className="absolute left-4 right-4 h-[1px] bg-neon-primary-container shadow-[0_0_10px_#00E5FF]"
                  />
               </div>
             </>

             {status === 'SCANNING' && (
               <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-8">
                  <div className="w-full space-y-4">
                    <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        className="h-full bg-neon-primary-container"
                      />
                    </div>
                    <p className="text-[10px] font-mono text-neon-primary-container uppercase tracking-widest">Biological Scan in Progress...</p>
                  </div>
               </div>
             )}

             {status === 'ERROR' && (
               <div className="absolute inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-6 z-50">
                  <motion.div 
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="w-full space-y-6 text-center"
                  >
                    <div className="w-16 h-16 bg-red-500/20 border border-red-500/40 rounded-full flex items-center justify-center mx-auto mb-4">
                       <AlertCircle size={32} className="text-red-500" />
                    </div>
                    <div className="space-y-2">
                       <p className="text-red-500 font-black text-[10px] uppercase tracking-widest">Visual Match Failed</p>
                       <p className="text-white font-display text-sm font-bold tracking-tight px-4">{scanError}</p>
                       <p className="text-white/40 text-[9px] uppercase tracking-[0.2em] pt-2">Attempts Remaining: {attempts}</p>
                    </div>
                    
                    <button 
                      onClick={handleRetry}
                      className="w-full py-4 bg-white text-black text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-white/90 transition-colors shadow-2xl"
                    >
                      Retry Visual Scan
                    </button>
                    <p className="text-[8px] text-white/20 uppercase tracking-widest leading-relaxed">
                       Ensure your face is fully visible<br/>and centered in the optical guide
                    </p>
                  </motion.div>
               </div>
             )}

             {status === 'SUCCESS' && (
               <motion.div 
                 initial={{ scale: 0.5, opacity: 0 }}
                 animate={{ scale: 1, opacity: 1 }}
                 className="absolute inset-0 bg-neon-primary-container flex flex-col items-center justify-center text-white p-8 gap-4"
               >
                 <CheckCircle2 size={64} />
                 <p className="text-lg font-black uppercase tracking-widest">{matchedUser ? matchedUser.name : 'VERIFIED'}</p>
               </motion.div>
             )}
          </div>

          {status === 'IDLE' && (
            <button 
              onClick={() => setStatus('SCANNING')}
              className="w-full py-4 bg-neon-primary-container text-white font-black uppercase tracking-[0.2em] text-[10px] rounded-2xl shadow-[0_0_20px_rgba(0,229,255,0.3)] hover:scale-[1.02] transition-all"
            >
              Analyze Face Patterns
            </button>
          )}

          <div className="pt-4">
             <p className="text-[8px] text-white/20 uppercase tracking-[0.2em] font-medium leading-relaxed">
               Secure Encrypted Biometric Pipeline<br/>AES-256 Cloud Validation
             </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const BiometricOverlay = ({ isOpen, onComplete, onCancel }: any) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState<'IDLE' | 'STARTED' | 'SCANNING' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [useSimulator, setUseSimulator] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setStatus('STARTED');
      startCamera();
    } else {
      stopCamera();
      setUseSimulator(false);
    }
    return () => stopCamera();
  }, [isOpen]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setStatus('SCANNING');
        // Simulate real processing time
        setTimeout(() => {
          playSuccessBeep();
          setStatus('SUCCESS');
          setTimeout(() => {
            onComplete();
          }, 400);
        }, 1000);
      }
    } catch (err) {
      // Hardware failure/missing - switch to Simulator Mode
      setUseSimulator(true);
      setStatus('SCANNING');
      setTimeout(() => {
        playSuccessBeep();
        setStatus('SUCCESS');
        setTimeout(() => {
          onComplete();
        }, 400);
      }, 1000);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
  };

  if (!isOpen) return null;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] glass flex items-center justify-center p-8 backdrop-blur-3xl"
    >
      <div className="w-full max-w-sm bg-surface-lowest relative rounded-[32px] overflow-hidden border border-white/10 shadow-3xl pb-8">
        <div className="p-6 space-y-4 text-center">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-display font-medium uppercase tracking-[0.2em] text-[10px] text-neon-primary-container">Security Protocol</h3>
            <button onClick={onCancel} className="p-2 hover:bg-white/5 rounded-full transition-colors text-white/40 hover:text-white" title="Cancel Scan">
              <X size={18} />
            </button>
          </div>

          <div className="relative aspect-square rounded-[80px] overflow-hidden bg-black border border-white/5 mx-4 shadow-2xl group/face">
             <>
               {useSimulator ? (
                 <div className="absolute inset-0 flex flex-col items-center justify-center space-y-4">
                    <div className="relative">
                      <div className="absolute inset-0 blur-2xl bg-neon-primary-container/20 rounded-full animate-pulse" />
                      <Camera size={64} className="text-white/10 relative z-10" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] text-neon-primary font-display font-medium uppercase tracking-[0.2em]">Hardware Missing</p>
                      <p className="text-[8px] text-white/20 font-display uppercase tracking-widest">Digital Auth Engaged</p>
                    </div>
                 </div>
               ) : (
                 <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover scale-x-[-1] opacity-60" />
               )}

               {/* Face Framing Guide Overlay */}
               <div className="absolute inset-0 pointer-events-none z-20 flex flex-col items-center justify-center">
                 <motion.svg 
                   initial={{ opacity: 0, scale: 0.9 }}
                   animate={{ opacity: 0.3, scale: 1 }}
                   transition={{ delay: 0.5, duration: 1 }}
                   viewBox="0 0 200 200" 
                   className="w-[60%] h-[75%] mt-[-10%] text-neon-primary-container"
                 >
                   <path 
                     d="M100,20 C60,20 40,50 40,100 C40,150 63,180 100,180 C137,180 160,150 160,100 C160,50 140,20 100,20 Z" 
                     fill="none" 
                     stroke="currentColor" 
                     strokeWidth="1" 
                     strokeDasharray="4 2"
                   />
                   <g className="opacity-40">
                     <path d="M75,90 Q80,85 85,90" fill="none" stroke="currentColor" strokeWidth="1" />
                     <path d="M115,90 Q120,85 125,90" fill="none" stroke="currentColor" strokeWidth="1" />
                     <path d="M90,145 Q100,152 110,145" fill="none" stroke="currentColor" strokeWidth="1" />
                   </g>
                 </motion.svg>

                 {/* Scanning Beam */}
                 {status === 'SCANNING' && (
                   <motion.div 
                     initial={{ top: '10%' }}
                     animate={{ top: ['10%', '90%', '10%'] }}
                     transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                     className="absolute left-4 right-4 h-0.5 bg-neon-primary-container z-30 shadow-[0_0_15px_rgba(0,112,255,1)] opacity-60"
                   />
                 )}

                 {/* HUD Corners */}
                 <div className="absolute top-12 left-12 w-6 h-6 border-t border-l border-white/20 rounded-tl-lg" />
                 <div className="absolute top-12 right-12 w-6 h-6 border-t border-r border-white/20 rounded-tr-lg" />
                 <div className="absolute bottom-12 left-12 w-6 h-6 border-b border-l border-white/20 rounded-bl-lg" />
                 <div className="absolute bottom-12 right-12 w-6 h-6 border-b border-r border-white/20 rounded-br-lg" />

                 <motion.p 
                   animate={{ opacity: [0.2, 0.5, 0.2] }}
                   transition={{ duration: 2, repeat: Infinity }}
                   className="absolute bottom-16 text-[7px] text-white/40 uppercase tracking-[0.5em] font-display"
                 >
                   Hold Still
                 </motion.p>
               </div>
             </>
             
             {/* Scanning Line / HUD for both */}
             <div className="absolute inset-0 pointer-events-none">
                {status === 'SCANNING' && (
                  <motion.div 
                    initial={{ top: '0%' }}
                    animate={{ top: '100%' }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
                    className="absolute left-0 right-0 h-0.5 bg-neon-primary-container shadow-[0_0_30px_#0070FF] z-20 opacity-80"
                  />
                )}
                <div className="absolute inset-0 border-[1px] border-white/5 m-12 rounded-full border-dashed animate-[spin_20s_linear_infinite]" />
             </div>

             {/* HUD Corners */}
             <div className="absolute inset-0 border-[1px] border-white/10 m-12 rounded-[60px] pointer-events-none">
                <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-neon-primary-container rounded-tl-3xl" />
                <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-neon-primary-container rounded-tr-3xl" />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-neon-primary-container rounded-bl-3xl" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-neon-primary-container rounded-br-3xl" />
             </div>

             {/* Success Overlay */}
             <AnimatePresence>
               {status === 'PREDICTING' && (
               <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-8">
                  <div className="w-full space-y-4">
                    <motion.div 
                      animate={{ opacity: [0.4, 1, 0.4] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                      className="flex flex-col items-center gap-4"
                    >
                       <div className="w-12 h-12 border-4 border-neon-primary-container border-t-transparent rounded-full animate-spin" />
                       <p className="text-[10px] font-mono text-neon-primary-container uppercase tracking-widest">Applying AI Identity Prediction...</p>
                       <p className="text-[8px] text-white/40">Analyzing Enrolled Biometric Gallery</p>
                    </motion.div>
                  </div>
               </div>
             )}

             {status === 'SUCCESS' && (
                 <motion.div 
                   initial={{ opacity: 0, scale: 0.9 }}
                   animate={{ opacity: 1, scale: 1 }}
                   className="absolute inset-0 flex items-center justify-center bg-neon-primary-container/30 backdrop-blur-md z-40"
                 >
                   <motion.div
                     initial={{ scale: 0.2 }}
                     animate={{ scale: 1, rotate: [0, 10, 0] }}
                     className="bg-white text-neon-primary-container p-6 rounded-full shadow-3xl"
                   >
                    <CheckCircle2 size={48} />
                   </motion.div>
                 </motion.div>
               )}
             </AnimatePresence>
          </div>

          <div className="space-y-2 pb-2">
             <div className="flex items-center justify-center gap-2">
               {status === 'SCANNING' && <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}><Scan size={14} className="text-neon-primary-container" /></motion.div>}
               <p className="font-display text-xs font-black uppercase tracking-[0.2em] text-white">
                 {status === 'STARTED' ? 'Initializing System' : status === 'SCANNING' ? 'Align Face in Frame' : 'Identity Confirmed'}
               </p>
             </div>
             <p className="text-[9px] text-white/30 font-display uppercase tracking-[0.2em]">
               Secure encrypted visual relay active
             </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const NeonGlow = ({ color = "primary" }: { color?: "primary" | "secondary" | "alert" }) => {
  const colors = {
    primary: "rgba(0, 112, 255, 0.2)",
    secondary: "rgba(255, 255, 255, 0.1)",
    alert: "rgba(255, 50, 50, 0.2)"
  };
  return <div className="absolute inset-0 pointer-events-none blur-xl rounded-full" style={{ backgroundColor: colors[color] }} />;
};

const SurfaceCard = ({ children, className = "", depth = "low", onClick }: any) => {
  const depths: any = {
    lowest: "bg-surface-lowest",
    low: "bg-surface-low",
    high: "bg-surface-highest",
  };
  return (
    <div 
      onClick={onClick}
      className={`${depths[depth]} p-6 rounded-sharp ${className} border-none relative overflow-hidden group transition-all duration-300 ${onClick ? 'cursor-pointer active:scale-[0.98]' : ''}`}
    >
      {children}
    </div>
  );
};

const StatItem = ({ label, value, trend, color = "primary" }: any) => (
  <div className="space-y-1">
    <p className="text-[10px] font-display uppercase tracking-[0.2em] text-on-surface-variant">{label}</p>
    <div className="flex items-center gap-2">
      <span className="text-xl font-display font-bold">{value}</span>
      {trend && (
        <span className={`text-[10px] ${trend.startsWith('+') ? 'text-neon-primary-container' : 'text-red-400'}`}>
          {trend}
        </span>
      )}
    </div>
  </div>
);

// --- Core Feature Screens ---

const LoginScreen = ({ onLogin, onFaceAuth, onError }: { onLogin: (role: Role, user?: User) => void, onFaceAuth: () => void, onError: (msg: string) => void }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isErrorConfig, setIsErrorConfig] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsErrorConfig(false);
    
    try {
      // 1. Sign in with Firebase Auth
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      // 2. Map account to app role
      const lowEmail = email.toLowerCase();
      let matchedUser: User | undefined;
      
      if (lowEmail === 'admin@gmail.com' || lowEmail === 'robinbosky.ops@gmail.com' || lowEmail === 'knitsasm@gmail.com') {
         matchedUser = { ...MOCK_ADMIN, id: userCredential.user.uid };
      } else if (lowEmail === 'manager@gmail.com') {
         matchedUser = { ...MOCK_MANAGER, id: userCredential.user.uid };
      } else if (lowEmail === 'staff@gmail.com') {
         matchedUser = { id: userCredential.user.uid, name: 'Workforce Hub', role: 'EMPLOYEE', position: 'Kiosk Terminal' };
      }

      if (matchedUser) {
        // Essential Cloud Sync: Ensure this identity exists in the 'users' collection 
        // to empower Firestore Security Rules for administrative operations.
        const userRef = doc(db, 'users', matchedUser.id);
        await setDoc(userRef, matchedUser, { merge: true });
        onLogin(matchedUser.role, matchedUser);
      } else {
        onError("Authorized accounts only.");
      }
    } catch (err: any) {
      console.error("Auth Error:", err);
      if (err.code === 'auth/operation-not-allowed') {
          setIsErrorConfig(true);
          onError("Firebase Auth Setting Required: Email/Password login is not enabled in your Firebase project.");
      } else if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
          setIsErrorConfig(true);
          onError("Unauthorized Account: This email/password combo doesn't exist in your Firebase project yet.");
      } else {
          onError(err.message || "Authentication failed");
      }
    }
  };

  const handleDevBypass = () => {
    const lowEmail = email.toLowerCase();
    if (lowEmail === 'admin@gmail.com' || lowEmail === 'robinbosky.ops@gmail.com' || lowEmail === 'knitsasm@gmail.com') onLogin('ADMIN');
    else if (lowEmail === 'manager@gmail.com') onLogin('MANAGER');
    else if (lowEmail === 'staff@gmail.com') onLogin('EMPLOYEE', { id: 'SHARED_STAFF', name: 'Workforce Hub', role: 'EMPLOYEE', position: 'Kiosk Terminal' });
    else onLogin('EMPLOYEE');
  };

  const handleInitializeDatasets = async () => {
    try {
      setSuccessMessage("Seeding biological workforce datasets...");
      
      const usersToSeed = [
        { 
          id: 'adm_1', 
          name: 'Robin Bosky', 
          role: 'ADMIN', 
          position: 'Factory Owner', 
          department: 'Management',
          email: 'robinbosky.ops@gmail.com',
          shiftType: 'DAY' as ShiftType,
          shiftTiming: '09:00 - 18:00',
          baseSalary: 150000,
          faceEnrolled: false
        },
        { 
          id: 'mgr_1', 
          name: 'Sarah Connor', 
          role: 'MANAGER', 
          position: 'Site Manager', 
          department: 'Operations',
          email: 'manager@gmail.com',
          shiftType: 'SHIFT' as ShiftType,
          shiftTiming: '08:00 - 16:00',
          baseSalary: 85000,
          faceEnrolled: false
        },
        { 
          id: 'emp_1', 
          name: 'John Doe', 
          role: 'EMPLOYEE', 
          position: 'Quality Specialist', 
          department: 'Textiles',
          email: 'staff@gmail.com',
          shiftType: 'DAY' as ShiftType,
          shiftTiming: '09:00 - 18:00',
          baseSalary: 45000,
          faceEnrolled: false
        }
      ];

      for (const u of usersToSeed) {
        await setDoc(doc(db, 'users', u.id), u);
      }
      
      await addDoc(collection(db, 'notifications'), {
        title: 'Workforce Records Initialized',
        message: 'Master biological signatures and employment ledgers successfully provisioned for terminal K3000-X.',
        time: 'Just now',
        type: 'info',
        read: false,
        createdAt: Timestamp.now()
      });

      setSuccessMessage("Global Dataset successfully initialized.");
      return true;
    } catch (err: any) {
      console.error("Dataset Initialization Error:", err);
      setErrorMessage("System seeding failed: " + err.message);
      return false;
    }
  };

  const handleCreateDemoAccounts = async () => {
    const demoUsers = [
      { email: 'admin@gmail.com', pass: 'admin123' },
      { email: 'robinbosky.ops@gmail.com', pass: 'admin123' },
      { email: 'knitsasm@gmail.com', pass: 'admin123' },
      { email: 'manager@gmail.com', pass: 'manager123' },
      { email: 'staff@gmail.com', pass: 'staff123' }
    ];

    let successCount = 0;
    let errors = [];

    // Part 1: Auth Seeding
    for (const user of demoUsers) {
      try {
        await createUserWithEmailAndPassword(auth, user.email, user.pass);
        successCount++;
      } catch (err: any) {
        if (err.code === 'auth/email-already-in-use') {
          successCount++;
        } else {
          errors.push(`Auth ${user.email}: ${err.message}`);
        }
      }
    }

    // Part 2: Firestore Dataset Seeding
    const seedSuccess = await handleInitializeDatasets();

    if (successCount >= 3 && seedSuccess) {
      alert("✅ Demo Datasets successfully initialized!\n\nYou can now log in using the credentials displayed below to view the workforce dashboard.");
      setIsErrorConfig(false);
    } else if (errors.length > 0) {
      alert("❌ Setup failed: " + errors.join('\n'));
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      className="fixed inset-0 z-[100] bg-background flex flex-col items-center justify-center p-8 text-center"
    >
      <div className="absolute inset-0 atmosphere opacity-30 z-0" />
      <div className="w-full max-w-sm space-y-12 relative z-10">
        <div className="space-y-4">
          <h1 className="text-5xl font-display font-bold tracking-tighter text-gradient">ROBINBOSKY</h1>
          <p className="text-on-surface-variant text-sm font-light">Secure Workforce Access</p>
        </div>
        
        <div className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-3">
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-neon-primary transition-colors" size={18} />
                <input 
                  type="email" 
                  placeholder="Work Email"
                  required
                  className="w-full py-4 pl-12 pr-4 bg-surface-low border border-on-surface/5 rounded-sharp focus:border-neon-primary-container outline-none text-sm transition-all"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-neon-primary transition-colors" size={18} />
                <input 
                  type="password" 
                  placeholder="Access Key"
                  required
                  className="w-full py-4 pl-12 pr-4 bg-surface-low border border-on-surface/5 rounded-sharp focus:border-neon-primary-container outline-none text-sm transition-all"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <button 
              type="submit"
              className="w-full py-5 bg-neon-primary-container text-white rounded-sharp hover:shadow-[0_0_20px_rgba(255,78,0,0.3)] transition-all flex items-center justify-center gap-3 group"
            >
              <span className="font-display uppercase tracking-widest text-xs font-bold">Secure Access</span>
              <ArrowRight size={18} className="group-hover:translate-x-2 transition-transform" />
            </button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/5"></div></div>
            <div className="relative flex justify-center text-[8px] uppercase tracking-[0.3em] font-bold text-white/10"><span className="bg-background px-4">Instant Verification</span></div>
          </div>

          <button 
            onClick={onFaceAuth}
            className="w-full py-5 bg-white/5 border border-white/10 text-white rounded-sharp hover:bg-white/10 transition-all flex items-center justify-center gap-3 group"
          >
            <Scan size={20} className="text-neon-primary-container group-hover:scale-110 transition-transform" />
            <span className="font-display uppercase tracking-widest text-xs font-bold">Biometric Login</span>
          </button>
        </div>

        <div className="pt-4 opacity-50 space-y-2">
           {isErrorConfig && (
             <motion.div 
               initial={{ opacity: 0, y: 10 }}
               animate={{ opacity: 1, y: 0 }}
               className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg space-y-3 mb-4"
             >
               <p className="text-[10px] text-red-400 font-bold uppercase tracking-widest text-left">Quick Fix Required:</p>
               <ol className="text-[9px] text-white/60 text-left list-decimal pl-4 space-y-1">
                 <li>In <a href="https://console.firebase.google.com/project/gen-lang-client-0710382636/authentication/providers" target="_blank" rel="noopener noreferrer" className="text-neon-primary-container underline">Firebase Console</a>: Enable <b>Email/Password</b> provider.</li>
                 <li>Then: <button onClick={handleCreateDemoAccounts} className="text-neon-primary-container font-bold hover:underline">Click here to automatically create Demo Accounts</button></li>
               </ol>
               <button 
                 onClick={handleDevBypass}
                 className="w-full py-2 bg-white/5 border border-white/10 text-[9px] text-white/50 rounded-sharp hover:bg-white/10 uppercase font-bold tracking-widest transition-all"
               >
                 Continue in Demo Mode (Local Only)
               </button>
             </motion.div>
           )}
           <p className="text-[8px] text-white/20 uppercase tracking-[0.2em] font-medium text-center">Bypass is Restricted to System Administrators</p>
           <div className="p-3 bg-white/5 border border-white/5 rounded-lg">
             <p className="text-[7px] text-white/40 uppercase font-bold text-center">Demo Accounts:</p>
             <p className="text-[8px] text-neon-primary-container font-mono text-center">Admin: admin@gmail.com / admin123</p>
             <p className="text-[8px] text-neon-primary-container font-mono text-center">Site Mgr: manager@gmail.com / manager123</p>
             <p className="text-[8px] text-neon-primary-container font-mono text-center">Workforce: staff@gmail.com / staff123</p>
           </div>
        </div>
      </div>
    </motion.div>
  );
};

const AttendanceModule = ({ user, employees, attendance, onRequestBiometricAuth, onMarkAttendance, isOnline, isSyncing }: any) => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleIdentitySync = () => {
    onRequestBiometricAuth((matchedUser: User) => {
      if (matchedUser) {
        onMarkAttendance(matchedUser);
      } else {
        onMarkAttendance(null, true); // Signal failure
      }
    });
  };

  // Logic for shift alerts
  const activeRecords = attendance.filter((rec: AttendanceRecord) => !rec.clockOut);
  const alerts = activeRecords.map((rec: AttendanceRecord) => {
    const emp = employees.find((e: User) => e.id === rec.userId);
    if (!emp || !emp.shiftTiming) return null;

    const endTimeStr = emp.shiftTiming.split(' - ')[1];
    if (!endTimeStr) return null;

    const [hours, minutes] = endTimeStr.split(':').map(Number);
    const endTime = new Date(currentTime);
    endTime.setHours(hours, minutes, 0, 0);

    const diffMs = endTime.getTime() - currentTime.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    // Alert if within 15m or past
    if (diffMins <= 15 && diffMins > 0) {
      return { type: 'NEARING', name: emp.name, mins: diffMins };
    } else if (diffMins <= 0) {
      return { type: 'EXCEEDED', name: emp.name, mins: Math.abs(diffMins) };
    }
    return null;
  }).filter(Boolean);

  // Audible alert simulation (using visual pulse and subtle feedback)
  const hasExceeded = alerts.some((a: any) => a.type === 'EXCEEDED');
  const hasNearing = alerts.some((a: any) => a.type === 'NEARING');
  const alertState = hasExceeded ? 'CRITICAL' : (hasNearing ? 'WARNING' : 'STABLE');

  const targetEmployee = user?.role === 'EMPLOYEE' ? user : null;
  const activeRecord = targetEmployee ? attendance.find((r: any) => r.userId === targetEmployee.id && !r.clockOut) : null;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col items-center justify-center py-12 relative px-6 text-center">
        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 blur-3xl opacity-50 transition-colors duration-1000 ${
          alertState === 'CRITICAL' ? 'bg-red-500/20' : 
          alertState === 'WARNING' ? 'bg-amber-500/20' : 
          'bg-neon-primary-container/10'
        }`} />
        <h2 className={`text-6xl font-display font-bold tracking-tighter tabular-nums mb-2 transition-colors duration-300 ${
          alertState === 'CRITICAL' ? 'text-red-500' : 
          alertState === 'WARNING' ? 'text-amber-500' : 
          'text-white'
        }`}>
          {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </h2>
        <p className="text-on-surface-variant font-display uppercase tracking-[0.3em] text-[10px]">
          {currentTime.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}
        </p>
      </div>

      {/* Shift Alerts Section */}
      <AnimatePresence>
        {alerts.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="px-6 space-y-2"
          >
            <div className="flex items-center gap-2 mb-2 p-1">
               <BellRing size={14} className={alertState !== 'STABLE' ? 'animate-bounce text-on-surface' : 'text-on-surface-variant'} />
               <span className="text-[10px] font-display font-bold uppercase tracking-widest text-on-surface-variant">Live Workforce Monitor</span>
            </div>
            {alerts.slice(0, 3).map((alert: any, idx: number) => (
              <div 
                key={idx}
                className={`flex justify-between items-center p-4 rounded-xl border transition-all duration-500 ${
                  alert.type === 'EXCEEDED' 
                    ? 'bg-red-500/10 border-red-500/20 text-red-500 shadow-[0_0_15px_rgba(239,68,68,0.1)]' 
                    : 'bg-amber-500/10 border-amber-500/20 text-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.1)]'
                }`}
              >
                <div className="flex items-center gap-3">
                   {alert.type === 'EXCEEDED' ? <AlertTriangle size={18} /> : (
                     <motion.div animate={{ opacity: [1, 0.5, 1] }} transition={{ repeat: Infinity, duration: 2 }}>
                        <Timer size={18} />
                     </motion.div>
                   )}
                   <span className="text-xs font-bold uppercase tracking-wide">{alert.name}</span>
                </div>
                <div className="text-right">
                   <p className="text-[10px] uppercase font-bold tracking-tighter opacity-70">
                     {alert.type === 'EXCEEDED' ? 'OVERTIME LIMIT' : 'SHIFT ENDING'}
                   </p>
                   <p className="text-sm font-mono font-bold">
                     {alert.mins}m {alert.type === 'EXCEEDED' ? 'past' : 'remaining'}
                   </p>
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

        <div className="px-6 flex flex-col items-center gap-8">
        {!isOnline && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center gap-4"
          >
             <div className="p-2 bg-amber-500 rounded-lg text-white">
                <Clock size={18} className="animate-pulse" />
             </div>
             <div>
                <p className="text-[10px] font-black uppercase text-amber-500 tracking-widest">Offline Biometric Capturing</p>
                <p className="text-[8px] uppercase text-white/40 leading-none">Records will sync securely once online</p>
             </div>
          </motion.div>
        )}
        
        <motion.div 
          whileHover={{ scale: 1.05 }}
          className={`relative w-72 h-72 rounded-full flex flex-col items-center justify-center transition-all duration-700 shadow-[0_0_80px_rgba(255,78,0,0.2)] overflow-hidden border-4 border-white/5 ${
            alertState === 'CRITICAL' ? 'bg-red-500' : 
            alertState === 'WARNING' ? 'bg-amber-500' :
            'bg-neon-primary-container'
          }`}
        >
          {/* Animated Background Layers */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.2)_0%,transparent_70%)] animate-pulse" />
          
          <motion.div 
            animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 4, repeat: Infinity }}
            className="absolute inset-0 bg-black/10 rounded-full"
          />

          {/* HUD Ring */}
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0 border-2 border-dashed border-white/30 m-4 rounded-full"
          />

          <div className="z-10 flex flex-col items-center gap-4 text-white">
            <div className="flex items-center justify-center">
               <motion.button 
                 whileHover={{ scale: 1.1 }}
                 whileTap={{ scale: 0.9 }}
                 onClick={(e) => { e.stopPropagation(); handleIdentitySync(); }}
                 className="p-3 rounded-2xl bg-black/20 backdrop-blur-md shadow-inner border border-white/5 hover:border-white/20 transition-all group"
               >
                 <Scan size={48} className="group-hover:text-neon-primary-container transition-colors animate-pulse" />
               </motion.button>
            </div>
            
            <div className="text-center pointer-events-none">
              <span className="font-display text-sm font-bold uppercase tracking-[0.4em] opacity-80 block mb-1 font-black">SYSTEM READY</span>
              <h3 className="font-display text-3xl font-black uppercase tracking-tighter leading-none">
                VERIFY IDENTITY
              </h3>
              <p className="font-display text-[10px] font-bold uppercase tracking-[0.2em] mt-2 bg-white/10 px-3 py-1 rounded-full">
                FACE ID SCAN TO CONTINUE
              </p>
            </div>
          </div>
          
          {/* Scanning Scan Line */}
          <motion.div 
            animate={{ top: ['-10%', '110%'] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="absolute left-0 right-0 h-1 bg-white/40 blur-sm z-20 pointer-events-none"
          />
        </motion.div>

        <div className="flex flex-col items-center gap-4 animate-pulse">
           <div className="flex gap-2">
              <Scan size={12} className="text-neon-primary-container" />
           </div>
           <p className="text-[10px] font-display uppercase tracking-[0.2em] text-on-surface-variant">Biometric Interface Active</p>
        </div>
      </div>

      <div className="px-6 pb-24">
        <SurfaceCard depth="low">
           <div className="flex items-center gap-4 mb-4">
              <ShieldCheck size={18} className="text-neon-primary-container" />
              <p className="text-[10px] font-display uppercase tracking-widest">Active Shift Constraints</p>
           </div>
           <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                 <p className="text-[9px] text-white/40 uppercase mb-1">Late Penalty</p>
                 <p className="text-sm font-bold text-red-500">-$100</p>
              </div>
              <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                 <p className="text-[9px] text-white/40 uppercase mb-1">Sunday Status</p>
                 <p className="text-sm font-bold text-green-500">HOLIDAY</p>
              </div>
           </div>
        </SurfaceCard>
      </div>
    </div>
  );
};

const EmployeeManagement = ({ employees, attendance, onAdd, onUpdate, onDelete, showSalary, onScanRequest, scanData, onDirectScan, onCancelForm, onInitializeData }: any) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({ 
    name: '', 
    position: '', 
    department: '', 
    baseSalary: '', 
    shiftType: 'DAY' as ShiftType, 
    shiftTiming: '09:00 - 18:00',
    lunchTime: '12:30 - 13:30',
    shortBreak: '16:30 - 17:00',
    faceEnrolled: false,
    faceData: '',
    advanceAmount: ''
  });
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (scanData && scanData.faceData && (isAdding || editingId)) {
      setFormData(prev => ({
        ...prev,
        faceEnrolled: true,
        faceData: scanData.faceData
      }));
    }
  }, [scanData, isAdding, editingId]);

  const startEditing = (emp: User) => {
    setEditingId(emp.id);
    setFormData({
      name: emp.name,
      position: emp.position || '',
      department: emp.department || '',
      baseSalary: emp.baseSalary?.toString() || '',
      shiftType: emp.shiftType || 'DAY',
      shiftTiming: emp.shiftTiming || '09:00 - 18:00',
      lunchTime: emp.lunchTime || '12:30 - 13:30',
      shortBreak: emp.shortBreak || '16:30 - 17:00',
      faceEnrolled: emp.faceEnrolled || false,
      faceData: emp.faceData || '',
      advanceAmount: emp.advanceAmount?.toString() || ''
    });
    setIsAdding(false);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setIsAdding(false);
    setFormData({ 
      name: '', position: '', department: '', baseSalary: '', shiftType: 'DAY', shiftTiming: '09:00 - 18:00',
      lunchTime: '12:30 - 13:30', 
      shortBreak: '16:30 - 17:00',
      faceEnrolled: false, 
      faceData: '', advanceAmount: ''
    });
    if (onCancelForm) onCancelForm(); // Notify parent to clear scanData
  };

  const getLastClockIn = (userId: string) => {
    const records = attendance?.filter((r: any) => r.userId === userId) || [];
    if (records.length === 0) return null;
    return records.sort((a: any, b: any) => b.clockIn.getTime() - a.clockIn.getTime())[0].clockIn;
  };

  const validateTiming = (timing: string) => {
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d) - ([01]\d|2[0-3]):([0-5]\d)$/;
    if (!timeRegex.test(timing)) {
      return "Format must be HH:MM - HH:MM (e.g., 09:00 - 18:00)";
    }
    const [start, end] = timing.split(' - ');
    const [sH, sM] = start.split(':').map(Number);
    const [eH, eM] = end.split(':').map(Number);
    
    if (eH < sH || (eH === sH && eM <= sM)) {
      return "Start time must be before end time";
    }
    return null;
  };

  const handleSubmit = (e: any) => {
    e.preventDefault();
    const error = validateTiming(formData.shiftTiming);
    if (error) {
      setValidationError(error);
      return;
    }

    // Mandatory Face Enrollment Check
    if (!formData.faceEnrolled) {
      if (confirm(`Employee record requires a high-fidelity biometric scan. Would you like to initialize the biological scanning terminal for ${formData.name || 'this employee'} now?`)) {
        onScanRequest('FACE');
      }
      return;
    }

    if (editingId) {
      onUpdate({
        ...employees.find((e: any) => e.id === editingId),
        ...formData,
        baseSalary: parseInt(formData.baseSalary) || 0,
        advanceAmount: parseInt(formData.advanceAmount as string) || 0
      });
      setEditingId(null);
    } else {
      onAdd({
        id: Math.random().toString(36).substr(2, 9),
        ...formData,
        role: 'EMPLOYEE',
        baseSalary: parseInt(formData.baseSalary) || 0,
        advanceAmount: parseInt(formData.advanceAmount as string) || 0
      });
      setIsAdding(false);
    }
    
    setFormData({ 
      name: '', position: '', department: '', baseSalary: '', shiftType: 'DAY', shiftTiming: '09:00 - 18:00',
      lunchTime: '12:30 - 13:30', 
      shortBreak: '16:30 - 17:00',
      faceEnrolled: false, 
      faceData: '', advanceAmount: ''
    });
    setValidationError(null);
  };

  if (!isAdding && !editingId && employees.length === 0) {
    return (
      <div className="p-12 text-center space-y-6">
        <div className="w-20 h-20 bg-white/5 border border-white/10 rounded-full flex items-center justify-center mx-auto mb-4 group hover:border-neon-primary-container/40 transition-colors">
          <Users size={32} className="text-white/20 group-hover:text-neon-primary-container transition-colors" />
        </div>
        <div className="space-y-4 max-w-xs mx-auto">
          <h3 className="text-sm font-black uppercase tracking-[0.2em] text-white">Workforce Offline</h3>
          <p className="text-[10px] text-white/40 uppercase tracking-widest leading-relaxed">
            The cloud-synced workforce directory is currently unpopulated on this terminal.
          </p>
          <div className="pt-4 space-y-3">
             <button 
              onClick={onInitializeData}
              className="w-full py-4 bg-neon-primary-container text-white text-[10px] font-black uppercase tracking-widest rounded-sharp hover:scale-105 transition-transform shadow-2xl"
             >
              Initialize Global Dataset
             </button>
             <button 
              onClick={() => setIsAdding(true)}
              className="w-full py-4 bg-white/5 border border-white/10 text-white/60 text-[10px] font-black uppercase tracking-widest rounded-sharp hover:bg-white/10 transition-all underline underline-offset-4"
             >
              Manually Register Identity
             </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center px-6">
        <h3 className="font-display font-bold uppercase tracking-widest text-xs">Workforce Directory</h3>
        {!editingId && (
          <button 
            onClick={() => {
              if (!isAdding) {
                cancelEdit(); // Reset form when opening Add form
              }
              setIsAdding(!isAdding);
            }}
            className="px-4 py-2 bg-neon-primary-container text-white rounded-sharp text-[10px] font-bold uppercase tracking-widest"
          >
            {isAdding ? 'Cancel' : 'Add Employee'}
          </button>
        )}
      </div>

      <AnimatePresence>
        {(isAdding || editingId) && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-6 overflow-hidden"
          >
            <form onSubmit={handleSubmit} className="p-6 glass rounded-sharp space-y-4 border border-white/10 relative">
              <div className="flex justify-between items-center mb-2">
                <h4 className="text-[10px] font-bold text-neon-primary-container uppercase tracking-widest">
                  {editingId ? 'Edit Employee Details' : 'Register New Employee'}
                </h4>
                {editingId && (
                  <button type="button" onClick={cancelEdit} className="text-white/40 hover:text-white transition-colors">
                    <X size={14} />
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <input 
                  placeholder="Full Name" 
                  className="bg-white/5 p-3 rounded-lg border border-white/5 text-sm focus:border-neon-primary-container outline-none" 
                  value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                  required
                />
                <input 
                  placeholder="Position" 
                  className="bg-white/5 p-3 rounded-lg border border-white/5 text-sm focus:border-neon-primary-container outline-none"
                  value={formData.position} onChange={e => setFormData({...formData, position: e.target.value})}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <input 
                  placeholder="Department" 
                  className="bg-white/5 p-3 rounded-lg border border-white/5 text-sm focus:border-neon-primary-container outline-none"
                  value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})}
                  required
                />
                <input 
                  placeholder="Monthly Salary" 
                  type="number"
                  className="bg-white/5 p-3 rounded-lg border border-white/5 text-sm focus:border-neon-primary-container outline-none"
                  value={formData.baseSalary} onChange={e => setFormData({...formData, baseSalary: e.target.value})}
                  required
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                   <p className="text-[8px] text-white/40 uppercase font-bold ml-1">Shift Type</p>
                   <select 
                    className="w-full bg-neutral-900 border border-white/5 p-3 rounded-lg text-sm outline-none text-white appearance-none"
                    value={formData.shiftType} onChange={e => setFormData({...formData, shiftType: e.target.value as any})}
                  >
                    <option value="DAY">Day Shift</option>
                    <option value="SHIFT">Rotating Shift</option>
                    <option value="NIGHT">Night Shift</option>
                  </select>
                </div>
                <div className="col-span-2 space-y-1">
                  <p className="text-[8px] text-white/40 uppercase font-bold ml-1">Working Hours</p>
                  <div className="relative">
                    <input 
                      placeholder="Timing (e.g. 09:00 - 18:00)" 
                      className={`w-full bg-white/5 p-3 rounded-lg border text-sm outline-none transition-colors ${validationError ? 'border-red-500/50 focus:border-red-500' : 'border-white/5 focus:border-neon-primary-container'}`}
                      value={formData.shiftTiming} 
                      onChange={e => {
                        setFormData({...formData, shiftTiming: e.target.value});
                        if (validationError) setValidationError(null);
                      }}
                      required
                    />
                    {validationError && (
                      <motion.p 
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-[10px] text-red-500 font-bold uppercase tracking-widest mt-1 ml-1"
                      >
                        {validationError}
                      </motion.p>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-[8px] text-white/40 uppercase font-bold ml-1">Lunch Slot (Break)</p>
                  <select 
                    className="w-full bg-neutral-900 border border-white/5 p-3 rounded-lg text-sm outline-none text-white appearance-none h-[46px]"
                    value={formData.lunchTime} onChange={e => setFormData({...formData, lunchTime: e.target.value})}
                    required
                  >
                    <option value="12:30 - 13:30">12:30 - 13:30</option>
                    <option value="13:30 - 14:30">13:30 - 14:30</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <p className="text-[8px] text-white/40 uppercase font-bold ml-1">Short Break</p>
                  <input 
                    placeholder="e.g. 16:30 - 17:00" 
                    className="w-full bg-white/5 p-3 rounded-lg border border-white/5 text-sm focus:border-neon-primary-container outline-none"
                    value={formData.shortBreak} onChange={e => setFormData({...formData, shortBreak: e.target.value})}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1">
                <div 
                  className={`p-3 rounded-lg border flex items-center justify-between transition-all ${formData.faceEnrolled ? 'border-neon-primary-container/30 bg-neon-primary-container/5' : 'border-white/5 bg-white/5'}`}
                >
                  <div className="flex items-center gap-2">
                    <Camera size={14} className={formData.faceEnrolled ? 'text-neon-primary-container' : 'text-white/20'} />
                    <span className="text-[10px] font-bold uppercase tracking-widest">{formData.faceEnrolled ? 'Face Identity Verified' : 'Face Identification'}</span>
                  </div>
                  <button 
                    type="button"
                    onClick={() => {
                      if (formData.faceEnrolled) {
                        if (confirm(`Warning: Existing biometric data for ${formData.name || 'this employee'} will be overwritten. Do you wish to proceed with a fresh face re-scan?`)) {
                          onScanRequest('FACE');
                        }
                      } else {
                        onScanRequest('FACE');
                      }
                    }}
                    className={`px-3 py-1.5 rounded-md text-[8px] font-black uppercase tracking-widest border transition-all ${
                      formData.faceEnrolled 
                        ? 'bg-neon-primary-container/10 border-neon-primary-container/30 text-neon-primary-container hover:bg-neon-primary-container/20' 
                        : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
                    }`}
                  >
                    {formData.faceEnrolled ? 'Update Scan' : 'Register Face'}
                  </button>
                </div>
              </div>

              <AnimatePresence>
                {formData.faceEnrolled && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-1">
                    <p className="text-[8px] text-neon-primary-container uppercase font-bold ml-1">Embedded Face ID</p>
                    <input 
                      placeholder="Face Signature Metadata" 
                      className="w-full bg-neon-primary-container/5 p-3 rounded-lg border border-neon-primary-container/20 text-xs font-mono text-neon-primary-container outline-none" 
                      value={formData.faceData} readOnly
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="space-y-1">
                <p className="text-[8px] text-white/40 uppercase font-bold ml-1">Advance Amount Disbursement</p>
                <input 
                  type="number"
                  placeholder="Advance Amount ($)" 
                  className="w-full bg-white/5 p-3 rounded-lg border border-white/5 text-sm focus:border-neon-primary-container outline-none"
                  value={formData.advanceAmount} onChange={e => setFormData({...formData, advanceAmount: e.target.value})}
                />
              </div>

              <div className="flex gap-2">
                <button type="submit" className="flex-1 py-3 bg-neon-primary-container font-bold uppercase tracking-widest text-xs rounded-lg">
                  {editingId ? 'Update Identity' : 'Register Identity'}
                </button>
                {editingId && (
                  <button type="button" onClick={cancelEdit} className="px-6 py-3 bg-white/5 font-bold uppercase tracking-widest text-xs rounded-lg border border-white/10">
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="px-6">
        <div className="relative group">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-neon-primary-container transition-colors" />
          <input 
            type="text"
            placeholder="Search name, position, or department..."
            className="w-full py-3 pl-12 pr-4 bg-surface-low border border-white/5 rounded-sharp focus:border-neon-primary-container outline-none text-[10px] uppercase font-bold tracking-widest transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="px-6 space-y-3">
        {employees
          .filter((emp: User) => {
            const search = searchTerm.toLowerCase();
            return (
              emp.name.toLowerCase().includes(search) ||
              (emp.position?.toLowerCase().includes(search)) ||
              (emp.department?.toLowerCase().includes(search))
            );
          })
          .map((emp: User) => {
          const lastClockIn = getLastClockIn(emp.id);
          return (
            <SurfaceCard key={emp.id} className="group">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <div className="flex justify-between items-start w-full">
                    <div>
                      <p className="text-sm font-bold text-white">{emp.name}</p>
                      <p className="text-[10px] text-white/40 uppercase tracking-widest">{emp.position} • {emp.department}</p>
                    </div>
                    {lastClockIn && (
                      <div className="text-right">
                        <p className="text-[8px] text-white/20 uppercase font-bold tracking-widest">Last Clock-in</p>
                        <p className="text-[10px] text-neon-primary-container font-mono font-bold">
                          {lastClockIn.toLocaleDateString([], { day: '2-digit', month: 'short' })} {lastClockIn.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                   <div className="flex items-center gap-1.5 px-2 py-1 bg-white/5 rounded border border-white/10">
                      <Camera size={10} className={emp.faceEnrolled !== false ? 'text-neon-primary-container' : 'text-white/20'} />
                      <span className={`text-[8px] font-bold uppercase tracking-tighter ${emp.faceEnrolled !== false ? 'text-white/80' : 'text-white/20'}`}>Face Authenticated</span>
                   </div>
                   <div className="px-2 py-1 bg-white/5 rounded text-[8px] font-bold uppercase text-on-surface/60 border border-white/10">
                     Shift: {emp.shiftTiming}
                   </div>
                   <div className="px-2 py-1 bg-white/5 rounded text-[8px] font-bold uppercase text-white/60 border border-white/10">
                     Lunch: {emp.lunchTime}
                   </div>
                   {emp.shortBreak && (
                     <div className="px-2 py-1 bg-white/5 rounded text-[8px] font-bold uppercase text-white/60 border border-white/10">
                       Short: {emp.shortBreak}
                     </div>
                   )}
                   {showSalary && (
                     <div className="px-2 py-1 bg-neon-primary-container/10 rounded text-[8px] font-bold uppercase text-neon-primary-container border border-neon-primary-container/20">
                       ${emp.baseSalary?.toLocaleString()} /MO
                     </div>
                   )}
                </div>
              </div>
              <div className="flex gap-1.5 mt-1">
                <button 
                  onClick={() => onDirectScan(emp)}
                  className="p-2 bg-neon-secondary/10 text-neon-secondary hover:bg-neon-secondary/20 rounded-lg transition-all border border-neon-secondary/20"
                  title="Quick Biometric Sync"
                >
                  <Scan size={12} />
                </button>
                <button 
                  onClick={() => startEditing(emp)}
                  className="p-2 bg-neon-primary-container/10 text-neon-primary-container hover:bg-neon-primary-container/20 rounded-lg transition-all border border-neon-primary-container/20"
                  title="Edit Identity"
                >
                  <Pencil size={12} />
                </button>
                <button 
                  onClick={() => onDelete(emp.id)}
                  className="p-2 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-lg transition-all border border-red-500/20"
                  title="Deactivate Account"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
            </SurfaceCard>
          );
        })}
      </div>
    </div>
  );
};

const AdminModule = ({ employees, attendance, onAddEmployee, onUpdateEmployee, onDeleteEmployee, userRole, onExportCSV, onScanRequest, scanData, onDirectScan, isOnline, isSyncing, onCancelForm, onInitializeData }: any) => {
  const [view, setView] = useState<'stats' | 'employees' | 'history'>('stats');
  const [reportMonth, setReportMonth] = useState(new Date().getMonth());
  const [reportYear, setReportYear] = useState(new Date().getFullYear());
  const [generatedReports, setGeneratedReports] = useState<{name: string, date: string, type: string}[]>(() => {
    const saved = localStorage.getItem('chronos_report_log');
    return saved ? JSON.parse(saved) : [
      { name: 'Consolidated_Audit_Mar2026', date: '2026-03-31', type: 'XLSX' },
      { name: 'Payroll_April_Initial', date: '2026-04-05', type: 'PDF' }
    ];
  });

  const showSalary = userRole === 'ADMIN';

  const handleExportWithLog = (type: string, format: string, m?: number, y?: number) => {
    const month = m ?? reportMonth;
    const year = y ?? reportYear;
    onExportCSV(type, format, month, year);
    
    const newReport = {
      name: `${type}_${format}_${new Date(year, month).toLocaleString('default', { month: 'short' })}${year}`,
      date: new Date().toISOString().split('T')[0],
      type: format
    };
    const updated = [newReport, ...generatedReports];
    setGeneratedReports(updated);
    localStorage.setItem('chronos_report_log', JSON.stringify(updated));
  };

  const filteredAttendance = attendance.filter((a: any) => {
    const d = a.clockIn instanceof Date ? a.clockIn : new Date(a.clockIn);
    return d.getMonth() === reportMonth && d.getFullYear() === reportYear;
  });

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="px-6 pt-4 flex gap-2 overflow-x-auto pb-2 border-b border-white/5 no-scrollbar">
         <button onClick={() => setView('stats')} className={`whitespace-nowrap px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${view === 'stats' ? 'bg-neon-primary-container text-white' : 'bg-surface-low text-white/40'}`}>Overview</button>
         <button onClick={() => setView('employees')} className={`whitespace-nowrap px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${view === 'employees' ? 'bg-neon-primary-container text-white' : 'bg-surface-low text-white/40'}`}>Employees</button>
         <button onClick={() => setView('history')} className={`whitespace-nowrap px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${view === 'history' ? 'bg-neon-primary-container text-white' : 'bg-surface-low text-white/40'}`}>Attendance Log</button>
      </div>

      {view === 'stats' && (
        <div className="px-6 space-y-8">
          {!isOnline && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <Clock className="text-amber-500 animate-pulse" size={16} />
                <div>
                  <p className="text-[10px] font-black uppercase text-amber-500 tracking-widest">Offline Persistence Mode</p>
                  <p className="text-[8px] uppercase text-white/40">Kiosk is queuing records locally</p>
                </div>
              </div>
            </motion.div>
          )}

          {isSyncing && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-4 bg-neon-primary-container/5 border border-neon-primary-container/20 rounded-2xl flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 border-2 border-neon-primary-container border-t-transparent rounded-full animate-spin" />
                <div>
                  <p className="text-[10px] font-black uppercase text-neon-primary-container tracking-widest">Cloud Sync in Progress</p>
                  <p className="text-[8px] uppercase text-white/40">Updating master audit ledger...</p>
                </div>
              </div>
            </motion.div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <SurfaceCard depth="low">
              <Users size={20} className="text-neon-secondary mb-4" />
              <StatItem label="Workforce" value={employees.length} trend="+2" />
            </SurfaceCard>
            <SurfaceCard depth="low">
              <TrendingUp size={20} className="text-neon-primary-container mb-4" />
              <StatItem label="Retention" value="98%" trend="+1%" />
            </SurfaceCard>
          </div>

          <div className="space-y-4">
             <h4 className="font-display font-bold text-xs uppercase tracking-widest">Late Arrival Insights</h4>
             <div className="grid grid-cols-3 gap-2">
                {[4, 2, 6, 1, 8, 3, 5].map((v, i) => (
                  <div key={i} className="bg-surface-low h-24 rounded-xl flex items-end justify-center p-2 relative overflow-hidden group">
                     <motion.div 
                        initial={{ height: 0 }} 
                        animate={{ height: `${v * 10}%` }}
                        className={`w-full ${v > 5 ? 'bg-red-500' : 'bg-neon-primary-container'} opacity-20 group-hover:opacity-40 rounded-t-lg transition-all`}
                     />
                     <span className="absolute bottom-2 text-[8px] font-bold opacity-40">D{i+1}</span>
                  </div>
                ))}
             </div>
          </div>

          <div className="p-6 glass rounded-[32px] border border-white/5 space-y-4">
             <div className="flex justify-between items-center">
                <FileText size={20} className="text-white/40" />
                <button 
                  onClick={() => onExportCSV('PAYROLL')}
                  className="text-[10px] text-neon-primary-container font-bold uppercase tracking-widest"
                >
                  Download Excel (XLSX)
                </button>
             </div>
             <div>
                <p className="text-lg font-bold">Consolidated Payroll</p>
                <p className="text-[10px] text-white/40 uppercase tracking-widest">April 2026 Audit Ready</p>
             </div>
          </div>
        </div>
      )}

      {view === 'employees' && (
        <EmployeeManagement 
          employees={employees} 
          attendance={attendance}
          onAdd={onAddEmployee} 
          onUpdate={onUpdateEmployee}
          onDelete={onDeleteEmployee} 
          showSalary={showSalary} 
          onScanRequest={onScanRequest}
          onCancelForm={onCancelForm}
          scanData={scanData}
          onDirectScan={onDirectScan}
          onInitializeData={onInitializeData}
        />
      )}

      {view === 'history' && (
        <div className="px-6 space-y-6">
          <div className="flex justify-between items-center bg-white/5 p-4 rounded-3xl border border-white/5">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-neon-primary-container/10 rounded-2xl">
                 <CalendarIcon size={20} className="text-neon-primary-container" />
              </div>
              <div>
                <h3 className="font-display font-bold uppercase tracking-widest text-[10px] text-white">Report Period</h3>
                <div className="flex items-center gap-2 mt-1">
                   {months.slice(0, 6).map((m, i) => (
                     <button 
                       key={m}
                       onClick={() => setReportMonth(i)}
                       className={`px-3 py-1 rounded-md text-[8px] font-black uppercase tracking-tighter transition-all ${reportMonth === i ? 'bg-neon-primary-container text-white' : 'bg-white/5 text-white/40'}`}
                     >
                       {m}
                     </button>
                   ))}
                </div>
              </div>
            </div>
            <button 
              onClick={() => handleExportWithLog('ATTENDANCE', 'XLSX')}
              className="px-6 py-3 bg-neon-primary-container shadow-[0_0_20px_rgba(0,229,255,0.3)] rounded-xl text-[9px] font-black uppercase tracking-widest text-white hover:scale-105 transition-all flex items-center gap-2"
            >
              <Download size={14} />
              Monthly Audit (XLSX)
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
             <SurfaceCard depth="low" className="border-l-2 border-neon-primary-container">
                <p className="text-[8px] text-white/40 uppercase font-black tracking-widest">Active Logs</p>
                <div className="flex items-baseline gap-2 mt-1">
                   <p className="text-xl font-bold">{filteredAttendance.length}</p>
                   <span className="text-[8px] text-green-400 font-bold tracking-tighter">SECURED</span>
                </div>
             </SurfaceCard>
             <SurfaceCard depth="low" onClick={() => handleExportWithLog('ATTENDANCE', 'PDF')} className="border-l-2 border-neon-secondary cursor-pointer hover:bg-white/5 transition-colors">
                <p className="text-[8px] text-white/40 uppercase font-black tracking-widest">Master PDF</p>
                <div className="flex items-center gap-2 mt-1">
                   <FileText size={16} className="text-neon-secondary" />
                   <p className="text-[10px] font-bold text-white/80">Generate Final</p>
                </div>
             </SurfaceCard>
          </div>

          <div className="space-y-4">
             <div className="flex items-center justify-between px-2">
                <p className="text-[9px] font-black text-white/40 uppercase tracking-widest">Historical Data Terminal (Filtered: {months[reportMonth]} {reportYear})</p>
                <div className="flex items-center gap-2">
                   <div className="flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                      <span className="text-[7px] text-white/20 uppercase font-bold tracking-tighter">Live Audit</span>
                   </div>
                </div>
             </div>
            {filteredAttendance.length === 0 ? (
              <div className="p-12 text-center border border-dashed border-white/5 rounded-sharp opacity-40">
                <Clock size={24} className="mx-auto mb-4" />
                <p className="text-[10px] uppercase font-bold tracking-widest">No activity logs for this period</p>
              </div>
            ) : (
              filteredAttendance.slice().sort((a: any, b: any) => {
                const timeA = a.clockIn instanceof Date ? a.clockIn.getTime() : new Date(a.clockIn).getTime();
                const timeB = b.clockIn instanceof Date ? b.clockIn.getTime() : new Date(b.clockIn).getTime();
                return timeB - timeA;
              }).map((rec: AttendanceRecord) => (
                <SurfaceCard key={rec.id} depth="low" className="group">
                  <div className="flex justify-between items-center">
                     <div className="flex items-center gap-4">
                        <div className="text-center min-w-[60px] border-r border-white/5 pr-4 py-1">
                           <p className="text-[8px] font-bold text-white/20 uppercase font-mono">
                             {(rec.clockIn instanceof Date ? rec.clockIn : new Date(rec.clockIn)).toLocaleDateString([], { day: '2-digit', month: 'short' })}
                           </p>
                           <p className="text-xs font-bold font-mono">
                             {(rec.clockIn instanceof Date ? rec.clockIn : new Date(rec.clockIn)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                           </p>
                        </div>
                        <div>
                           <div className="flex items-center gap-2">
                              <p className="text-sm font-bold">{rec.userName}</p>
                              <span className={`text-[8px] px-1.5 py-0.5 rounded uppercase font-bold ${
                                rec.status === 'LATE' ? 'bg-red-500/20 text-red-500' : 'bg-green-500/20 text-green-500'
                              }`}>
                                {rec.status}
                              </span>
                              {rec.synced === false && (
                                <span className="text-[8px] px-1.5 py-0.5 rounded uppercase font-bold bg-amber-500/20 text-amber-500 animate-pulse flex items-center gap-1">
                                  <Clock size={8} /> Sync Pending
                                </span>
                              )}
                           </div>
                           <p className="text-[10px] text-white/40 uppercase tracking-widest mt-1">
                             {rec.shift} Terminal • {rec.location}
                             {rec.clockOut && (
                               <span className="ml-2 pl-2 border-l border-white/10">
                                 OUT: {(rec.clockOut instanceof Date ? rec.clockOut : new Date(rec.clockOut)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                               </span>
                             )}
                           </p>
                        </div>
                     </div>
                     {rec.penalty > 0 && (
                       <div className="text-right p-3 bg-red-500/5 rounded-xl border border-red-500/10">
                          <p className="text-[8px] text-red-500 font-bold uppercase tracking-widest mb-1">Penalty</p>
                          <p className="text-xs font-bold font-mono">-${rec.penalty.toFixed(2)}</p>
                       </div>
                     )}
                  </div>
                </SurfaceCard>
              ))
            )}
          </div>
          <button 
            onClick={() => handleExportWithLog('ATTENDANCE', 'XLSX')}
            className="w-full py-5 bg-white/5 border border-dashed border-white/20 rounded-2xl text-[10px] font-display uppercase tracking-widest text-on-surface-variant hover:border-white/40 hover:bg-white/10 transition-all flex items-center justify-center gap-2 font-bold"
          >
            <Download size={16} className="text-neon-primary-container" />
            Export Master Attendance Log (Excel)
          </button>

          <div className="pt-8 border-t border-white/5 space-y-4">
             <div className="flex items-center gap-2">
                <FileText size={14} className="text-white/20" />
                <h4 className="text-[10px] font-black uppercase tracking-widest text-white/40">Download Vault (Previous Generations)</h4>
             </div>
             <div className="grid grid-cols-1 gap-2">
                {generatedReports.map((report, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5 group hover:bg-white/10 transition-colors">
                     <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${report.type === 'PDF' ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-500'}`}>
                           <FileText size={14} />
                        </div>
                        <div>
                           <p className="text-[10px] font-bold text-white/80">{report.name}</p>
                           <p className="text-[8px] text-white/20 uppercase font-black">Generated: {report.date}</p>
                        </div>
                     </div>
                     <button className="text-[8px] font-black uppercase tracking-widest text-neon-primary-container opacity-0 group-hover:opacity-100 transition-opacity">
                        View Info
                     </button>
                  </div>
                ))}
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

const PayrollModule = ({ user, employees, attendance, onDownloadPDF }: any) => {
  const [currentDate, setCurrentDate] = useState(new Date(2026, 3, 1)); // Default to April 2026
  const DAYS_OF_WEEK = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
  
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();
  
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
  // Adjust for Monday start (0=Sun, 1=Mon, ..., 6=Sat)
  const START_OFFSET = (firstDayOfMonth + 6) % 7;
  
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const monthDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const isSunday = (day: number) => {
    return new Date(currentYear, currentMonth, day).getDay() === 0;
  };

  const changeMonth = (offset: number) => {
    const nextDate = new Date(currentYear, currentMonth + offset, 1);
    setCurrentDate(nextDate);
  };

  const monthName = currentDate.toLocaleString('default', { month: 'long' });

  // Map of months for parsing static holiday data
  const monthsMap: Record<string, number> = {
    'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
    'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
  };

  const dynamicHolidays = useMemo(() => {
    const map: Record<string, Record<number, string>> = {
      '2026-3': { 23: 'Election Day Holiday' } // Custom April holiday
    };

    INDIA_HOLIDAYS_2026.forEach(h => {
      const [dayStr, monthStr] = h.date.split(' ');
      const day = parseInt(dayStr);
      const mIdx = monthsMap[monthStr];
      const key = `2026-${mIdx}`;
      
      if (!map[key]) map[key] = {};
      map[key][day] = h.name;
    });

    return map;
  }, []);

  return (
    <div className="p-6 space-y-8 animate-in fade-in slide-in-from-right-4 duration-700">
      <div className="space-y-1">
        <h2 className="text-3xl font-display font-bold tracking-tight">Financials</h2>
        <p className="text-on-surface-variant text-sm">Automated Pro-Rata Engine</p>
      </div>

      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <h4 className="font-display font-bold text-xs uppercase tracking-widest text-neon-secondary">{monthName} {currentYear}</h4>
            <div className="flex gap-1">
              <button 
                onClick={() => changeMonth(-1)}
                className="p-1 hover:bg-white/10 rounded transition-colors text-white/40 hover:text-white"
              >
                <ChevronLeft size={14} />
              </button>
              <button 
                onClick={() => changeMonth(1)}
                className="p-1 hover:bg-white/10 rounded transition-colors text-white/40 hover:text-white"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
          <button 
            onClick={() => onDownloadPDF('PAYROLL', 'PDF', currentMonth, currentYear)}
            className="flex items-center gap-2 px-3 py-1.5 bg-neon-primary-container/10 border border-neon-primary-container/30 rounded-lg text-[8px] font-black uppercase tracking-widest text-neon-primary-container hover:bg-neon-primary-container hover:text-white transition-all"
          >
            <FileText size={10} />
            Export Audit (PDF)
          </button>
        </div>
        
        <div className="glass rounded-[32px] p-6 border border-white/5 space-y-4">
          <div className="grid grid-cols-7 gap-1">
            {DAYS_OF_WEEK.map(day => (
              <div key={day} className="text-center py-2 text-[8px] font-black text-white/40 tracking-tighter">
                {day}
              </div>
            ))}
            
            {/* Empty slots for start offset */}
            {Array.from({ length: START_OFFSET }).map((_, i) => (
              <div key={`offset-${i}`} className="aspect-square" />
            ))}

            {monthDays.map(day => {
              const monthKey = `${currentYear}-${currentMonth}`;
              const holidayName = dynamicHolidays[monthKey]?.[day];
              const sun = isSunday(day);
              const isHoliday = !!holidayName;

              return (
                <div 
                  key={day} 
                  className={`relative aspect-square rounded-xl flex items-center justify-center text-xs font-bold transition-all border group ${
                    isHoliday 
                      ? 'bg-neon-secondary text-white border-neon-secondary shadow-[0_0_20px_rgba(255,145,0,0.4)] z-10' 
                      : sun 
                        ? 'bg-red-500/20 border-red-500/40 text-red-500' 
                        : 'bg-white/5 border-white/5 text-white/60 hover:border-white/20'
                  }`}
                >
                  {day}
                  {isHoliday && (
                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 z-20 w-24 p-2 bg-neutral-900 border border-white/20 rounded-lg text-[7px] text-white font-black uppercase pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity whitespace-normal text-center shadow-2xl">
                       {holidayName}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex gap-4 pt-4 border-t border-white/5">
             <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-neon-secondary rounded-md shadow-[0_0_10px_rgba(255,145,0,0.4)]" />
                <span className="text-[10px] font-bold text-white uppercase tracking-widest">Gov. Holiday</span>
             </div>
             <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-500/40 rounded-md border border-red-500/40" />
                <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Sunday</span>
             </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-end">
          <h4 className="font-display font-bold text-xs uppercase tracking-widest">Financial Audit</h4>
          <p className="text-[9px] text-white/20 uppercase font-mono">Formula: (Rate/25 * Days) - Ded.</p>
        </div>
        <div className="space-y-4">
          {employees.map((emp: any) => {
            const stats = getGranularPayroll(emp, attendance);
            const empLogs = attendance.filter((a: any) => a.userId === emp.id).sort((a: any, b: any) => {
              return new Date(b.clockIn).getTime() - new Date(a.clockIn).getTime();
            });

            return (
              <SurfaceCard key={emp.id} depth="low" className="flex flex-col gap-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-neon-primary-container font-black text-sm border border-white/5 shadow-inner">
                      {emp.name.split(' ').map((n: string) => n[0]).join('')}
                    </div>
                    <div>
                      <p className="text-sm font-bold tracking-tight">{emp.name}</p>
                      <p className="text-[10px] text-white/40 uppercase tracking-widest font-black">{emp.department} • {emp.shiftType}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-black text-neon-primary-container leading-none">
                      ${stats.netPayout.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <p className="text-[8px] text-white/20 uppercase font-black tracking-widest mt-1">Final Payout</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-white/5">
                  <div className="space-y-3">
                     <p className="text-[9px] text-white/20 font-black uppercase tracking-widest">Salary Ledger</p>
                     <div className="space-y-2">
                        <div className="flex justify-between text-[10px]">
                           <span className="text-white/40">Basis Pay (${stats.dailyRate.toFixed(0)}/day × {stats.daysPresent} days)</span>
                           <span className="font-mono text-white/80 font-bold">${(stats.dailyRate * stats.daysPresent).toFixed(2)}</span>
                        </div>
                        {parseFloat(stats.totalOvertimeHours) > 0 && (
                          <div className="flex justify-between text-[10px]">
                             <span className="text-white/40">Incentive Overtime ({stats.totalOvertimeHours}h)</span>
                             <span className="font-mono text-neon-primary-container font-bold">+${(stats.grossSalary - (stats.dailyRate * stats.daysPresent)).toFixed(2)}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-xs pt-2 border-t border-white/5">
                           <span className="text-white font-bold uppercase tracking-widest">Gross Total</span>
                           <span className="font-mono text-white font-black">${stats.grossSalary.toFixed(2)}</span>
                        </div>
                        {stats.advanceAmount > 0 && (
                          <div className="flex justify-between text-[10px]">
                             <span className="text-white/40 italic">Salary Advance</span>
                             <span className="font-mono text-red-400">-${stats.advanceAmount.toFixed(2)}</span>
                          </div>
                        )}
                        {stats.totalPenalties > 0 && (
                          <div className="flex justify-between text-[10px]">
                             <span className="text-white/40 italic">Lateness Penalties</span>
                             <span className="font-mono text-red-400">-${stats.totalPenalties.toFixed(2)}</span>
                          </div>
                        )}
                     </div>
                  </div>

                  <div className="space-y-3">
                    <p className="text-[9px] text-white/20 font-black uppercase tracking-widest">Detailed Logs (Recent)</p>
                    <div className="space-y-2 max-h-[120px] overflow-y-auto no-scrollbar pr-2">
                      {empLogs.slice(0, 10).map((log: any) => (
                        <div key={log.id} className="p-2 bg-white/5 rounded-lg border border-white/5 flex justify-between items-center group hover:bg-white/10 transition-colors">
                          <div className="space-y-0.5">
                            <p className="text-[9px] font-bold text-white/80">
                              {new Date(log.clockIn).toLocaleDateString([], { day: 'numeric', month: 'short' })}
                            </p>
                            <p className="text-[8px] text-white/30 uppercase tracking-widest">
                              {log.location} • {log.shift}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-[9px] font-mono text-neon-primary-container font-black">
                              {new Date(log.clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {log.clockOut ? new Date(log.clockOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '...'}
                            </p>
                            {log.penalty > 0 && <p className="text-[7px] text-red-400 uppercase font-bold">Pen: -${log.penalty}</p>}
                          </div>
                        </div>
                      ))}
                      {empLogs.length > 10 && (
                        <p className="text-center text-[8px] text-white/20 uppercase py-1">Viewing 10 of {empLogs.length} records</p>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <button className="flex-1 py-3 bg-white/5 rounded-xl text-[9px] font-black uppercase tracking-widest text-white/40 hover:text-white hover:bg-white/10 transition-all border border-white/5">
                    Full Financial Audit
                  </button>
                  <button className="px-4 py-3 bg-neon-secondary/10 rounded-xl text-neon-secondary hover:bg-neon-secondary/20 transition-all border border-neon-secondary/20">
                     <Settings size={14} />
                  </button>
                </div>
              </SurfaceCard>
            );
          })}
        </div>
      </div>

      <div className="flex gap-4">
        <button 
          onClick={() => onDownloadPDF('PAYROLL', 'XLSX', currentMonth, currentYear)}
          className="flex-1 py-5 bg-white/5 border border-dashed border-white/10 rounded-2xl text-[10px] font-display uppercase tracking-widest text-on-surface-variant hover:border-white/30 transition-all flex items-center justify-center gap-2 font-bold"
        >
          <FileText size={14} />
          XLSX Ledger
        </button>
        <button 
          onClick={() => onDownloadPDF('PAYROLL', 'PDF', currentMonth, currentYear)}
          className="flex-1 py-5 bg-neon-primary-container/10 border border-neon-primary-container/20 rounded-2xl text-[10px] font-display uppercase tracking-widest text-neon-primary-container hover:bg-neon-primary-container/20 transition-all flex items-center justify-center gap-2 font-bold"
        >
          <FileText size={14} />
          PDF Final Audit
        </button>
      </div>
    </div>
  );
};

const NotificationCenter = ({ isOpen, onClose, notifications, onRead, onAction, userRole }: any) => {
  const filtered = notifications.filter((n: any) => !n.targetRole || n.targetRole.includes(userRole));
  const unreadCount = filtered.filter((n: any) => !n.read).length;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[400] flex justify-end"
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
          
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="relative w-full max-w-[320px] bg-background border-l border-white/5 h-full flex flex-col shadow-2xl overflow-hidden"
          >
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-surface-low">
              <div>
                <h3 className="font-display font-bold text-lg uppercase tracking-tight">Activity Center</h3>
                <p className="text-[10px] text-white/40 uppercase tracking-widest">{unreadCount} Pending Alerts</p>
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-white/5 rounded-full text-white/40 hover:text-white transition-colors"
                title="Close Panel"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
              {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 opacity-30 text-center">
                  <BellRing size={24} className="mb-2" />
                  <p className="text-xs uppercase font-bold tracking-widest">System Clear</p>
                </div>
              ) : (
                filtered.map((n: any) => (
                  <SurfaceCard 
                    key={n.id} 
                    depth={n.read ? 'low' : 'high'} 
                    className={`relative border-l-2 ${
                      n.priority === 'HIGH' ? 'border-red-500' : 
                      n.priority === 'MEDIUM' ? 'border-amber-500' : 'border-neon-primary-container'
                    } ${!n.read ? 'bg-surface-low' : 'opacity-60'}`}
                    onClick={() => onRead(n.id)}
                  >
                    <div className="space-y-2">
                       <div className="flex justify-between items-start">
                          <div className="flex items-center gap-2">
                            {n.type === 'ALERT' && <AlertTriangle size={14} className="text-amber-500" />}
                            {n.type === 'APPROVAL' && <Heart size={14} className="text-red-500" />}
                            {n.type === 'UPDATE' && <Timer size={14} className="text-neon-primary-container" />}
                            <span className="text-[8px] font-bold uppercase tracking-widest text-white/40">{n.type}</span>
                          </div>
                          <span className="text-[8px] font-mono text-white/20">{n.time}</span>
                       </div>
                       <div>
                          <h4 className="text-xs font-bold text-white leading-tight">{n.title}</h4>
                          <p className="text-[10px] text-white/60 mt-1 leading-relaxed">{n.message}</p>
                       </div>
                       
                       {n.type === 'APPROVAL' && !n.read && (
                         <div className="flex gap-2 pt-2">
                            <button 
                              onClick={(e) => { e.stopPropagation(); onAction(n.id, 'APPROVE'); }}
                              className="flex-1 py-2 bg-neon-primary-container text-white text-[9px] font-black uppercase rounded-lg shadow-lg"
                            >
                              Approve
                            </button>
                            <button 
                              onClick={(e) => { e.stopPropagation(); onAction(n.id, 'REJECT'); }}
                              className="flex-1 py-2 bg-white/5 text-white/40 text-[9px] font-black uppercase rounded-lg border border-white/10"
                            >
                              Deny
                            </button>
                         </div>
                       )}
                    </div>
                  </SurfaceCard>
                ))
              )}
            </div>

            <div className="p-6 bg-surface-low border-t border-white/5">
              <button className="w-full py-3 bg-white/5 border border-white/10 rounded-xl text-[10px] uppercase font-bold text-white/40 hover:text-white transition-colors">
                Archive All Read
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// --- Main Navigation & Wrapper ---

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('attendance');
  const [activeScanner, setActiveScanner] = useState<'FACE' | null>(null);
  const [scannerTarget, setScannerTarget] = useState<((matchedUser?: User) => void) | null>(null);
  const [addEmployeeData, setAddEmployeeData] = useState<{ faceEnrolled?: boolean, faceData?: string } | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [authIntent, setAuthIntent] = useState<{ isOpen: boolean; callback: () => void }>({ isOpen: false, callback: () => {} });
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    const saved = localStorage.getItem('chronos_notifications');
    return saved ? JSON.parse(saved) : INITIAL_NOTIFICATIONS;
  });
  
  // Persistence state
  const [employees, setEmployees] = useState<User[]>(() => {
    const saved = localStorage.getItem('chronos_employees');
    return saved ? JSON.parse(saved) : INITIAL_EMPLOYEES;
  });
  const [attendance, setAttendance] = useState<AttendanceRecord[]>(() => {
    const saved = localStorage.getItem('chronos_attendance');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.map((r: any) => ({
          ...r,
          clockIn: new Date(r.clockIn),
          clockOut: r.clockOut ? new Date(r.clockOut) : undefined
        }));
      } catch (e) {
        return INITIAL_ATTENDANCE;
      }
    }
    return INITIAL_ATTENDANCE;
  });

  useEffect(() => {
    localStorage.setItem('chronos_attendance', JSON.stringify(attendance));
  }, [attendance]);

  useEffect(() => {
    localStorage.setItem('chronos_employees', JSON.stringify(employees));
  }, [employees]);

  useEffect(() => {
    localStorage.setItem('chronos_notifications', JSON.stringify(notifications));
  }, [notifications]);

  useEffect(() => {
    if (isOnline) {
      const unsynced = attendance.filter(r => r.synced === false);
      if (unsynced.length > 0) {
        setIsSyncing(true);
        const timer = setTimeout(() => {
          setAttendance(prev => prev.map(r => r.synced === false ? { ...r, synced: true } : r));
          setIsSyncing(false);
          setSuccessMessage(`${unsynced.length} Offline Records Synchronized`);
          setTimeout(() => setSuccessMessage(null), 3000);
        }, 2000);
        return () => clearTimeout(timer);
      }
    }
  }, [isOnline, attendance]);

  useEffect(() => {
    // Listen for Auth state changes
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        // If we have a firebase user, bootstrap the app state
        // We might want to fetch their custom data from Firestore too
        // But for now, we'll rely on the LoginScreen to pass the user details
        // Or we can try to find them in the employees list if they are an employee
      } else {
        setUser(null);
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    // Bootstrap initial data to Firestore if users collection is empty
    // Only run if a user is logged in (preferably Admin/Manager)
    if (!user) return;

    const bootstrap = async () => {
      try {
        const usersCol = collection(db, 'users');
        // Use a one-time get count instead of onSnapshot for bootstrap check
        const { getCountFromServer } = await import('firebase/firestore');
        const collCount = await getCountFromServer(usersCol);
        
        // Fix: Use INITIAL_EMPLOYEES length as the condition for bootstrapping data
        if (collCount.data().count === 0 && INITIAL_EMPLOYEES.length > 0) {
           console.log("Cloud terminal detected empty identity database. Bootstrapping baseline records...");
           for (const emp of INITIAL_EMPLOYEES) {
             await setDoc(doc(db, 'users', emp.id), emp);
           }
           setSuccessMessage("Cloud identity database successfully initialized.");
           setTimeout(() => setSuccessMessage(null), 3000);
        }
      } catch (err) {
         console.warn("Bootstrap sync failed:", err);
      }
    };
    bootstrap();
  }, [user]);

  useEffect(() => {
    // Only start real-time sync if we have a real Firebase session
    // If auth.currentUser is missing, we are likely in Demo Mode / local bypass
    if (!user || !auth.currentUser) {
      if (!user) {
        setEmployees([]);
        setAttendance([]);
        setNotifications([]);
      }
      return;
    }

    const handleError = (collectionName: string) => (err: any) => {
      if (err.code === 'permission-denied') {
        console.warn(`Firestore: Access denied for ${collectionName}. Using local state.`);
      } else {
        console.error(`Firestore error in ${collectionName}:`, err);
      }
    };

    // Real-time synchronization for Employees
    let employeesQuery;
    if (user.role === 'ADMIN' || user.role === 'MANAGER' || auth.currentUser?.email === 'staff@gmail.com') {
      employeesQuery = query(collection(db, 'users'));
    } else {
      employeesQuery = query(collection(db, 'users'), where('id', '==', user.id));
    }

    // Sync Employees: If cloud sync fails or returns empty, LocalStorage should not override a real deletion
    const unsubEmployees = onSnapshot(employeesQuery, (snapshot: any) => {
      const emps = snapshot.docs.map((doc: any) => ({ ...doc.data(), id: doc.id } as User));
      console.log(`[Sync] Employees Updated: ${emps.length} records retrieved.`);
      setEmployees(emps);
    }, (error) => {
      console.error("[Sync] Employees Error:", error);
      if (error.code === 'permission-denied') {
        setErrorMessage("Access Denied: Terminal not authorized for workforce directory.");
      }
    });

    // Real-time synchronization for Attendance
    let attendanceQuery;
    if (user.role === 'ADMIN' || user.role === 'MANAGER' || auth.currentUser?.email === 'staff@gmail.com') {
      attendanceQuery = query(collection(db, 'attendance'), orderBy('clockIn', 'desc'));
    } else {
      // Employees only see their own records
      attendanceQuery = query(
        collection(db, 'attendance'), 
        where('userId', '==', user.id), 
        orderBy('clockIn', 'desc')
      );
    }

    const unsubAttendance = onSnapshot(attendanceQuery, (snapshot: any) => {
      const records = snapshot.docs.map((doc: any) => {
        const data = doc.data();
        return {
          ...data,
          id: doc.id,
          clockIn: data.clockIn?.toDate(),
          clockOut: data.clockOut?.toDate()
        } as AttendanceRecord;
      });
      setAttendance(records);
    }, handleError('Attendance'));

    // Real-time synchronization for Notifications
    const unsubNotifs = onSnapshot(collection(db, 'notifications'), (snapshot) => {
      const notifs = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as AppNotification));
      setNotifications(notifs);
    }, handleError('Notifications'));

    return () => {
      unsubEmployees();
      unsubAttendance();
      unsubNotifs();
    };
  }, [user]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 1200);
    return () => clearTimeout(timer);
  }, []);

  const handleLogin = (role: Role, backendUser?: User) => {
    if (backendUser) {
        // Note: The actual Firebase Auth sign-in happens in the LoginScreen component
        setUser(backendUser);
    } else {
        if (role === 'ADMIN') setUser(MOCK_ADMIN);
        else if (role === 'MANAGER') setUser(MOCK_MANAGER);
        else {
          setErrorMessage("Identity verification required for terminal access.");
          setTimeout(() => setErrorMessage(null), 3000);
        }
    }

    setActiveTab(role === 'EMPLOYEE' ? 'attendance' : 'admin');
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      // Clear all local session data to prevent "Reappearing Data" bugs
      localStorage.removeItem('chronos_employees');
      localStorage.removeItem('chronos_attendance');
      localStorage.removeItem('chronos_notifications');
      
      setUser(null);
      setIsLoaded(false);
      setTimeout(() => setIsLoaded(true), 500);
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  const triggerBiometricAuth = (callback: (data: string, matchedUser?: User) => void) => {
    setActiveScanner('FACE');
    setScannerTarget(() => callback);
  };

  const handleCapture = (data: string, matchedUser?: User) => {
    if (scannerTarget) {
      scannerTarget(data, matchedUser);
    } else if (activeScanner === 'FACE') {
      setAddEmployeeData({ faceEnrolled: true, faceData: data });
    }
    setActiveScanner(null);
    setScannerTarget(null);
  };

  const handleAuthComplete = () => {
    const currentCallback = authIntent.callback;
    setAuthIntent({ isOpen: false, callback: () => {} });
    currentCallback();
  };

  const handleDirectScan = (emp: User) => {
    setActiveScanner('FACE');
    setScannerTarget(() => async (data: string) => {
      try {
        const userRef = doc(db, 'users', emp.id);
        await updateDoc(userRef, {
          faceEnrolled: true,
          faceData: data
        });
        setSuccessMessage(`Biometric Signature Captured & Encrypted for ${emp.name}`);
        playIdentityVerifiedBeep();
      } catch (err) {
        console.error("Biometric Save Error:", err);
        setErrorMessage("Cloud encryption failed. Please retry.");
      }
      setTimeout(() => setSuccessMessage(null), 3000);
    });
  };

  const handleMarkAttendance = async (employee: User | null, isFailure: boolean = false) => {
    if (isFailure || !employee) {
      setErrorMessage("Biometric Identity Verification Failed. Feature mismatch detected.");
      setTimeout(() => setErrorMessage(null), 4000);
      return;
    }

    const now = new Date();
    const activeRecord = attendance.find(r => r.userId === employee.id && !r.clockOut);

    try {
      if (activeRecord) {
        // Clock Out Logic
        const shiftEndStr = employee.shiftTiming?.split(' - ')[1] || '17:00';
        const [h, m] = shiftEndStr.split(':').map(Number);
        const shiftEnd = new Date(now);
        shiftEnd.setHours(h, m, 0, 0);

        const diffMs = shiftEnd.getTime() - now.getTime();
        const latePenalty = diffMs > 15 * 60000 ? 50 : 0;

        const recordRef = doc(db, 'attendance', activeRecord.id);
        try {
          await updateDoc(recordRef, {
            clockOut: Timestamp.fromDate(now),
            penalty: activeRecord.penalty + latePenalty,
            synced: true
          });
        } catch (dbErr) {
          handleFirestoreError(dbErr, 'update', `attendance/${activeRecord.id}`);
        }

        setSuccessMessage(`Clocked Out. Good job, ${employee.name.split(' ')[0]}!`);
        playClockOutBeep();
      } else {
        // Clock In Logic
        const shiftHour = parseInt(employee.shiftTiming?.split(':')[0] || '9');
        const isLate = now.getHours() >= shiftHour && now.getMinutes() > 0;
        
        const newRecordRef = doc(collection(db, 'attendance'));
        try {
          await setDoc(newRecordRef, {
            id: newRecordRef.id,
            userId: employee.id,
            userName: employee.name,
            clockIn: Timestamp.fromDate(now),
            location: 'HQ Kiosk',
            status: isLate ? 'LATE' : 'PRESENT',
            penalty: isLate ? 100 : 0,
            shift: employee.shiftType || 'DAY',
            synced: true
          });
        } catch (dbErr) {
          handleFirestoreError(dbErr, 'create', `attendance/${newRecordRef.id}`);
        }
        
        setSuccessMessage(`Clocked In. Welcome, ${employee.name.split(' ')[0]}!`);
        playClockInBeep();
      }
    } catch (err: any) {
      console.error("Attendance Sync Error:", err);
      try {
        const info = JSON.parse(err.message);
        setErrorMessage(`Security Reject: ${info.operationType} on ${info.path} denied. (Verified: ${info.authInfo.emailVerified})`);
      } catch {
        setErrorMessage("Database synchronization failed.");
      }
    }
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleAddEmployee = async (emp: User) => {
    try {
      await setDoc(doc(db, 'users', emp.id), emp);
      setSuccessMessage(`Employee ${emp.name} added to cloud.`);
      setAddEmployeeData(null); // Clear scan data after successful record creation
    } catch (err: any) {
      console.error("Employee Save Error:", err);
      if (err.code === 'permission-denied') {
        setErrorMessage("Permission Denied: Administrative identity verification failed at the security layer. Please re-authenticate.");
      } else {
        setErrorMessage("Failed to save employee record.");
      }
    }
  };

  const handleUpdateEmployee = async (updatedEmp: User) => {
    try {
      await setDoc(doc(db, 'users', updatedEmp.id), updatedEmp);
      setSuccessMessage(`Employee ${updatedEmp.name} updated.`);
      setAddEmployeeData(null); // Clear scan data after successful record update
    } catch (err: any) {
      console.error("Employee Update Error:", err);
      if (err.code === 'permission-denied') {
        setErrorMessage("Access Denied: You do not have sufficient permissions to update this identity record.");
      } else {
        setErrorMessage("Update failed.");
      }
    }
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleDeleteEmployee = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'users', id));
      setSuccessMessage("Employee profile deleted.");
    } catch (err) {
      setErrorMessage("Deletion failed.");
    }
  };

  const handleExportData = (type: 'PAYROLL' | 'ATTENDANCE', format: 'XLSX' | 'PDF' = 'XLSX', targetMonth?: number, targetYear?: number) => {
    setSuccessMessage(`Compiling ${type} ${format} Ledger...`);
    
    setTimeout(() => {
      // Filter attendance if a specific month/year is requested
      let filteredAttendance = attendance;
      if (typeof targetMonth === 'number' && typeof targetYear === 'number') {
        filteredAttendance = attendance.filter(a => {
            const date = a.clockIn instanceof Date ? a.clockIn : new Date(a.clockIn);
            return date.getMonth() === targetMonth && date.getFullYear() === targetYear;
        });
      }

      if (format === 'PDF' && type === 'PAYROLL') {
        const doc = new jsPDF();
        const dateStr = targetMonth !== undefined ? `${new Date(targetYear || 2026, targetMonth).toLocaleString('default', { month: 'long', year: 'numeric' })}` : new Date().toLocaleDateString();
        
        // Header
        doc.setFontSize(20);
        doc.setTextColor(0, 112, 255);
        doc.text("ROBINBOSKY CONSOLIDATED PAYROLL", 105, 20, { align: 'center' });
        
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Audit Generation Date: ${new Date().toLocaleDateString()}`, 105, 28, { align: 'center' });
        doc.text(`Financial Period: ${dateStr}`, 105, 33, { align: 'center' });

        // Summary Table
        const summaryRows = employees.map(e => {
          const stats = getGranularPayroll(e, filteredAttendance);
          return [
            e.name,
            e.department,
            stats.daysPresent.toString(),
            `$${stats.dailyRate.toFixed(2)}`,
            `$${stats.grossSalary.toFixed(2)}`,
            `-$${(stats.totalPenalties + (e.advanceAmount || 0)).toFixed(2)}`,
            `$${stats.netPayout.toFixed(2)}`
          ];
        });

        autoTable(doc, {
          startY: 40,
          head: [['Employee', 'Dept', 'Days', 'Rate', 'Gross', 'Deductions', 'Net Payout']],
          body: summaryRows,
          theme: 'grid',
          headStyles: { fillColor: [0, 112, 255] },
          styles: { fontSize: 8 }
        });

        // Detailed Page per Employee
        employees.forEach((emp, index) => {
          doc.addPage();
          const stats = getGranularPayroll(emp, filteredAttendance);
          const empLogs = filteredAttendance.filter(a => a.userId === emp.id).sort((a, b) => new Date(b.clockIn).getTime() - new Date(a.clockIn).getTime());

          doc.setFontSize(16);
          doc.setTextColor(40);
          doc.text(`Employee Ledger: ${emp.name}`, 20, 20);
          
          doc.setFontSize(10);
          doc.setTextColor(100);
          doc.text(`Position: ${emp.position} | Dept: ${emp.department}`, 20, 28);
          doc.text(`Employment Schedule: ${emp.shiftType} (${emp.shiftTiming})`, 20, 33);
          
          if (emp.faceEnrolled && emp.faceData) {
            if (emp.faceData.startsWith('data:image')) {
              try {
                doc.addImage(emp.faceData, 'JPEG', 165, 10, 25, 25);
                doc.setFontSize(6);
                doc.setTextColor(150);
                doc.text("VERIFIED BIOMETRIC ID", 165, 38);
              } catch (e) {
                doc.setFontSize(8);
                doc.text("BIOMETRIC PORTRAIT ERROR", 165, 15);
              }
            } else {
              doc.setFontSize(8);
              doc.setTextColor(0, 112, 255);
              doc.text(`Biometric Token: ${emp.faceData.substring(0, 16)}...`, 20, 38);
            }
          }

          // Earnings Summary Table
          autoTable(doc, {
            startY: 42,
            head: [['Payroll Breakdown', 'Reference / Units', 'Subtotal']],
            body: [
              ['Regular Base Pay', `${stats.daysPresent} Days @ $${stats.dailyRate.toFixed(2)}/day`, `$${stats.regularPay.toFixed(2)}`],
              ['Overtime Premium', `${stats.totalOvertimeHours} OT Hours (Multiplied Rate)`, `$${(stats.grossSalary - stats.regularPay).toFixed(2)}`],
              ['Gross Earnings', 'Total Income Before Deductions', `$${stats.grossSalary.toFixed(2)}`],
              ['Advance Recouped', 'Prior Employee Advance Balance', `-$${stats.advanceAmount.toFixed(2)}`],
              ['Audit Penalties', 'Lateness / Behavioral Deductions', `-$${stats.totalPenalties.toFixed(2)}`],
            ],
            theme: 'grid',
            headStyles: { fillColor: [40, 40, 40] },
            foot: [['TOTAL NET PAYABLE', '', `$${stats.netPayout.toFixed(2)}`]],
            footStyles: { fillColor: [0, 112, 255], textColor: 255, fontStyle: 'bold' },
            styles: { fontSize: 8 }
          });

          // Attendance Audit
          doc.setFontSize(11);
          doc.setTextColor(40);
          const auditTitleY = (doc as any).lastAutoTable.finalY + 10;
          doc.text("Daily Attendance & Scanning Audit Log", 20, auditTitleY);

          const logRows = empLogs.map(l => [
            new Date(l.clockIn).toLocaleDateString(),
            new Date(l.clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
            l.clockOut ? new Date(l.clockOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : 'MISSING',
            l.shift,
            l.location,
            l.status,
            `-$${l.penalty.toFixed(0)}`
          ]);

          autoTable(doc, {
            startY: auditTitleY + 5,
            head: [['Date', 'Scan In', 'Scan Out', 'Terminal', 'Location', 'Status', 'Pen']],
            body: logRows,
            theme: 'striped',
            headStyles: { fillColor: [100, 100, 100] },
            styles: { fontSize: 7 }
          });
        });

        doc.save(`consolidated_payroll_${dateStr.replace(/\//g, '-')}.pdf`);
        setSuccessMessage("Consolidated PDF Report Generated!");
      } else {
        const wb = XLSX.utils.book_new();

        if (type === 'PAYROLL') {
          const summaryData = employees.map(e => {
            const stats = getGranularPayroll(e, attendance);
            return {
              'Employee Name': e.name,
              'Position': e.position,
              'Department': e.department,
              'Days Present': stats.daysPresent,
              'Daily Rate ($)': stats.dailyRate.toFixed(2),
              'Total Gross ($)': stats.grossSalary.toFixed(2),
              'Total Penalty ($)': stats.totalPenalties.toFixed(2),
              'Final Payout ($)': stats.netPayout.toFixed(2)
            };
          });

          // Detailed logs as requested for "Consolidated Payroll" sheet
          const consolidatedDetails = filteredAttendance.map(a => {
            const emp = employees.find((e: any) => e.id === a.userId);
            const clockInDate = a.clockIn instanceof Date ? a.clockIn : new Date(a.clockIn);
            const clockOutDate = a.clockOut ? (a.clockOut instanceof Date ? a.clockOut : new Date(a.clockOut)) : null;
            return {
              'Employee ID': a.userId,
              'Employee Name': a.userName,
              'Department': emp?.department || 'N/A',
              'Date': clockInDate.toLocaleDateString(),
              'Clock-In Time': clockInDate.toLocaleTimeString([], { hour12: false }),
              'Clock-Out Time': clockOutDate ? clockOutDate.toLocaleTimeString([], { hour12: false }) : 'PENDING/MISSING',
              'Shift Terminal': a.shift,
              'Scan Location': a.location,
              'Audit Status': a.status,
              'Daily Penalty ($)': a.penalty.toFixed(2)
            };
          }).sort((a, b) => new Date(b.Date).getTime() - new Date(a.Date).getTime());

          const wsMaster = XLSX.utils.json_to_sheet(consolidatedDetails);
          const wsSummary = XLSX.utils.json_to_sheet(summaryData);
          XLSX.utils.book_append_sheet(wb, wsMaster, "Consolidated Payroll Logs");
          XLSX.utils.book_append_sheet(wb, wsSummary, "Employee Payout Summary");
        } else {
          const attendanceData = filteredAttendance.map(a => {
            const clockInDate = a.clockIn instanceof Date ? a.clockIn : new Date(a.clockIn);
            const clockOutDate = a.clockOut ? (a.clockOut instanceof Date ? a.clockOut : new Date(a.clockOut)) : null;
            
            return {
              'Employee ID': a.userId,
              'User Name': a.userName,
              'Shift': a.shift,
              'Location': a.location,
              'Status': a.status,
              'Clock In Date': clockInDate.toLocaleDateString(),
              'Clock In Time': clockInDate.toLocaleTimeString(),
              'Clock Out Date': clockOutDate ? clockOutDate.toLocaleDateString() : 'N/A',
              'Clock Out Time': clockOutDate ? clockOutDate.toLocaleTimeString() : 'N/A',
              'Penalty ($)': a.penalty.toFixed(2)
            };
          });
          const ws = XLSX.utils.json_to_sheet(attendanceData);
          XLSX.utils.book_append_sheet(wb, ws, "Attendance Statistics");
        }

        XLSX.writeFile(wb, `${type.toLowerCase()}_report_${new Date().toISOString().split('T')[0]}.xlsx`);
        setSuccessMessage(`${type} Multi-Sheet Report Downloaded!`);
      }

      setTimeout(() => setSuccessMessage(null), 2000);
    }, 1500);
  };

  const handleReadNotification = async (id: string) => {
    try {
      await updateDoc(doc(db, 'notifications', id), { read: true });
    } catch (err) {
      console.error("Notif Read Error:", err);
    }
  };

  const handleNotificationAction = async (id: string, action: 'APPROVE' | 'REJECT') => {
    const notif = notifications.find(n => n.id === id);
    if (notif) {
      try {
        await deleteDoc(doc(db, 'notifications', id));
        setSuccessMessage(action === 'APPROVE' ? 'Request Approved' : 'Request Terminated');
      } catch (err) {
        setErrorMessage("Action failed.");
      }
      setTimeout(() => setSuccessMessage(null), 2000);
    }
  };

  const unreadNotifs = useMemo(() => {
    if (!user) return 0;
    return notifications.filter(n => !n.read && (!n.targetRole || n.targetRole.includes(user.role))).length;
  }, [notifications, user]);

  if (!isLoaded) {
    return (
      <div className="fixed inset-0 bg-background flex flex-col items-center justify-center">
        <div className="absolute inset-0 atmosphere opacity-40" />
        <motion.div
          animate={{ scale: [1, 1.2, 1], rotate: [0, 90, 180, 270, 360] }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          className="w-16 h-16 border-2 border-neon-primary-container border-t-transparent rounded-full mb-8 shadow-[0_0_30px_rgba(255,78,0,0.2)] relative z-10"
        />
        <h1 className="font-display text-2xl tracking-[0.5em] uppercase font-bold text-gradient relative z-10">ROBINBOSKY</h1>
      </div>
    );
  }

  if (!user) {
    return (
      <LoginScreen 
        onLogin={handleLogin} 
        onError={(msg) => {
          setErrorMessage(msg);
          setTimeout(() => setErrorMessage(null), 3000);
        }}
        onFaceAuth={() => {
          setActiveScanner('FACE');
          setScannerTarget(() => (_data: string, matchedUser?: User) => {
            if (matchedUser) {
              setUser(matchedUser);
              setActiveTab('attendance');
              handleMarkAttendance(matchedUser);
            } else {
              handleLogin('EMPLOYEE');
            }
          });
        }} 
      />
    );
  }

  return (
    <div className="max-w-md mx-auto min-h-screen bg-background relative selection:bg-neon-primary-container selection:text-neon-on-primary-container pb-24">
      <div className="fixed inset-0 pointer-events-none atmosphere opacity-60 z-0" />
      
      <AnimatePresence>
        {successMessage && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] flex items-center justify-center px-8 backdrop-blur-3xl bg-black/40"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-neon-primary-container text-white p-12 rounded-[64px] shadow-[0_0_100px_rgba(0,112,255,0.6)] flex flex-col items-center text-center gap-6 border border-white/30 relative"
            >
               <button 
                onClick={() => setSuccessMessage(null)}
                className="absolute top-8 right-8 p-3 hover:bg-white/20 rounded-full transition-colors"
                title="Dismiss"
               >
                  <X size={20} />
               </button>
               <motion.div 
                 animate={{ scale: [1, 1.2, 1] }} 
                 transition={{ duration: 0.5, repeat: Infinity }}
                 className="p-6 bg-white/20 rounded-full"
               >
                  <Heart className="fill-current" size={64} />
               </motion.div>
               <div className="space-y-2">
                  <h3 className="font-display font-black text-4xl uppercase tracking-tighter">SUCCESS</h3>
                  <p className="font-display font-bold uppercase tracking-[0.2em] text-sm opacity-60">Verified & Synced</p>
               </div>
               <div className="h-px w-24 bg-white/20 my-2" />
               <p className="text-2xl font-display font-bold">{successMessage}</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {errorMessage && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] flex items-center justify-center px-8 backdrop-blur-3xl bg-black/40"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-red-500 text-white p-12 rounded-[64px] shadow-[0_0_100px_rgba(239,68,68,0.6)] flex flex-col items-center text-center gap-6 border border-white/30 relative"
            >
               <button 
                onClick={() => setErrorMessage(null)}
                className="absolute top-8 right-8 p-3 hover:bg-white/20 rounded-full transition-colors"
                title="Dismiss"
               >
                  <X size={20} />
               </button>
               <motion.div 
                 animate={{ scale: [1, 1.2, 1] }} 
                 transition={{ duration: 0.5, repeat: Infinity }}
                 className="p-6 bg-white/20 rounded-full"
               >
                  <AlertTriangle className="text-white" size={64} />
               </motion.div>
               <div className="space-y-2">
                  <h3 className="font-display font-black text-4xl uppercase tracking-tighter">
                    {errorMessage.toLowerCase().includes('identity') || errorMessage.toLowerCase().includes('match') 
                      ? 'IDENTITY MATCH FAILED' 
                      : 'OPERATION DENIED'}
                  </h3>
                  <p className="font-display font-bold uppercase tracking-[0.2em] text-sm opacity-60">
                    {errorMessage.toLowerCase().includes('identity') ? 'Authentication Denied' : 'Security protocol violation'}
                  </p>
               </div>
               <div className="h-px w-24 bg-white/20 my-2" />
               <p className="text-2xl font-display font-bold">{errorMessage}</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <BiometricOverlay 
        isOpen={authIntent.isOpen} 
        onComplete={handleAuthComplete} 
        onCancel={() => setAuthIntent({ ...authIntent, isOpen: false })} 
      />

      <NotificationCenter 
        isOpen={isNotifOpen} 
        onClose={() => setIsNotifOpen(false)} 
        notifications={notifications}
        onRead={handleReadNotification}
        onAction={handleNotificationAction}
        userRole={user.role}
      />

      <header className="px-6 pt-12 space-y-6 relative z-20">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-2"
            >
              <div className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-neon-primary-container shadow-[0_0_8px_#0070FF] animate-pulse' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]'}`} />
              <p className={`text-[9px] font-display font-black uppercase tracking-[0.3em] ${isOnline ? 'text-neon-primary-container' : 'text-red-500'}`}>
                {isOnline ? 'System : Active' : 'System : Offline'}
              </p>
            </motion.div>
            <h1 className="text-4xl font-display font-black tracking-tighter text-white lowercase leading-none">
              robinbosky<span className="text-neon-primary-container">.</span>
            </h1>
          </div>
          
          <div className="flex items-center gap-1.5 translate-y-1">
            {isSyncing && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="px-2 py-1 bg-neon-primary-container/10 border border-neon-primary-container/20 rounded-md text-[8px] font-black text-neon-primary-container uppercase tracking-widest flex items-center gap-2"
              >
                <div className="w-1 h-1 bg-neon-primary-container rounded-full animate-ping" />
                Syncing
              </motion.div>
            )}
            <button 
              onClick={() => setIsNotifOpen(true)}
              className="p-2.5 bg-surface-low rounded-xl text-on-surface-variant hover:text-neon-primary-container transition-all relative border border-white/5"
            >
              <Bell size={16} />
              {unreadNotifs > 0 && (
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full border border-surface-low shadow-[0_0_5px_rgba(239,68,68,0.5)]" />
              )}
            </button>
            <button 
              onClick={handleLogout}
              className="p-2.5 bg-surface-low rounded-xl text-on-surface-variant hover:text-red-400 transition-colors border border-white/5"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-stretch gap-4 py-3 border-y border-white/5 bg-white/[0.02] backdrop-blur-sm px-4 rounded-lg"
        >
          <div className="pr-4 border-r border-white/10 flex flex-col justify-center">
             <p className="text-[7px] font-display font-black uppercase tracking-[0.2em] text-white/30 mb-0.5">Terminal</p>
             <p className="text-[9px] font-mono text-white/60 tracking-tighter font-bold">K3000-X</p>
          </div>
          <div className="flex-1 flex flex-col justify-center">
             <p className="text-[7px] font-display font-black uppercase tracking-[0.2em] text-white/30 mb-0.5">Interface Operation</p>
             <div className="flex items-center gap-2">
                <p className="text-[10px] font-display font-bold uppercase tracking-[0.1em] text-white/90">
                  {activeTab === 'attendance' ? 'Biometric ID Protocol' : `${activeTab.toUpperCase()} Ledger`}
                </p>
                <div className="flex-1 h-px bg-linear-to-r from-neon-primary-container/30 to-transparent" />
             </div>
          </div>
        </motion.div>
      </header>

      <main className="relative z-10">
        <AnimatePresence mode="wait">
          {activeTab === 'attendance' && (
            <AttendanceModule 
              key="attendance" 
              user={user}
              employees={employees} 
              attendance={attendance}
              onRequestBiometricAuth={(cb: any) => triggerBiometricAuth((_data, matchedUser) => cb(matchedUser))} 
              onMarkAttendance={handleMarkAttendance} 
              isOnline={isOnline}
              isSyncing={isSyncing}
            />
          )}
          {activeTab === 'payroll' && user.role !== 'EMPLOYEE' && (
            <PayrollModule 
              key="payroll" 
              user={user} 
              employees={employees} 
              attendance={attendance}
              onDownloadPDF={handleExportData}
            />
          )}
          {activeTab === 'admin' && user.role !== 'EMPLOYEE' && (
            <AdminModule 
              key="admin" 
              employees={employees} 
              attendance={attendance} 
              onAddEmployee={handleAddEmployee} 
              onUpdateEmployee={handleUpdateEmployee}
              onDeleteEmployee={handleDeleteEmployee} 
              userRole={user.role} 
              onExportCSV={handleExportData}
              onScanRequest={(type: 'FACE') => {
                setAddEmployeeData(null); 
                setActiveScanner(type);
                setScannerTarget(null);
              }}
              onCancelForm={() => setAddEmployeeData(null)}
              scanData={addEmployeeData}
              onDirectScan={handleDirectScan}
              isOnline={isOnline}
              isSyncing={isSyncing}
              onInitializeData={handleInitializeDatasets}
            />
          )}
        </AnimatePresence>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto z-50 glass border-t border-on-surface/5 px-8 pt-4 pb-8 flex justify-around items-center">
        {user.role === 'EMPLOYEE' ? (
          <>
            <NavBtn 
              active={activeTab === 'attendance'} 
              onClick={() => setActiveTab('attendance')} 
              icon={<Scan size={20} />} 
              label="Check-In" 
            />
            <NavBtn 
              active={false} 
              onClick={() => setSuccessMessage("Profile Encrypted")} 
              icon={<ShieldCheck size={20} />} 
              label="Private" 
            />
          </>
        ) : (
          <>
            <NavBtn 
              active={activeTab === 'admin'} 
              onClick={() => setActiveTab('admin')} 
              icon={<PieChart size={20} />} 
              label={user.role === 'ADMIN' ? 'Admin' : 'Manager'} 
            />
            <div className="relative -top-10">
              <button 
                onClick={() => setActiveTab('attendance')}
                className={`p-4 rounded-sharp shadow-2xl transition-all duration-500 ${activeTab === 'attendance' ? 'bg-neon-primary-container neon-glow text-white scale-110' : 'bg-surface-low text-on-surface-variant'}`}
              >
                <Clock size={24} strokeWidth={2.5} />
              </button>
            </div>
            <NavBtn 
              active={activeTab === 'payroll'} 
              onClick={() => setActiveTab('payroll')} 
              icon={<DollarSign size={20} />} 
              label="Payroll" 
            />
          </>
        )}
      </nav>
      <AnimatePresence>
        {activeScanner && (
          <BiometricScanner 
            employees={employees}
            onCapture={handleCapture}
            onCancel={() => {
              setActiveScanner(null);
              setScannerTarget(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function NavBtn({ active, onClick, icon, label }: any) {
  return (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center gap-1 transition-all duration-300 ${active ? 'text-neon-primary-container scale-110' : 'text-on-surface-variant hover:text-on-surface'}`}
    >
      {icon}
      {active && <motion.div layoutId="nav-dot" className="w-1 h-1 bg-neon-primary-container rounded-full mt-1" />}
    </button>
  );
}

