import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { searchYouTubeVideos, extractVideoId, getVideoById, type YouTubeVideo } from '@/services/youtube';
import { saveStudyNote } from '@/services/studyNotes';
import { Loader2, Search, ArrowLeft, Save, PlayCircle, Clock, X } from 'lucide-react';
import { toast } from 'sonner';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { useIsMobile } from "@/hooks/use-mobile";
import YouTube, { type YouTubeProps } from 'react-youtube';

interface VideoNoteTakerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function VideoNoteTaker({ open, onOpenChange, initialVideo }: VideoNoteTakerProps & { initialVideo?: YouTubeVideo | null }) {
    const isMobile = useIsMobile();
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<YouTubeVideo[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [selectedVideo, setSelectedVideo] = useState<YouTubeVideo | null>(initialVideo || null);

    // Update selected video when initialVideo prop changes
    useEffect(() => {
        if (initialVideo) {
            handleVideoSelect(initialVideo);
        }
    }, [initialVideo]);

    const [noteTitle, setNoteTitle] = useState('');
    const [noteContent, setNoteContent] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    // Video Player Reference
    const playerRef = useRef<any>(null);

    const handleSearch = async () => {
        if (!searchQuery.trim()) return;

        setIsSearching(true);
        try {
            // Check if input is a YouTube URL
            const videoId = extractVideoId(searchQuery);
            if (videoId) {
                let video = await getVideoById(videoId);

                // Fallback if API fails but we have a valid ID
                if (!video) {
                    video = {
                        id: { videoId },
                        snippet: {
                            title: 'YouTube Video',
                            description: 'Video details could not be loaded.',
                            channelTitle: 'Unknown Channel',
                            thumbnails: {
                                medium: { url: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` },
                                high: { url: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` },
                            }
                        }
                    };
                }

                if (video) {
                    handleVideoSelect(video);
                    setIsSearching(false);
                    return;
                }
            }

            // Default search behavior
            const results = await searchYouTubeVideos(searchQuery, 12);
            setSearchResults(results);
        } catch (error) {
            console.error('Search failed:', error);
            toast.error('Failed to search videos');
        } finally {
            setIsSearching(false);
        }
    };

    const handleVideoSelect = (video: YouTubeVideo) => {
        setSelectedVideo(video);
        setNoteTitle(`Notes: ${video.snippet.title}`);
        setNoteContent('');
    };

    const handleBackToSearch = () => {
        setSelectedVideo(null);
        playerRef.current = null;
    };

    const onPlayerReady: YouTubeProps['onReady'] = (event) => {
        playerRef.current = event.target;
    };

    const insertTimestamp = () => {
        if (!playerRef.current) return;

        const currentTime = playerRef.current.getCurrentTime();
        const minutes = Math.floor(currentTime / 60);
        const seconds = Math.floor(currentTime % 60);
        const formattedTime = `[[${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}]]`;

        setNoteContent(prev => prev + (prev.endsWith(' ') || prev.length === 0 ? '' : ' ') + formattedTime + ' ');
    };

    const handleSaveNote = async () => {
        if (!selectedVideo || !noteTitle.trim()) {
            toast.error('Please enter a title');
            return;
        }

        setIsSaving(true);
        try {
            await saveStudyNote({
                title: noteTitle,
                category: 'video_note',
                subject: 'Video Learning',
                topics: ['video_learning', selectedVideo.snippet.channelTitle],
                summary: noteContent.substring(0, 150) + (noteContent.length > 150 ? '...' : ''),
                content: [
                    {
                        heading: 'Notes',
                        content: noteContent
                    }
                ],
                videoUrl: `https://www.youtube.com/watch?v=${selectedVideo.id.videoId}`,
                videoId: selectedVideo.id.videoId,
                flashcards: [],
                examples: [],
                mcqs: [],
                sources: [
                    {
                        url: `https://www.youtube.com/watch?v=${selectedVideo.id.videoId}`,
                        title: selectedVideo.snippet.title,
                        domain: 'youtube.com',
                        snippet: selectedVideo.snippet.description,
                        fetchedAt: new Date().toISOString()
                    }
                ]
            });

            toast.success('Note saved successfully!');
            setNoteTitle('');
            setNoteContent('');

        } catch (error) {
            console.error('Failed to save note:', error);
            toast.error('Failed to save note');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-none w-screen h-screen rounded-none flex flex-col p-0 gap-0 border-0">
                <DialogHeader className="px-6 py-4 border-b">
                    <DialogTitle className="flex items-center gap-2">
                        <PlayCircle className="w-5 h-5 text-primary" />
                        Video Note Taker
                    </DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-hidden flex flex-col">
                    {!selectedVideo ? (
                        <div className="flex-1 flex flex-col p-6 gap-6">
                            <div className="flex gap-2">
                                <Input
                                    placeholder="Search educational videos or paste YouTube URL..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                    className="flex-1"
                                />
                                <Button onClick={handleSearch} disabled={isSearching}>
                                    {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                                </Button>
                                {searchQuery && (
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={() => {
                                            setSearchQuery('');
                                            setSearchResults([]);
                                        }}
                                        title="Clear search"
                                    >
                                        <X className="w-4 h-4" />
                                    </Button>
                                )}
                            </div>

                            <ScrollArea className="flex-1">
                                {searchResults.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-4">
                                        {searchResults.map((video) => (
                                            <div
                                                key={video.id.videoId}
                                                className="group relative aspect-video bg-black/5 rounded-lg overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary transition-all"
                                                onClick={() => handleVideoSelect(video)}
                                            >
                                                <img
                                                    src={video.snippet.thumbnails.medium.url}
                                                    alt={video.snippet.title}
                                                    className="w-full h-full object-cover"
                                                />
                                                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-3 pt-8">
                                                    <p className="text-white text-sm font-medium line-clamp-2">
                                                        {video.snippet.title}
                                                    </p>
                                                    <p className="text-white/70 text-xs mt-1">
                                                        {video.snippet.channelTitle}
                                                    </p>
                                                </div>
                                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
                                                    <PlayCircle className="w-12 h-12 text-white drop-shadow-lg" />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-2">
                                        <Search className="w-12 h-12 opacity-20" />
                                        <p>Search for a topic to start learning</p>
                                    </div>
                                )}
                            </ScrollArea>
                        </div>
                    ) : (
                        <ResizablePanelGroup direction={isMobile ? 'vertical' : 'horizontal'} className="flex-1">
                            <ResizablePanel defaultSize={65} minSize={30}>
                                {/* Video Player */}
                                <div className="h-full bg-black flex flex-col">
                                    <div className="p-2 bg-muted/20">
                                        <Button variant="ghost" size="sm" onClick={handleBackToSearch} className="text-white hover:text-white hover:bg-white/10 gap-2">
                                            <ArrowLeft className="w-4 h-4" /> Back into Search
                                        </Button>
                                    </div>
                                    <div className="flex-1 relative bg-black flex items-center justify-center">
                                        <YouTube
                                            videoId={selectedVideo.id.videoId}
                                            className="w-full h-full"
                                            iframeClassName="w-full h-full"
                                            opts={{
                                                height: '100%',
                                                width: '100%',
                                                playerVars: {
                                                    autoplay: 0,
                                                },
                                            }}
                                            onReady={onPlayerReady}
                                        />
                                    </div>
                                </div>
                            </ResizablePanel>

                            <ResizableHandle withHandle />

                            <ResizablePanel defaultSize={35} minSize={20}>
                                {/* Notes */}
                                <div className="h-full flex flex-col bg-background">
                                    <div className="p-4 border-b space-y-3">
                                        <div className="flex items-center justify-between">
                                            <h3 className="font-semibold">Take Notes</h3>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={insertTimestamp}
                                                className="h-8 gap-1.5 text-xs"
                                                title="Insert current timestamp"
                                            >
                                                <Clock className="w-3.5 h-3.5 text-primary" />
                                                Timestamp
                                            </Button>
                                        </div>
                                        <Input
                                            placeholder="Note Title"
                                            value={noteTitle}
                                            onChange={(e) => setNoteTitle(e.target.value)}
                                            className="font-medium"
                                        />
                                    </div>
                                    <div className="flex-1 p-4 overflow-hidden">
                                        <Textarea
                                            placeholder="Type your notes here... Click 'Timestamp' to mark important moments."
                                            value={noteContent}
                                            onChange={(e) => setNoteContent(e.target.value)}
                                            className="h-full resize-none border-0 focus-visible:ring-0 text-base font-mono"
                                        />
                                    </div>
                                    <div className="p-4 border-t bg-muted/10">
                                        <Button className="w-full gap-2" onClick={handleSaveNote} disabled={isSaving}>
                                            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                            Save Note
                                        </Button>
                                    </div>
                                </div>
                            </ResizablePanel>
                        </ResizablePanelGroup>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
