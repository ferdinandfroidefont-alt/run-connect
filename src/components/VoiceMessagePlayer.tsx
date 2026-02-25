import { useState, useRef, useCallback, useEffect } from 'react';
import { Play, Pause, AlertCircle } from 'lucide-react';

interface VoiceMessagePlayerProps {
  src: string;
  isMine?: boolean;
}

export const VoiceMessagePlayer = ({ src, isMine }: VoiceMessagePlayerProps) => {
  const [status, setStatus] = useState<'idle' | 'loading' | 'playing' | 'paused' | 'error' | 'unsupported'>('idle');
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const animRef = useRef<number | null>(null);

  const cleanup = useCallback(() => {
    if (animRef.current) {
      cancelAnimationFrame(animRef.current);
      animRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      cleanup();
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current = null;
      }
    };
  }, [cleanup]);

  const updateProgress = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (audio.duration && isFinite(audio.duration)) {
      setProgress(audio.currentTime / audio.duration);
      setDuration(audio.duration);
    }

    if (!audio.paused && !audio.ended) {
      animRef.current = requestAnimationFrame(updateProgress);
    }
  }, []);

  const isWebmFile = /\.webm(\?|$)/i.test(src);

  const handlePlay = useCallback(async () => {
    try {
      if (status === 'playing' && audioRef.current) {
        audioRef.current.pause();
        setStatus('paused');
        cleanup();
        return;
      }

      if (status === 'paused' && audioRef.current) {
        await audioRef.current.play();
        setStatus('playing');
        animRef.current = requestAnimationFrame(updateProgress);
        return;
      }

      setStatus('loading');

      const audio = new Audio();
      audioRef.current = audio;
      audio.preload = 'auto';

      const canPlayWebm =
        audio.canPlayType('audio/webm;codecs=opus') !== '' ||
        audio.canPlayType('audio/webm') !== '';

      if (isWebmFile && !canPlayWebm) {
        console.warn('⚠️ Format webm non supporté sur cet appareil');
        setStatus('unsupported');
        return;
      }

      audio.onloadedmetadata = () => {
        if (isFinite(audio.duration)) {
          setDuration(audio.duration);
        }
      };

      audio.onended = () => {
        setStatus('idle');
        setProgress(0);
        cleanup();
      };

      audio.onerror = (e) => {
        console.error('❌ Audio playback error:', e, audio.error);
        setStatus('error');
        cleanup();
      };

      // IMPORTANT: source + play directly in user gesture context (no pre-fetch)
      audio.src = src;
      await audio.play();

      setStatus('playing');
      animRef.current = requestAnimationFrame(updateProgress);
    } catch (error) {
      console.error('❌ Voice message play failed:', error);
      setStatus('error');
      cleanup();
    }
  }, [status, src, isWebmFile, cleanup, updateProgress]);

  const formatTime = (seconds: number) => {
    if (!seconds || !isFinite(seconds)) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const currentTime = audioRef.current?.currentTime || 0;

  return (
    <button
      onClick={handlePlay}
      className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-background/30 backdrop-blur-sm border border-border/20 shadow-md min-w-[140px]"
    >
      {status === 'unsupported' ? (
        <>
          <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
          <span className="text-xs text-destructive">Format non supporté (.webm)</span>
        </>
      ) : status === 'error' ? (
        <>
          <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
          <span className="text-xs text-destructive">Erreur audio</span>
        </>
      ) : status === 'loading' ? (
        <>
          <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin flex-shrink-0" />
          <span className="text-xs opacity-70">Chargement...</span>
        </>
      ) : (
        <>
          {status === 'playing' ? (
            <Pause className="h-4 w-4 text-primary flex-shrink-0" />
          ) : (
            <Play className="h-4 w-4 text-primary flex-shrink-0" />
          )}
          
          {/* Progress bar */}
          <div className="flex-1 h-1 bg-muted/50 rounded-full overflow-hidden min-w-[60px]">
            <div
              className="h-full bg-primary rounded-full transition-none"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
          
          <span className="text-[10px] tabular-nums opacity-70 flex-shrink-0">
            {status === 'playing' || status === 'paused'
              ? formatTime(currentTime)
              : duration > 0
              ? formatTime(duration)
              : '0:00'}
          </span>
        </>
      )}
    </button>
  );
};
