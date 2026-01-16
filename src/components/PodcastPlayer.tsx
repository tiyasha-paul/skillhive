import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, Loader2, AlertCircle, Heart } from 'lucide-react';
import type { YouTubeVideo } from '@/services/youtube';
import { isFavorite, toggleFavorite, getProgress, saveLastPlayed } from '@/services/podcastStorage';

const AUDIO_SERVER_URL = import.meta.env.VITE_AUDIO_SERVER_URL || 'http://localhost:3001';

interface PodcastPlayerProps {
  episode: YouTubeVideo | null;
  onClose: () => void;
}

export function PodcastPlayer({ episode, onClose }: PodcastPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isFav, setIsFav] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (episode) {
      // Reset player when episode changes
      setIsPlaying(false);
      setError(null);
      setIsLoading(true);

      // Check if favorited
      setIsFav(isFavorite(episode.id.videoId));

      // Restore saved progress
      const savedProgress = getProgress(episode.id.videoId);
      if (savedProgress && savedProgress.currentTime > 0) {
        setCurrentTime(savedProgress.currentTime);
      } else {
        setCurrentTime(0);
      }

      // Fetch audio URL from backend
      fetchAudioUrl(episode.id.videoId);
    }
  }, [episode]);

  const fetchAudioUrl = async (videoId: string) => {
    try {
      console.log('Connecting to audio server:', AUDIO_SERVER_URL);
      // Use the direct URL endpoint for better seeking support
      const response = await fetch(`${AUDIO_SERVER_URL}/api/audio/url/${videoId}`);

      if (!response.ok) {
        throw new Error('Failed to get audio URL');
      }

      setAudioUrl(data.audioUrl);
    } catch (err) {
      console.error('Error fetching audio:', err);
      // Fallback to streaming endpoint
      setAudioUrl(`${AUDIO_SERVER_URL}/api/audio/stream/${videoId}`);
    }
  };

  const handlePlayPause = async () => {
    if (!audioRef.current || !audioUrl) return;

    try {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        await audioRef.current.play();
      }
    } catch (err) {
      console.error('Playback error:', err);
      setError('Failed to play audio. Make sure the audio server is running.');
    }
  };

  const handleSeek = (value: number[]) => {
    const newTime = value[0];
    setCurrentTime(newTime);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
  };

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0];
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
  };

  const handleSkip = (seconds: number) => {
    if (audioRef.current) {
      const newTime = Math.max(0, Math.min(duration, audioRef.current.currentTime + seconds));
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!episode) return null;

  return (
    <Card className="fixed bottom-0 left-0 right-0 z-50 rounded-t-lg border-t-2 shadow-lg">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-sm line-clamp-1">{episode.snippet.title}</CardTitle>
            <p className="text-xs text-muted-foreground">{episode.snippet.channelTitle}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              const newFav = toggleFavorite(episode);
              setIsFav(newFav);
            }}
            className="h-8 w-8 shrink-0 ml-2"
            title={isFav ? "Remove from favorites" : "Add to favorites"}
          >
            <Heart className={`h-4 w-4 ${isFav ? 'fill-red-500 text-red-500' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Audio element */}
        <audio
          ref={audioRef}
          src={audioUrl || undefined}
          preload="auto"
          onTimeUpdate={(e) => {
            const audio = e.currentTarget;
            setCurrentTime(audio.currentTime);
          }}
          onLoadedMetadata={(e) => {
            const audio = e.currentTarget;
            setDuration(audio.duration);
            setIsLoading(false);

            // Seek to saved position if available
            const savedProgress = getProgress(episode.id.videoId);
            if (savedProgress && savedProgress.currentTime > 10 && savedProgress.currentTime < audio.duration - 10) {
              audio.currentTime = savedProgress.currentTime;
              setCurrentTime(savedProgress.currentTime);
            }
          }}
          onPlay={() => setIsPlaying(true)}
          onPause={() => {
            setIsPlaying(false);
            // Save progress when paused
            if (episode && audioRef.current) {
              saveLastPlayed(episode, audioRef.current.currentTime, audioRef.current.duration || duration);
            }
          }}
          onEnded={() => {
            setIsPlaying(false);
            // Clear progress when completed
            if (episode) {
              saveLastPlayed(episode, 0, duration);
            }
          }}
          onError={(e) => {
            console.error('Audio error:', e);
            setError('Failed to load audio. Make sure the audio server is running (npm run server:audio).');
            setIsLoading(false);
          }}
          onWaiting={() => setIsLoading(true)}
          onCanPlay={() => setIsLoading(false)}
          onCanPlayThrough={() => setIsLoading(false)}
          className="hidden"
        />

        {/* Progress Bar */}
        <div className="space-y-2">
          <Slider
            value={[currentTime]}
            max={duration || 100}
            step={1}
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
              variant="ghost"
              size="icon"
              onClick={handlePlayPause}
              disabled={isLoading || !audioUrl}
              className="h-10 w-10"
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : isPlaying ? (
                <Pause className="h-5 w-5" />
              ) : (
                <Play className="h-5 w-5" />
              )}
            </Button>

            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleSkip(-10)}
                disabled={!audioUrl}
                className="h-8 w-8"
              >
                <SkipBack className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleSkip(10)}
                disabled={!audioUrl}
                className="h-8 w-8"
              >
                <SkipForward className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Playback Speed */}
          <div className="flex items-center gap-2">
            <select
              value={playbackRate}
              onChange={(e) => {
                const rate = parseFloat(e.target.value);
                setPlaybackRate(rate);
                if (audioRef.current) {
                  audioRef.current.playbackRate = rate;
                }
              }}
              className="text-xs border rounded px-2 py-1 bg-background"
            >
              <option value="0.5">0.5x</option>
              <option value="0.75">0.75x</option>
              <option value="1">1x</option>
              <option value="1.25">1.25x</option>
              <option value="1.5">1.5x</option>
              <option value="2">2x</option>
            </select>
          </div>

          {/* Volume */}
          <div className="flex items-center gap-2 w-32">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setIsMuted(!isMuted);
                if (audioRef.current) {
                  audioRef.current.muted = !isMuted;
                }
              }}
              className="h-8 w-8"
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="h-4 w-4" />
              ) : (
                <Volume2 className="h-4 w-4" />
              )}
            </Button>
            <Slider
              value={[isMuted ? 0 : volume]}
              max={1}
              step={0.01}
              onValueChange={handleVolumeChange}
              className="flex-1"
            />
          </div>

          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>

        {/* Error/Status display */}
        {error && (
          <div className="flex items-center gap-2 text-xs text-destructive pt-2 border-t">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        )}
        {isLoading && !error && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Loading audio...</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
