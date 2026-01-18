import { useState, useEffect, useRef } from 'react';
import { StudentNavbar } from '@/components/StudentNavbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BookOpen, Plus, Edit2, Trash2, FileText, Clock, PlayCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { getStudyNotes, saveStudyNote, deleteStudyNote, getStudyNoteById } from '@/services/studyNotes';
import { type StudyNote, type NoteSection, type NoteCategory } from '@/data/studyNotes';
import YouTube, { type YouTubeProps } from 'react-youtube';

export default function StudentStudyNotes() {
  const [notes, setNotes] = useState<StudyNote[]>([]);
  const [createNoteOpen, setCreateNoteOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<StudyNote | null>(null);
  const [viewingNote, setViewingNote] = useState<StudyNote | null>(null);
  const [activeTab, setActiveTab] = useState<string>('all');

  // Video player ref for viewing notes
  const viewerPlayerRef = useRef<any>(null);

  // Form state
  const [noteForm, setNoteForm] = useState({
    title: '',
    subject: '',
    summary: '',
    sections: [{ heading: '', content: '' }] as NoteSection[]
  });

  useEffect(() => {
    loadNotes();
    // Add event listener for storage updates to sync across tabs/components
    window.addEventListener('storage', loadNotes);
    return () => window.removeEventListener('storage', loadNotes);
  }, []);

  const loadNotes = () => {
    const allNotes = getStudyNotes();
    setNotes(allNotes);
  };

  const getFilteredNotes = () => {
    if (activeTab === 'all') {
      // Exclude generated notes from "All Notes" view
      return notes.filter(n => n.category !== 'college' && n.category !== 'competitive');
    }
    if (activeTab === 'video') return notes.filter(n => n.category === 'video_note');
    if (activeTab === 'personal') return notes.filter(n => n.category === 'personal' || !n.category); // Default to personal if undefined
    return notes;
  };

  const handleCreateNote = () => {
    if (!noteForm.title.trim() || !noteForm.subject.trim()) {
      toast.error('Title and Subject are required');
      return;
    }

    const newNote: StudyNote = {
      id: editingNote?.id || crypto.randomUUID(),
      title: noteForm.title,
      subject: noteForm.subject,
      summary: noteForm.summary,
      content: noteForm.sections,
      category: 'personal', // Default to personal for manual creation
      topics: [noteForm.subject],
      flashcards: [],
      examples: [],
      mcqs: [],
      sources: [],
      rating: { up: 0, down: 0 },
      meta: {
        wordCount: 0, // calculate later
        readingTime: getReadingTime(noteForm.sections)
      },
      createdAt: editingNote?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    saveStudyNote(newNote);
    loadNotes(); // Refresh

    setCreateNoteOpen(false);
    setEditingNote(null);
    setNoteForm({
      title: '',
      subject: '',
      summary: '',
      sections: [{ heading: '', content: '' }]
    });
    toast.success(editingNote ? 'Note updated successfully' : 'Note created successfully');
  };

  const handleEditNote = (note: StudyNote) => {
    setEditingNote(note);
    setNoteForm({
      title: note.title,
      subject: note.subject,
      summary: note.summary,
      sections: note.content && note.content.length > 0 ? note.content : [{ heading: '', content: '' }]
    });
    setCreateNoteOpen(true);
  };

  const handleDeleteNote = (noteId: string) => {
    if (confirm('Are you sure you want to delete this note?')) {
      deleteStudyNote(noteId);
      loadNotes(); // Refresh
      toast.success('Note deleted');
    }
  };

  const addSection = () => {
    setNoteForm({
      ...noteForm,
      sections: [...noteForm.sections, { heading: '', content: '' }]
    });
  };

  const updateSection = (index: number, field: 'heading' | 'content', value: string) => {
    const newSections = [...noteForm.sections];
    newSections[index][field] = value;
    setNoteForm({ ...noteForm, sections: newSections });
  };

  const removeSection = (index: number) => {
    if (noteForm.sections.length <= 1) return;
    const newSections = noteForm.sections.filter((_, i) => i !== index);
    setNoteForm({ ...noteForm, sections: newSections });
  };

  const getReadingTime = (sections: NoteSection[]) => {
    if (!sections) return 1;
    const wordCount = sections.reduce((acc, s) => acc + (s.content?.split(/\s+/).length || 0), 0);
    return Math.ceil(wordCount / 200) || 1;
  };

  const onViewerReady: YouTubeProps['onReady'] = (event) => {
    viewerPlayerRef.current = event.target;
  };

  const seekToTimestamp = (seconds: number) => {
    if (viewerPlayerRef.current) {
      viewerPlayerRef.current.seekTo(seconds, true);
      viewerPlayerRef.current.playVideo();
    }
  };

  // Helper to render text with clickable timestamps
  const renderContentWithTimestamps = (text: string) => {
    const parts = text.split(/(\[\[\d{2}:\d{2}\]\])/g);
    return parts.map((part, index) => {
      if (part.match(/^\[\[\d{2}:\d{2}\]\]$/)) {
        const timeString = part.slice(2, -2);
        const [min, sec] = timeString.split(':').map(Number);
        const totalSeconds = min * 60 + sec;

        return (
          <span
            key={index}
            onClick={() => seekToTimestamp(totalSeconds)}
            className="inline-flex items-center gap-0.5 text-primary hover:text-primary/80 bg-primary/10 hover:bg-primary/20 px-1.5 py-0.5 rounded cursor-pointer mx-1 font-mono text-sm transition-colors"
            title={`Jump to ${timeString}`}
          >
            <PlayCircle className="w-3 h-3" />
            {timeString}
          </span>
        );
      }
      return part;
    });
  };

  const filteredNotes = getFilteredNotes();

  return (
    <div className="min-h-screen bg-background">
      <StudentNavbar />

      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
              <BookOpen className="h-8 w-8 text-primary" />
              My Study Notes
            </h1>
            <p className="text-muted-foreground">
              Manage your personal notes, video notes, and generated study materials
            </p>
          </div>
          <Button
            onClick={() => {
              setEditingNote(null);
              setNoteForm({
                title: '',
                subject: '',
                summary: '',
                sections: [{ heading: '', content: '' }]
              });
              setCreateNoteOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Personal Note
          </Button>
        </div>

        {/* Tabs and Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList>
            <TabsTrigger value="all">All Notes</TabsTrigger>
            <TabsTrigger value="personal">Personal</TabsTrigger>
            <TabsTrigger value="video" className="flex items-center gap-2">
              <PlayCircle className="w-4 h-4" />
              Video Notes
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Showing {filteredNotes.length} note{filteredNotes.length !== 1 ? 's' : ''}
            </p>

            {filteredNotes.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground mb-4">
                    No notes found in this category.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredNotes.map((note) => (
                  <Card key={note.id || Math.random().toString()} className="hover:shadow-lg transition-all flex flex-col">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg mb-2 line-clamp-2">{note.title}</CardTitle>
                          <CardDescription className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline">{note.subject}</Badge>
                            {note.category === 'video_note' && (
                              <Badge variant="secondary" className="bg-red-100 text-red-800 hover:bg-red-200">
                                <PlayCircle className="w-3 h-3 mr-1" /> Video
                              </Badge>
                            )}
                            <Badge variant="secondary" className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {note.meta?.readingTime || getReadingTime(note.content)} min
                            </Badge>
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col">
                      {note.summary && (
                        <p className="text-sm text-muted-foreground mb-4 line-clamp-3 flex-1">
                          {note.summary}
                        </p>
                      )}

                      <div className="flex items-center justify-between mt-auto pt-4 border-t">
                        <span className="text-xs text-muted-foreground">
                          {new Date(note.updatedAt || new Date()).toLocaleDateString('en-GB')}
                        </span>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteNote(note.id!)}
                            className="text-destructive hover:bg-destructive/10 h-8 w-8 p-0"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => setViewingNote(note)}
                            className="h-8"
                          >
                            <FileText className="h-4 w-4 mr-1" />
                            View
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Create/Edit Note Dialog */}
        <Dialog open={createNoteOpen} onOpenChange={setCreateNoteOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle>{editingNote ? 'Edit Personal Note' : 'Create New Personal Note'}</DialogTitle>
              <DialogDescription>
                Add your own study notes manually.
              </DialogDescription>
            </DialogHeader>

            <ScrollArea className="flex-1 pr-4">
              <div className="space-y-6 py-4">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="note-title">Title *</Label>
                      <Input
                        id="note-title"
                        placeholder="e.g., Intro to Neural Networks"
                        value={noteForm.title}
                        onChange={(e) => setNoteForm({ ...noteForm, title: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="note-subject">Subject *</Label>
                      <Input
                        id="note-subject"
                        placeholder="e.g., Computer Science"
                        value={noteForm.subject}
                        onChange={(e) => setNoteForm({ ...noteForm, subject: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="note-summary">Summary (Optional)</Label>
                    <Textarea
                      id="note-summary"
                      placeholder="Enter a brief summary..."
                      className="resize-none"
                      rows={2}
                      value={noteForm.summary}
                      onChange={(e) => setNoteForm({ ...noteForm, summary: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold">Content Sections</h3>
                    <Button variant="outline" size="sm" onClick={addSection}>
                      <Plus className="h-4 w-4 mr-1" />
                      Add Section
                    </Button>
                  </div>

                  <div className="space-y-4">
                    {noteForm.sections.map((section, idx) => (
                      <div key={idx} className="p-4 border rounded-lg bg-muted/30 relative group">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute right-2 top-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
                          onClick={() => removeSection(idx)}
                          disabled={noteForm.sections.length <= 1}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <div className="space-y-3">
                          <Input
                            placeholder="Section Heading"
                            className="bg-background font-semibold"
                            value={section.heading}
                            onChange={(e) => updateSection(idx, 'heading', e.target.value)}
                          />
                          <Textarea
                            placeholder="Section content..."
                            className="bg-background min-h-[100px]"
                            value={section.content}
                            onChange={(e) => updateSection(idx, 'content', e.target.value)}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </ScrollArea>

            <DialogFooter className="pt-4 border-t">
              <Button variant="outline" onClick={() => setCreateNoteOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateNote}>
                {editingNote ? 'Save Changes' : 'Create Note'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* View Note Dialog */}
        <Dialog open={!!viewingNote} onOpenChange={() => { setViewingNote(null); viewerPlayerRef.current = null; }}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            {viewingNote && (
              <>
                <DialogHeader>
                  <DialogTitle className="text-2xl flex items-center gap-2">
                    {viewingNote.category === 'video_note' && <PlayCircle className="w-6 h-6 text-red-600" />}
                    {viewingNote.title}
                  </DialogTitle>
                  <DialogDescription className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline">{viewingNote.subject}</Badge>
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {viewingNote.meta?.readingTime || getReadingTime(viewingNote.content)} min read
                    </Badge>
                  </DialogDescription>
                </DialogHeader>

                <ScrollArea className="max-h-[60vh] pr-4">
                  <div className="space-y-6">
                    {viewingNote.videoUrl && (
                      <div className="aspect-video bg-black rounded-lg overflow-hidden">
                        <YouTube
                          videoId={viewingNote.videoId || viewingNote.videoUrl.split('v=')[1]}
                          className="w-full h-full"
                          iframeClassName="w-full h-full"
                          opts={{
                            width: '100%',
                            height: '100%',
                          }}
                          onReady={onViewerReady}
                        />
                      </div>
                    )}

                    {viewingNote.summary && (
                      <div className="bg-muted/30 p-4 rounded-lg">
                        <h3 className="font-semibold mb-2">Summary</h3>
                        <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                          {renderContentWithTimestamps(viewingNote.summary)}
                        </div>
                      </div>
                    )}

                    {viewingNote.content && viewingNote.content.map((section, idx) => (
                      <div key={idx}>
                        <h3 className="font-semibold mb-2">{section.heading}</h3>
                        <div className="text-sm whitespace-pre-wrap leading-relaxed">
                          {renderContentWithTimestamps(section.content)}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                <div className="flex justify-between items-center pt-4 border-t">
                  <span className="text-xs text-muted-foreground">
                    Last updated: {viewingNote.updatedAt ? new Date(viewingNote.updatedAt).toLocaleDateString('en-GB') : 'N/A'}
                  </span>
                  <div className="flex gap-2">
                    {viewingNote.category === 'personal' && (
                      <Button variant="outline" onClick={() => {
                        setViewingNote(null);
                        handleEditNote(viewingNote);
                      }}>
                        <Edit2 className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                    )}
                    <Button onClick={() => setViewingNote(null)}>
                      Close
                    </Button>
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
