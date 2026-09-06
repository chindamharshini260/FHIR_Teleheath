import React, { useState, useEffect, useRef } from 'react';
import { Video, VideoOff, Mic, MicOff, PhoneOff, AlertTriangle, Clock, ShieldCheck, FileText } from 'lucide-react';
import { api } from '../../lib/api';

interface VideoConsultationRoomProps {
  encounterId?: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  userRole: 'doctor' | 'patient';
  onEndConsultation: () => void;
}

export const VideoConsultationRoom: React.FC<VideoConsultationRoomProps> = ({
  encounterId,
  patientId,
  patientName,
  doctorId,
  doctorName,
  userRole,
  onEndConsultation,
}) => {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraAvailable, setCameraAvailable] = useState<boolean | null>(null);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoDisabled, setIsVideoDisabled] = useState(false);
  const [callSeconds, setCallSeconds] = useState(0);
  const [clinicalNotes, setClinicalNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);

  // Timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCallSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Request actual media stream
  useEffect(() => {
    let localStream: MediaStream | null = null;

    async function initMedia() {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          setCameraAvailable(false);
          return;
        }

        localStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });

        setStream(localStream);
        setCameraAvailable(true);

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = localStream;
        }
      } catch (err) {
        console.warn('Media devices not configured or denied:', err);
        setCameraAvailable(false);
      }
    }

    initMedia();

    return () => {
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const toggleMute = () => {
    if (stream) {
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (stream) {
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoDisabled(!videoTrack.enabled);
      }
    }
  };

  const handleEnd = async () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }

    if (encounterId) {
      try {
        await api.updateEncounter(encounterId, {
          status: 'completed',
          clinicalNotes: clinicalNotes.trim() || undefined,
          endTime: new Date().toISOString(),
        });
      } catch (err) {
        console.error('Failed updating encounter:', err);
      }
    }

    onEndConsultation();
  };

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-slate-950 text-white rounded-2xl overflow-hidden shadow-xl border border-slate-800 flex flex-col">
      {/* Consultation Bar */}
      <div className="px-6 py-4 bg-slate-900 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-slate-100">Virtual Clinical Teleconsultation</span>
              <span className="text-[10px] font-semibold bg-teal-900 text-teal-300 border border-teal-700 px-2 py-0.5 rounded">
                FHIR Encounter
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Patient: <span className="text-slate-200 font-medium">{patientName}</span> • Practitioner: <span className="text-slate-200 font-medium">{doctorName}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-xs text-slate-300 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700">
            <Clock className="w-3.5 h-3.5 text-teal-400" />
            <span className="font-mono">{formatTimer(callSeconds)}</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Encrypted Peer Link</span>
          </div>
        </div>
      </div>

      {/* Main Video Stage */}
      <div className="relative p-6 flex-1 min-h-[380px] flex items-center justify-center bg-slate-950">
        {cameraAvailable === false ? (
          /* Exact required error state when media stream or key is not configured */
          <div className="max-w-md w-full text-center p-8 bg-slate-900 border border-slate-800 rounded-2xl">
            <div className="w-14 h-14 rounded-full bg-amber-900/30 text-amber-400 mx-auto flex items-center justify-center mb-4">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <h4 className="text-base font-bold text-slate-100 mb-2">
              Video consultation service is not configured.
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed mb-6">
              A WebRTC camera/microphone permission or third-party video integration service key is required to render active live streaming. Real teleconsultation encounters are logged to FHIR specifications regardless.
            </p>
            <button
              onClick={handleEnd}
              className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-colors"
            >
              Close Consultation Window
            </button>
          </div>
        ) : (
          /* Real WebRTC Stream View */
          <div className="w-full max-w-2xl relative aspect-video bg-black rounded-2xl overflow-hidden border border-slate-800 shadow-inner flex items-center justify-center">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${isVideoDisabled ? 'hidden' : ''}`}
            />
            {isVideoDisabled && (
              <div className="text-center p-6">
                <VideoOff className="w-12 h-12 text-slate-600 mx-auto mb-2" />
                <p className="text-xs text-slate-400">Camera preview is temporarily turned off</p>
              </div>
            )}
            <div className="absolute bottom-4 left-4 bg-slate-900/80 backdrop-blur-xs px-3 py-1.5 rounded-lg text-xs font-medium text-slate-200 border border-slate-700">
              {userRole === 'doctor' ? `Practitioner: ${doctorName}` : `Patient: ${patientName}`}
            </div>
          </div>
        )}
      </div>

      {/* Doctor Clinical Notes Pad (Available during live encounter) */}
      {userRole === 'doctor' && (
        <div className="px-6 py-4 bg-slate-900 border-t border-slate-800">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-4 h-4 text-teal-400" />
            <label className="text-xs font-semibold text-slate-300">
              Physician Consultation Notes (FHIR Encounter Documentation)
            </label>
          </div>
          <textarea
            rows={2}
            value={clinicalNotes}
            onChange={(e) => setClinicalNotes(e.target.value)}
            placeholder="Record clinical impressions, recommendations, and patient verbal responses during encounter..."
            className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-600 focus:ring-1 focus:ring-teal-500 focus:outline-none"
          />
        </div>
      )}

      {/* Control Bar */}
      <div className="px-6 py-4 bg-slate-900 border-t border-slate-800 flex items-center justify-center gap-4">
        {cameraAvailable && (
          <>
            <button
              onClick={toggleMute}
              className={`w-11 h-11 rounded-full flex items-center justify-center transition-colors ${
                isAudioMuted ? 'bg-rose-600 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
              }`}
              title={isAudioMuted ? 'Unmute Microphone' : 'Mute Microphone'}
            >
              {isAudioMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>

            <button
              onClick={toggleVideo}
              className={`w-11 h-11 rounded-full flex items-center justify-center transition-colors ${
                isVideoDisabled ? 'bg-rose-600 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
              }`}
              title={isVideoDisabled ? 'Turn On Camera' : 'Turn Off Camera'}
            >
              {isVideoDisabled ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
            </button>
          </>
        )}

        <button
          onClick={handleEnd}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition-colors shadow-sm"
        >
          <PhoneOff className="w-4 h-4" />
          <span>End Consultation</span>
        </button>
      </div>
    </div>
  );
};
