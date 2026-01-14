import { useState } from 'react';
import { StudentNavbar } from '@/components/StudentNavbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { subjectData, type StreamData, type Subject } from '@/data/subjects';
import { searchYouTubeVideos, getEmbedUrl, getVideosFromChannel, type YouTubeVideo } from '@/services/youtube';
import { recordActivity } from '@/services/activityTracker';
import { Input } from '@/components/ui/input';
import { Loader2, Play, ArrowLeft, BookOpen, Search, Info, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

type ViewState = 'stream' | 'year' | 'semester' | 'subject' | 'videos';

export default function StudentLearning() {
  const [selectedStream, setSelectedStream] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedSemester, setSelectedSemester] = useState<number | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [currentView, setCurrentView] = useState<ViewState>('stream');
  const [videos, setVideos] = useState<YouTubeVideo[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<YouTubeVideo | null>(null);
  const [isVideoDialogOpen, setIsVideoDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<YouTubeVideo[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const streamData = selectedStream ? subjectData[selectedStream] : null;
  const yearData = streamData && selectedYear
    ? streamData.years.find(y => y.year === selectedYear)
    : null;
  const semesterData = yearData && selectedSemester
    ? yearData.semesters.find(s => s.number === selectedSemester)
    : null;

  const handleStreamSelect = (stream: string) => {
    setSelectedStream(stream);
    setSelectedYear(null);
    setSelectedSemester(null);
    setSelectedSubject(null);
    setVideos([]);
    setCurrentView('year');
  };

  const handleYearSelect = (year: number) => {
    setSelectedYear(year);
    setSelectedSemester(null);
    setSelectedSubject(null);
    setVideos([]);
    setCurrentView('semester');
  };

  const handleSemesterSelect = (semester: number) => {
    setSelectedSemester(semester);
    setSelectedSubject(null);
    setVideos([]);
    setCurrentView('subject');
  };

  const handleSubjectSelect = async (subject: Subject) => {
    setSelectedSubject(subject);
    setLoading(true);
    setCurrentView('videos');
    setVideos([]); // Clear previous videos

    try {
      console.log(`Fetching YouTube videos for subject: ${subject.name}`);
      // Enhanced search: include stream, year, semester context for better results
      const searchQuery = `${streamData?.stream || ''} ${subject.name} ${selectedYear} year semester ${selectedSemester} tutorial lecture`;
      let fetchedVideos = await searchYouTubeVideos(searchQuery.trim(), 15);

      // If no videos found from search, try a simpler query
      if (!fetchedVideos || fetchedVideos.length === 0) {
        console.log(`No videos from enhanced query, trying simple subject search for ${subject.name}`);
        fetchedVideos = await searchYouTubeVideos(subject.name, 15);
      }

      // If still nothing, and developer provided a channel id (your own channel), fetch videos from your uploads playlist
      const YOUTUBE_CHANNEL_ID = import.meta.env.VITE_YOUTUBE_CHANNEL_ID as string | undefined;
      if ((!fetchedVideos || fetchedVideos.length === 0) && YOUTUBE_CHANNEL_ID) {
        console.log('Falling back to channel uploads playlist because search returned no results or quota may be limited');
        const channelVideos = await getVideosFromChannel(YOUTUBE_CHANNEL_ID, 15);
        if (channelVideos && channelVideos.length > 0) {
          setVideos(channelVideos);
          return;
        }
      }

      if (fetchedVideos && fetchedVideos.length > 0) {
        console.log(`Successfully fetched ${fetchedVideos.length} videos for ${subject.name}`);
        setVideos(fetchedVideos);
      } else {
        setVideos([]);
      }
    } catch (error: unknown) {
      console.error('Error fetching videos:', error);

      // Normalize error message
      let msg = '';
      if (typeof error === 'string') msg = error;
      else if (error && typeof error === 'object' && 'message' in error) msg = String((error as { message?: unknown }).message ?? '');
      else msg = String(error);

      // If quota exceeded, try to fallback to channel uploads if configured
      const YOUTUBE_CHANNEL_ID = import.meta.env.VITE_YOUTUBE_CHANNEL_ID as string | undefined;
      if (msg.toLowerCase().includes('quota') && YOUTUBE_CHANNEL_ID) {
        console.log('Quota exceeded - falling back to channel uploads playlist');
        try {
          const channelVideos = await getVideosFromChannel(YOUTUBE_CHANNEL_ID, 15);
          setVideos(channelVideos);
        } catch (e) {
          console.error('Fallback to channel videos failed:', e);
          setVideos([]);
        }
      } else {
        setVideos([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVideoClick = (video: YouTubeVideo) => {
    recordActivity('video_watched', {
      videoId: video.id.videoId,
      title: video.snippet.title,
      subject: selectedSubject?.name
    });
    window.dispatchEvent(new CustomEvent('activity-updated'));
    setSelectedVideo(video);
    setIsVideoDialogOpen(true);
  };

  const handleBack = () => {
    if (currentView === 'videos') {
      setCurrentView('subject');
      setVideos([]);
      setSelectedSubject(null);
    } else if (currentView === 'subject') {
      setCurrentView('semester');
      setSelectedSemester(null);
    } else if (currentView === 'semester') {
      setCurrentView('year');
      setSelectedYear(null);
    } else if (currentView === 'year') {
      setCurrentView('stream');
      setSelectedStream(null);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const results = await searchYouTubeVideos(searchQuery + ' engineering tutorial', 12);
      setSearchResults(results);
    } catch (error) {
      console.error('Search failed:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const renderSearchSection = () => (
    <div className="space-y-6 mt-12 pt-8 border-t">
      <div>
        <h2 className="text-2xl font-bold mb-2">Explore Learning Videos</h2>
        <p className="text-muted-foreground">Search for specific topics, tutorials, or lectures</p>
      </div>

      <div className="flex flex-col md:flex-row md:items-center gap-4 w-full">
        <form onSubmit={handleSearch} className="flex gap-2 w-full flex-1">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search for topics (e.g., 'Thermodynamics', 'Calculus')..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={isSearching}>
            {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Search'}
          </Button>
          {(searchQuery || searchResults.length > 0) && (
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => {
                setSearchQuery('');
                setSearchResults([]);
              }}
              title="Clear search"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </form>
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 px-3 py-2 rounded-md border max-w-sm">
          <Info className="h-4 w-4 flex-shrink-0 text-primary" />
          <p>
            Smart Filter: We strictly show only educational videos, even if you search for unrelated topics.
          </p>
        </div>
      </div>

      {searchResults.length > 0 && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
          {searchResults.map((video) => (
            <Card key={video.id.videoId} className="overflow-hidden hover:shadow-lg transition-shadow">
              <div className="relative aspect-video bg-muted cursor-pointer group" onClick={() => handleVideoClick(video)}>
                <img
                  src={video.snippet.thumbnails.high?.url || video.snippet.thumbnails.medium.url}
                  alt={video.snippet.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Play className="h-12 w-12 text-white" />
                </div>
              </div>
              <CardHeader className="p-4">
                <CardTitle className="text-sm line-clamp-2 hover:text-primary transition-colors">
                  {video.snippet.title}
                </CardTitle>
                <CardDescription className="text-xs mt-1">
                  {video.snippet.channelTitle}
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  const renderStreamSelection = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Select Your Stream</h2>
        <p className="text-muted-foreground">Choose your engineering branch to continue</p>
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Object.keys(subjectData).map((stream) => (
          <Card
            key={stream}
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => handleStreamSelect(stream)}
          >
            <CardHeader>
              <CardTitle className="text-xl">{stream}</CardTitle>
              <CardDescription>
                {stream === 'CSE' && 'Computer Science & Engineering'}
                {stream === 'ECE' && 'Electronics & Communication Engineering'}
                {stream === 'Civil' && 'Civil Engineering'}
                {stream === 'Mechanical' && 'Mechanical Engineering'}
              </CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  );

  const renderYearSelection = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">{streamData?.stream}</h2>
        <p className="text-muted-foreground">Select Year</p>
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        {streamData?.years.map((year) => (
          <Card
            key={year.year}
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => handleYearSelect(year.year)}
          >
            <CardHeader>
              <CardTitle className="text-3xl font-bold">{year.year}</CardTitle>
              <CardDescription>Year {year.year}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  );

  const renderSemesterSelection = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">
          {streamData?.stream} - Year {selectedYear}
        </h2>
        <p className="text-muted-foreground">Select Semester</p>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        {yearData?.semesters.map((semester) => (
          <Card
            key={semester.number}
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => handleSemesterSelect(semester.number)}
          >
            <CardHeader>
              <CardTitle className="text-2xl font-bold">Semester {semester.number}</CardTitle>
              <CardDescription>
                {semester.subjects.length} subjects available
              </CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  );

  const renderSubjectSelection = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">
          {streamData?.stream} - Year {selectedYear} - Semester {selectedSemester}
        </h2>
        <p className="text-muted-foreground">Select a subject to view videos</p>
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {semesterData?.subjects.map((subject, index) => (
          <Card
            key={index}
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => handleSubjectSelect(subject)}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                {subject.name}
              </CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  );

  const renderVideos = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">{selectedSubject?.name}</h2>
        <p className="text-muted-foreground">
          Curated YouTube videos for {selectedSubject?.name} - {streamData?.stream} Year {selectedYear} Semester {selectedSemester}
        </p>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
          <span className="text-muted-foreground">Fetching videos from YouTube...</span>
          <span className="text-xs text-muted-foreground mt-1">This may take a few seconds</span>
        </div>
      ) : videos.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Play className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground mb-4">
              {import.meta.env.VITE_YOUTUBE_API_KEY
                ? "We couldn't find any videos for this subject. This might be due to a daily quota limit on the YouTube API."
                : "YouTube API key is missing. Please check your .env configuration."}
            </p>
            <Button
              variant="outline"
              className="mt-2"
              onClick={() => selectedSubject && handleSubjectSelect(selectedSubject)}
            >
              Retry Search
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Found {videos.length} educational videos
            </p>
            <Badge variant="secondary">
              {streamData?.stream} - Sem {selectedSemester}
            </Badge>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {videos.map((video) => (
              <Card key={video.id.videoId} className="overflow-hidden hover:shadow-lg transition-shadow">
                <div className="relative aspect-video bg-muted cursor-pointer group">
                  <img
                    src={video.snippet.thumbnails.high?.url || video.snippet.thumbnails.medium.url}
                    alt={video.snippet.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Play className="h-12 w-12 text-white" />
                  </div>
                </div>
                <CardHeader>
                  <CardTitle className="text-base line-clamp-2 hover:text-primary transition-colors">
                    {video.snippet.title}
                  </CardTitle>
                  <CardDescription className="flex items-center gap-2 mt-2">
                    <Badge variant="secondary" className="text-xs">
                      {video.snippet.channelTitle}
                    </Badge>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    className="w-full"
                    onClick={() => handleVideoClick(video)}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Watch Video
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <StudentNavbar />

      <main className="container mx-auto px-4 py-8">
        {/* Breadcrumb Navigation */}
        {currentView !== 'stream' && (
          <div className="mb-6">
            <Button
              variant="ghost"
              onClick={handleBack}
              className="mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Learning</span>
              {selectedStream && (
                <>
                  <span>/</span>
                  <span>{selectedStream}</span>
                </>
              )}
              {selectedYear && (
                <>
                  <span>/</span>
                  <span>Year {selectedYear}</span>
                </>
              )}
              {selectedSemester && (
                <>
                  <span>/</span>
                  <span>Semester {selectedSemester}</span>
                </>
              )}
              {selectedSubject && (
                <>
                  <span>/</span>
                  <span>{selectedSubject.name}</span>
                </>
              )}
            </div>
          </div>
        )}

        {/* Content based on current view */}
        {currentView === 'stream' && (
          <>
            {renderStreamSelection()}
            {renderSearchSection()}
          </>
        )}
        {currentView === 'year' && renderYearSelection()}
        {currentView === 'semester' && renderSemesterSelection()}
        {currentView === 'subject' && renderSubjectSelection()}
        {currentView === 'videos' && renderVideos()}

        {/* Video Player Dialog */}
        <Dialog open={isVideoDialogOpen} onOpenChange={setIsVideoDialogOpen}>
          <DialogContent className="max-w-5xl">
            <DialogHeader>
              <DialogTitle>{selectedVideo?.snippet.title}</DialogTitle>
            </DialogHeader>
            {selectedVideo && (
              <div className="aspect-video w-full">
                <iframe
                  src={getEmbedUrl(selectedVideo.id.videoId)}
                  title={selectedVideo.snippet.title}
                  className="w-full h-full rounded-lg"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            )}
            {selectedVideo && (
              <div className="mt-4">
                <p className="text-sm text-muted-foreground mb-2">
                  <strong>Channel:</strong> {selectedVideo.snippet.channelTitle}
                </p>
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {selectedVideo.snippet.description}
                </p>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}

