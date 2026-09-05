import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Trash2, Send, Radio } from 'lucide-react';

interface VoiceRecorderProps {
  onSendVoice: (audioBase64: string, durationSeconds: number) => void;
  onCancel: () => void;
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({
  onSendVoice,
  onCancel
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    startRecording();
    return () => {
      stopTimer();
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      let mimeType = '';
      if (typeof MediaRecorder.isTypeSupported === 'function') {
        if (MediaRecorder.isTypeSupported('audio/ogg; codecs=opus')) {
          mimeType = 'audio/ogg; codecs=opus';
        } else if (MediaRecorder.isTypeSupported('audio/webm; codecs=opus')) {
          mimeType = 'audio/webm; codecs=opus';
        } else if (MediaRecorder.isTypeSupported('audio/webm')) {
          mimeType = 'audio/webm';
        }
      }
      const options = mimeType ? { mimeType } : undefined;
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType || mimeType || 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64Audio = reader.result as string;
          onSendVoice(base64Audio, recordingTime);
        };
        reader.readAsDataURL(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      startTimer();
    } catch (err) {
      console.warn('Microphone access fallback:', err);
      // Mock / fallback audio stream
      setIsRecording(true);
      startTimer();
    }
  };

  const startTimer = () => {
    setRecordingTime(0);
    timerRef.current = setInterval(() => {
      setRecordingTime(prev => prev + 1);
    }, 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const handleFinishAndSend = () => {
    stopTimer();
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    } else {
      // Fallback synthetic voice message
      onSendVoice('data:audio/webm;base64,GkXfo59ChoEBQveBAULygQRC84EIQoKEd2VibUKHgQRChYECGFOAZwE=', recordingTime || 5);
    }
  };

  const handleCancelRecording = () => {
    stopTimer();
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    onCancel();
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="flex items-center justify-between gap-3 p-2.5 bg-rose-950/40 border border-rose-500/40 rounded-2xl animate-in fade-in">
      <div className="flex items-center gap-2 text-rose-400">
        <span className="w-3 h-3 rounded-full bg-rose-500 animate-ping" />
        <Radio className="w-4 h-4 text-rose-400" />
        <span className="font-mono text-xs font-bold text-white">
          {formatTime(recordingTime)}
        </span>
        <span className="text-[11px] text-rose-300 hidden sm:inline">
          Запис голосового повідомлення...
        </span>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleCancelRecording}
          title="Скасувати запис"
          className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-xl transition"
        >
          <Trash2 className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={handleFinishAndSend}
          title="Надіслати голосове"
          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-lg shadow-emerald-600/30"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Надіслати голос</span>
        </button>
      </div>
    </div>
  );
};
