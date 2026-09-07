import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, Mic, Sparkles, Loader2, Copy, Check } from 'lucide-react';
import { api } from '../../services/api';

interface AudioMessagePlayerProps {
  audioUrl: string;
  duration?: number;
  transcription?: string;
  isOutgoing?: boolean;
}

export const AudioMessagePlayer: React.FC<AudioMessagePlayerProps> = ({
  audioUrl,
  duration = 12,
  transcription,
  isOutgoing = false
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [localTranscription, setLocalTranscription] = useState(transcription || '');
  const [showTranscription, setShowTranscription] = useState(Boolean(transcription));
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (transcription) {
      setLocalTranscription(transcription);
      setShowTranscription(true);
    }
  }, [transcription]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(console.warn);
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const togglePlaybackRate = () => {
    const nextRate = playbackRate === 1 ? 1.5 : playbackRate === 1.5 ? 2 : 1;
    setPlaybackRate(nextRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextRate;
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleTranscribe = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isTranscribing) return;
    setIsTranscribing(true);
    try {
      const res = await api.post('/ai/transcribe-audio', { mediaUrl: audioUrl });
      if (res.data?.text) {
        setLocalTranscription(res.data.text);
        setShowTranscription(true);
      }
    } catch (err) {
      console.error('Audio transcription error:', err);
      setLocalTranscription('Не вдалося розпізнати аудіо або відсутнє підключення до ШІ-серверу.');
      setShowTranscription(true);
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleCopyText = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!localTranscription) return;
    navigator.clipboard.writeText(localTranscription);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className={`rounded-2xl p-3 space-y-2 ${
      isOutgoing 
        ? 'bg-blue-700/80 text-white border border-blue-400/30' 
        : 'bg-[#182238] text-slate-100 border border-slate-700/80'
    }`}>
      <audio
        ref={audioRef}
        src={audioUrl}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
      />

      <div className="flex items-center gap-3">
        {/* Play/Pause Button */}
        <button
          type="button"
          onClick={togglePlay}
          className={`w-9 h-9 rounded-full flex items-center justify-center transition shadow-md flex-shrink-0 ${
            isOutgoing 
              ? 'bg-white text-blue-700 hover:bg-slate-100' 
              : 'bg-emerald-500 text-white hover:bg-emerald-400'
          }`}
        >
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
        </button>

        {/* Animated Waveform Visualizer */}
        <div className="flex-1 flex items-center gap-1 h-6 cursor-pointer">
          {[40, 75, 30, 90, 60, 100, 45, 80, 50, 95, 35, 70, 85, 40, 65, 90, 55, 30, 70, 50].map((height, idx) => {
            const isBarActive = (idx / 20) <= (currentTime / (duration || 1));
            return (
              <span
                key={idx}
                style={{ height: `${height}%` }}
                className={`flex-1 rounded-full transition-all duration-150 ${
                  isBarActive 
                    ? (isOutgoing ? 'bg-white' : 'bg-emerald-400')
                    : (isOutgoing ? 'bg-blue-400/50' : 'bg-slate-600')
                } ${isPlaying ? 'animate-pulse' : ''}`}
              />
            );
          })}
        </div>

        {/* Speed Switcher (1x / 1.5x / 2x) */}
        <button
          type="button"
          onClick={togglePlaybackRate}
          className={`px-1.5 py-0.5 rounded-lg text-[10px] font-black font-mono transition ${
            isOutgoing ? 'bg-blue-800 text-white' : 'bg-slate-800 text-slate-300 hover:text-white'
          }`}
        >
          {playbackRate}x
        </button>
      </div>

      {/* Timer & AI Speech-to-Text Button */}
      <div className="flex items-center justify-between text-[10px] opacity-90 pt-0.5">
        <div className="flex items-center gap-1.5 font-mono">
          <Mic className="w-3 h-3 text-emerald-400" />
          <span>{formatTime(currentTime || 0)} / {formatTime(duration)}</span>
        </div>

        {localTranscription ? (
          <button
            type="button"
            onClick={() => setShowTranscription(!showTranscription)}
            className="flex items-center gap-1 text-[10px] font-bold text-amber-300 hover:underline transition"
          >
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>{showTranscription ? 'Сховати текст' : 'Текст голосу'}</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={handleTranscribe}
            disabled={isTranscribing}
            className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-400/30 font-bold transition text-[10px] active:scale-95 disabled:opacity-50"
            title="Розпізнати мову в текст за допомогою Gemini 2.5/3.x"
          >
            {isTranscribing ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin text-amber-300" />
                <span>Розпізнавання...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span>Розпізнати (ШІ)</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Auto-transcription box */}
      {showTranscription && localTranscription && (
        <div className="p-2.5 bg-black/40 rounded-xl text-[11px] leading-relaxed italic border border-white/10 text-slate-200 animate-in fade-in select-text cursor-text space-y-1.5">
          <div className="flex items-center justify-between not-italic">
            <span className="text-[10px] font-bold text-amber-400/90 uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              <span>ШІ-розпізнавання:</span>
            </span>
            <button
              type="button"
              onClick={handleCopyText}
              className="p-1 text-[10px] font-semibold text-slate-400 hover:text-white flex items-center gap-1 transition"
              title="Скопіювати текст"
            >
              {isCopied ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span className="text-emerald-400">Скопійовано!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Копіювати</span>
                </>
              )}
            </button>
          </div>
          <p className="font-normal text-slate-100">"{localTranscription}"</p>
        </div>
      )}
    </div>
  );
};
