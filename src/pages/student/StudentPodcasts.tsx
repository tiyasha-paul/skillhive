import { useState, useEffect } from 'react';
import { StudentNavbar } from '@/components/StudentNavbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { podcastSections, type PodcastSection } from '@/data/podcasts';
import { searchYouTubeVideos, extractVideoId, getVideoById, type YouTubeVideo } from '@/services/youtube';
import { Loader2, Play, Headphones, Link2, X, Heart, Clock, Trash2 } from 'lucide-react';
import { PodcastPlayer } from '@/components/PodcastPlayer';
import { toast } from 'sonner';
import { getFavorites, removeFavorite, getLastPlayed } from '@/services/podcastStorage';

export default function StudentPodcasts() {
  const [selectedSection, setSelectedSection] = useState<PodcastSection | null>(null);
  const [episodes, setEpisodes] = useState<YouTubeVideo[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentEpisode, setCurrentEpisode] = useState<YouTubeVideo | null>(null);
  const [isPlayerOpen, setIsPlayerOpen] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [loadingUrl, setLoadingUrl] = useState(false);
  const [favorites, setFavorites] = useState(getFavorites());
  const [lastPlayed, setLastPlayed] = useState(getLastPlayed());

  // Refresh favorites and last played when player closes
  useEffect(() => {
    if (!isPlayerOpen) {
      setFavorites(getFavorites());
      setLastPlayed(getLastPlayed());
    }
  }, [isPlayerOpen]);

  const handleSectionSelect = async (section: PodcastSection) => {
    setSelectedSection(section);
    setLoading(true);
    setEpisodes([]);

    try {
      // Fetch videos for each keyword and combine results
      const allEpisodes: YouTubeVideo[] = [];

      // Limit to first 3 keywords to avoid API quota issues
      const keywordsToSearch = section.keywords.slice(0, 3);

      for (const keyword of keywordsToSearch) {
        const videos = await searchYouTubeVideos(keyword, 5);
        allEpisodes.push(...videos);
      }

      // Remove duplicates based on video ID
      const uniqueEpisodes = allEpisodes.filter(
        (episode, index, self) =>
          index === self.findIndex((e) => e.id.videoId === episode.id.videoId)
      );

      setEpisodes(uniqueEpisodes.slice(0, 15)); // Limit to 15 episodes per section
    } catch (error) {
      console.error('Error fetching podcast episodes:', error);
      setEpisodes([]);
    } finally {
      setLoading(false);
    }
  };

  const handleEpisodePlay = (episode: YouTubeVideo) => {
    setCurrentEpisode(episode);
    setIsPlayerOpen(true);
  };

  const handlePlayerClose = () => {
    setIsPlayerOpen(false);
    setCurrentEpisode(null);
  };

  // Handle pasting a YouTube URL and converting to podcast
  const handleUrlSubmit = async () => {
    if (!youtubeUrl.trim()) {
      toast.error('Please enter a YouTube URL');
      return;
    }

    const videoId = extractVideoId(youtubeUrl.trim());
    if (!videoId) {
      toast.error('Invalid YouTube URL', {
        description: 'Please enter a valid YouTube video link',
      });
      return;
    }

    setLoadingUrl(true);
    try {
      const video = await getVideoById(videoId);
      if (video) {
        setCurrentEpisode(video);
        setIsPlayerOpen(true);
        setYoutubeUrl('');
        toast.success('Playing as podcast!', {
          description: video.snippet.title.slice(0, 50) + '...',
        });
      } else {
        toast.error('Video not found', {
          description: 'Could not find a video with that URL',
        });
      }
    } catch (error) {
      console.error('Error fetching video:', error);
      toast.error('Failed to load video');
    } finally {
      setLoadingUrl(false);
    }
  };

  // Use consistent blue color scheme for all cards (matching Coding Interview Prep style)
  const getColorClasses = () => {
    return 'bg-card border-border hover:shadow-md';
  };

  return (
    <div className="min-h-screen bg-background pb-32">
      <StudentNavbar />

      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
            <Headphones className="h-8 w-8" />
            Podcasts
          </h1>
          <p className="text-muted-foreground">
            Listen to educational content converted to audio-only format
          </p>
        </div>

        {/* Main Content - Only show when no section is selected */}
        {!selectedSection && (
          <>
            {/* Continue Listening Section */}
            {lastPlayed && lastPlayed.progress.currentTime > 0 && (
              <Card className="mb-6">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    Continue Listening
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-4">
                    <img
                      src={lastPlayed.episode.thumbnail}
                      alt={lastPlayed.episode.title}
                      className="w-20 h-12 object-cover rounded"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm line-clamp-1">{lastPlayed.episode.title}</p>
                      <p className="text-xs text-muted-foreground">{lastPlayed.episode.channelTitle}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-600 rounded-full"
                            style={{ width: `${Math.round((lastPlayed.progress.currentTime / lastPlayed.progress.duration) * 100)}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {Math.round((lastPlayed.progress.currentTime / lastPlayed.progress.duration) * 100)}%
                        </span>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={async () => {
                        const video = await getVideoById(lastPlayed.episode.videoId);
                        if (video) {
                          setCurrentEpisode(video);
                          setIsPlayerOpen(true);
                        }
                      }}
                    >
                      <Play className="h-4 w-4 mr-1" />
                      Resume
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Favorites Section */}
            {favorites.length > 0 && (
              <div className="mb-8">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <Heart className="h-5 w-5 text-red-500 fill-red-500" />
                  Favorites
                </h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {favorites.slice(0, 4).map((fav) => (
                    <Card key={fav.videoId} className="overflow-hidden group">
                      <div className="relative aspect-video bg-muted">
                        <img
                          src={fav.thumbnail}
                          alt={fav.title}
                          className="w-full h-full object-cover"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute top-1 right-1 h-7 w-7 bg-black/50 hover:bg-black/70 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFavorite(fav.videoId);
                            setFavorites(getFavorites());
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute inset-0 m-auto h-12 w-12 bg-black/50 hover:bg-black/70 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={async () => {
                            const video = await getVideoById(fav.videoId);
                            if (video) {
                              setCurrentEpisode(video);
                              setIsPlayerOpen(true);
                            }
                          }}
                        >
                          <Play className="h-6 w-6" />
                        </Button>
                      </div>
                      <CardContent className="p-3">
                        <p className="font-medium text-sm line-clamp-2">{fav.title}</p>
                        <p className="text-xs text-muted-foreground mt-1">{fav.channelTitle}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Paste YouTube URL Section */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-4">
                Convert Any YouTube Video to Podcast
              </h2>
              <Card className="border-dashed border-2">
                <CardHeader className="pb-3">
                  <CardDescription>
                    Paste a YouTube link below to listen to it in audio-only format
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-3">
                    <div className="relative flex-1">
                      <Input
                        placeholder="Paste YouTube URL here (e.g., https://youtube.com/watch?v=...)"
                        value={youtubeUrl}
                        onChange={(e) => setYoutubeUrl(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleUrlSubmit()}
                        className="pr-10"
                      />
                      {youtubeUrl && (
                        <button
                          onClick={() => setYoutubeUrl('')}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    <Button
                      onClick={handleUrlSubmit}
                      disabled={loadingUrl || !youtubeUrl.trim()}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {loadingUrl ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Loading...
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4 mr-2" />
                          Convert & Play
                        </>
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Supports: youtube.com, youtu.be, YouTube Shorts
                  </p>
                </CardContent>
              </Card>
            </div>
          </>
        )}

        {/* Podcast Sections Grid */}
        {!selectedSection && (
          <div className="space-y-4 mb-8">
            <h2 className="text-2xl font-bold">General Topics</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {podcastSections.map((section) => (
                <Card
                  key={section.id}
                  className={`cursor-pointer transition-all ${getColorClasses()}`}
                  onClick={() => handleSectionSelect(section)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg">{section.title}</CardTitle>
                      <Badge variant="outline">{section.id.split('-')[0]}</Badge>
                    </div>
                    <CardDescription className="mt-2">
                      {section.description}
                    </CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Episodes List */}
        {selectedSection && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold mb-2">{selectedSection.title}</h2>
                <p className="text-muted-foreground">{selectedSection.description}</p>
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedSection(null);
                  setEpisodes([]);
                }}
              >
                Back to Sections
              </Button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2 text-muted-foreground">Loading episodes...</span>
              </div>
            ) : episodes.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">
                    No episodes found. Please try again later.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {episodes.map((episode) => (
                  <Card key={episode.id.videoId} className="overflow-hidden">
                    <div className="relative aspect-video bg-muted">
                      <img
                        src={episode.snippet.thumbnails.medium.url}
                        alt={episode.snippet.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                        <div className="bg-white/20 backdrop-blur-sm rounded-full p-4">
                          <Play className="h-8 w-8 text-white fill-white" />
                        </div>
                      </div>
                      <Badge
                        className="absolute top-2 right-2 bg-black/70 text-white"
                        variant="secondary"
                      >
                        Audio Only
                      </Badge>
                    </div>
                    <CardHeader>
                      <CardTitle className="text-base line-clamp-2">
                        {episode.snippet.title}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-2 mt-2">
                        <Badge variant="secondary" className="text-xs">
                          {episode.snippet.channelTitle}
                        </Badge>
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                        {episode.snippet.description}
                      </p>
                      <Button
                        className="w-full"
                        onClick={() => handleEpisodePlay(episode)}
                      >
                        <Play className="h-4 w-4 mr-2" />
                        Play Episode
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Info Card */}
        {!selectedSection && (
          <Card className="mt-8 bg-accent/50">
            <CardHeader>
              <CardTitle>About Podcasts</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Our podcast section converts educational YouTube videos into audio-only format,
                allowing you to learn on the go. Each episode is automatically processed to extract
                the audio stream for distraction-free learning.
              </p>
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div>
                  <h4 className="font-semibold mb-2">Features:</h4>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>• Audio-only playback</li>
                    <li>• Speed control (0.5x - 2x)</li>
                    <li>• Background playback</li>
                    <li>• Progress tracking</li>
                    <li>• Favorite episodes</li>
                    <li>• Continue listening</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Coming Soon:</h4>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>• Offline downloads</li>
                    <li>• Playlist creation</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Podcast Player */}
      {isPlayerOpen && currentEpisode && (
        <PodcastPlayer episode={currentEpisode} onClose={handlePlayerClose} />
      )}
    </div>
  );
}

