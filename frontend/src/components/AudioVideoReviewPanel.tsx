import { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, RefreshCw, CheckCircle, Clock, AlertCircle, Download, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';

const BACKEND_URL = import.meta.env.REACT_APP_BACKEND_URL || import.meta.env.VITE_BACKEND_URL || '';

interface AudioReviewProps {
  audioUrl: string | null;
  moduleTitle: string;
  onRegenerate?: () => void;
  isGenerating?: boolean;
}

interface VideoReviewProps {
  videoId: string | null;
  moduleTitle: string;
  onRegenerate?: () => void;
  isGenerating?: boolean;
}

interface VideoStatus {
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'unknown';
  videoUrl: string | null;
  thumbnailUrl: string | null;
  duration: number | null;
  error: string | null;
}

export function AudioReviewPanel({ audioUrl, moduleTitle, onRegenerate, isGenerating }: AudioReviewProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleDurationChange = () => setDuration(audio.duration);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('durationchange', handleDurationChange);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('durationchange', handleDurationChange);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [audioUrl]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.play().catch(console.error);
    } else {
      audio.pause();
    }
  }, [isPlaying]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = isMuted ? 0 : volume;
  }, [volume, isMuted]);

  const handleSeek = (value: number[]) => {
    const newTime = value[0];
    setCurrentTime(newTime);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!audioUrl) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-8 text-center">
          <Volume2 className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground mb-4">
            Ingen röstinspelning genererad för {moduleTitle}
          </p>
          {onRegenerate && (
            <Button onClick={onRegenerate} disabled={isGenerating} size="sm">
              {isGenerating ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Genererar...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Generera röst
                </>
              )}
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Volume2 className="h-4 w-4 text-primary" />
              Röstinspelning
            </CardTitle>
            <CardDescription>{moduleTitle}</CardDescription>
          </div>
          <Badge variant="secondary" className="text-xs">
            <CheckCircle className="h-3 w-3 mr-1" />
            Klar
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <audio ref={audioRef} src={audioUrl} preload="metadata" />
        
        {/* Waveform placeholder / Progress */}
        <div className="space-y-2">
          <Slider
            value={[currentTime]}
            max={duration || 100}
            step={0.1}
            onValueChange={handleSeek}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="default"
              size="icon"
              onClick={() => setIsPlaying(!isPlaying)}
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMuted(!isMuted)}
            >
              {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </Button>
            <Slider
              value={[isMuted ? 0 : volume]}
              max={1}
              step={0.01}
              onValueChange={(v) => setVolume(v[0])}
              className="w-20"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const link = document.createElement('a');
                link.href = audioUrl;
                link.download = `${moduleTitle}-audio.mp3`;
                link.click();
              }}
            >
              <Download className="h-4 w-4 mr-1" />
              Ladda ner
            </Button>
            {onRegenerate && (
              <Button variant="ghost" size="sm" onClick={onRegenerate} disabled={isGenerating}>
                <RefreshCw className={`h-4 w-4 mr-1 ${isGenerating ? 'animate-spin' : ''}`} />
                Generera om
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function VideoReviewPanel({ videoId, moduleTitle, onRegenerate, isGenerating }: VideoReviewProps) {
  const [videoStatus, setVideoStatus] = useState<VideoStatus | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [pollCount, setPollCount] = useState(0);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const checkVideoStatus = async () => {
    if (!videoId) return;

    setIsChecking(true);
    try {
      // Use FastAPI backend instead of Supabase
      const response = await fetch(`${BACKEND_URL}/api/video/heygen/status/${videoId}`);
      
      if (!response.ok) throw new Error('Status check failed');
      const data = await response.json();

      // Ensure error is always a string, not an object
      const errorMessage = typeof data.error === 'string' 
        ? data.error 
        : (data.error?.message || data.error?.detail || null);
      
      setVideoStatus({
        status: data.status,
        videoUrl: data.video_url,
        thumbnailUrl: data.thumbnail_url,
        duration: data.duration,
        error: errorMessage,
      });

      // Stop polling if completed or failed
      if (data.status === 'completed' || data.status === 'failed') {
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
        if (data.status === 'completed') {
          toast.success('Video är klar!');
        } else if (data.status === 'failed') {
          toast.error('Videogenerering misslyckades: ' + (data.error || 'Okänt fel'));
        }
      }
    } catch (error) {
      console.error('Error checking video status:', error);
    } finally {
      setIsChecking(false);
    }
  };

  // Start polling when videoId changes
  useEffect(() => {
    if (!videoId) return;

    // Initial check
    checkVideoStatus();
    setPollCount(0);

    // Poll every 10 seconds for up to 5 minutes
    pollIntervalRef.current = setInterval(() => {
      setPollCount((prev) => {
        if (prev >= 30) { // 30 * 10s = 5 minutes
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
          }
          return prev;
        }
        checkVideoStatus();
        return prev + 1;
      });
    }, 10000);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [videoId]);

  if (!videoId) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-8 text-center">
          <Play className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground mb-4">
            Ingen HeyGen-video genererad för {moduleTitle}
          </p>
          {onRegenerate && (
            <Button onClick={onRegenerate} disabled={isGenerating} size="sm">
              {isGenerating ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Genererar...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Generera video
                </>
              )}
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  const getStatusBadge = () => {
    switch (videoStatus?.status) {
      case 'completed':
        return (
          <Badge variant="default" className="bg-green-500">
            <CheckCircle className="h-3 w-3 mr-1" />
            Klar
          </Badge>
        );
      case 'processing':
      case 'pending':
        return (
          <Badge variant="secondary">
            <Clock className="h-3 w-3 mr-1 animate-pulse" />
            Bearbetar...
          </Badge>
        );
      case 'failed':
        return (
          <Badge variant="destructive">
            <AlertCircle className="h-3 w-3 mr-1" />
            Misslyckades
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            <Clock className="h-3 w-3 mr-1" />
            Kontrollerar...
          </Badge>
        );
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Play className="h-4 w-4 text-primary" />
              HeyGen Video
            </CardTitle>
            <CardDescription>{moduleTitle}</CardDescription>
          </div>
          {getStatusBadge()}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Video preview or thumbnail */}
        {videoStatus?.status === 'completed' && videoStatus.videoUrl ? (
          <div className="space-y-4">
            <div className="aspect-video bg-muted rounded-lg overflow-hidden">
              <video
                src={videoStatus.videoUrl}
                controls
                className="w-full h-full"
                poster={videoStatus.thumbnailUrl || undefined}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                {videoStatus.duration && (
                  <span>Längd: {Math.floor(videoStatus.duration / 60)}:{(videoStatus.duration % 60).toString().padStart(2, '0')}</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(videoStatus.videoUrl!, '_blank')}
                >
                  <ExternalLink className="h-4 w-4 mr-1" />
                  Öppna
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = videoStatus.videoUrl!;
                    link.download = `${moduleTitle}-video.mp4`;
                    link.click();
                  }}
                >
                  <Download className="h-4 w-4 mr-1" />
                  Ladda ner
                </Button>
              </div>
            </div>
          </div>
        ) : videoStatus?.status === 'failed' ? (
          <div className="p-4 bg-destructive/10 rounded-lg text-center">
            <AlertCircle className="h-8 w-8 mx-auto text-destructive mb-2" />
            <p className="text-sm text-destructive mb-2">Videogenerering misslyckades</p>
            <p className="text-xs text-muted-foreground mb-4">{videoStatus.error}</p>
            {onRegenerate && (
              <Button onClick={onRegenerate} disabled={isGenerating} size="sm" variant="outline">
                <RefreshCw className="mr-2 h-4 w-4" />
                Försök igen
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {videoStatus?.thumbnailUrl ? (
              <div className="aspect-video bg-muted rounded-lg overflow-hidden relative">
                <img
                  src={videoStatus.thumbnailUrl}
                  alt="Video preview"
                  className="w-full h-full object-cover opacity-50"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="bg-background/80 rounded-full p-4">
                    <RefreshCw className="h-8 w-8 animate-spin text-primary" />
                  </div>
                </div>
              </div>
            ) : (
              <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <RefreshCw className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Genererar video...</p>
                </div>
              </div>
            )}
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Bearbetar video hos HeyGen</span>
                <span>Kontroll {pollCount}/30</span>
              </div>
              <Progress value={(pollCount / 30) * 100} className="h-1" />
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={checkVideoStatus}
              disabled={isChecking}
              className="w-full"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isChecking ? 'animate-spin' : ''}`} />
              Kontrollera status manuellt
            </Button>
          </div>
        )}

        <p className="text-xs text-muted-foreground text-center">
          Video-ID: <code className="bg-muted px-1 rounded">{videoId}</code>
        </p>
      </CardContent>
    </Card>
  );
}
