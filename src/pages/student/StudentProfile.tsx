import { useEffect, useMemo, useRef, useState } from 'react';
import { StudentNavbar } from '@/components/StudentNavbar';
import { Edit, Github, Linkedin, Mail, Phone, Calendar, MapPin, BookOpen, User, Info, Brain, Zap } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { getQuizResults, type QuizResult } from '@/services/quizResults';
import { getActivityRecords, getActivityStreak, getTotalActivityCount, type ActivityRecord } from '@/services/activityTracker';
import { getPerformanceMetrics, getSubjectPerformance, getWeakAreas, getStrongAreas } from '@/services/quizResults';

const learningModes = [
  { value: 'video', label: 'Video' },
  { value: 'text', label: 'Text' },
  { value: 'podcast', label: 'Podcast' },
];

const PROFILE_STORAGE_KEY = 'student_profile_extended';

export default function StudentProfile() {
  const { user, userRole } = useAuth();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [profile, setProfile] = useState({
    fullName: '',
    email: '',
    role: 'student',
    branch: '',
    year: '',
    phone: '',
    joinDate: '',
    lastLogin: '',
    github: '',
    linkedin: '',
  });

  // Load profile data from database and localStorage
  useEffect(() => {
    const loadProfile = async () => {
      if (!user) return;

      try {
        // Fetch from database
        const { data: dbProfile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Error fetching profile:', error);
        }

        // Load extended profile from localStorage
        const stored = localStorage.getItem(PROFILE_STORAGE_KEY);
        const extendedProfile = stored ? JSON.parse(stored) : {};

        // Get last active from activity tracker (unused now)
        // const activities = getActivityRecords();

        setProfile({
          fullName: dbProfile?.full_name || user?.user_metadata?.full_name || extendedProfile.fullName || 'Student',
          email: user?.email || '',
          role: userRole || 'student',
          branch: extendedProfile.branch || '',
          year: extendedProfile.year || '',
          phone: extendedProfile.phone || '',
          joinDate: dbProfile?.created_at
            ? new Date(dbProfile.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
            : '',
          lastLogin: user?.last_sign_in_at
            ? new Date(user.last_sign_in_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric' })
            : 'First Login',
          github: extendedProfile.github || '',
          linkedin: extendedProfile.linkedin || '',
        });
      } catch (error) {
        console.error('Error loading profile:', error);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();

    // Listen for activity updates to refresh data
    const handleActivityUpdate = () => {
      loadProfile();
    };

    window.addEventListener('activity-updated', handleActivityUpdate);
    window.addEventListener('quiz-completed', handleActivityUpdate);

    return () => {
      window.removeEventListener('activity-updated', handleActivityUpdate);
      window.removeEventListener('quiz-completed', handleActivityUpdate);
    };
  }, [user, userRole]);

  // Calculate mastery data from quiz results
  const masteryData = useMemo(() => {
    const quizResults = getQuizResults();
    if (quizResults.length === 0) {
      return [
        { label: 'Core Concepts', value: 0 },
        { label: 'Applied Labs', value: 0 },
        { label: 'Capstone Readiness', value: 0 },
      ];
    }

    const metrics = getPerformanceMetrics();
    const avgAccuracy = metrics.averageAccuracy;
    const difficultyRate = metrics.difficultySuccessRate;

    return [
      { label: 'Core Concepts', value: Math.round(avgAccuracy) },
      { label: 'Applied Labs', value: Math.round(difficultyRate.medium) },
      { label: 'Capstone Readiness', value: Math.round(difficultyRate.hard) },
    ];
  }, []);

  // Calculate concept breakdown from quiz results
  const conceptBreakdown = useMemo(() => {
    const weakAreas = getWeakAreas();
    const strongAreas = getStrongAreas();

    const concepts = [
      ...strongAreas.slice(0, 3).map(area => ({
        concept: area.topic,
        mastery: 'Advanced' as const,
      })),
      ...weakAreas.slice(0, 3).map(area => ({
        concept: area.topic,
        mastery: area.accuracy > 40 ? 'Intermediate' as const : 'Beginner' as const,
      })),
    ];

    return concepts.length > 0
      ? concepts.slice(0, 5)
      : [
        { concept: 'No data yet', mastery: 'Beginner' as const },
      ];
  }, []);

  // Get quiz history from actual quiz results
  const quizHistory = useMemo(() => {
    const results = getQuizResults()
      .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
      .slice(0, 5);

    return results.map(result => {
      const avgDifficulty = result.difficultyStats.hard.total > 0 ? 'Hard' :
        result.difficultyStats.medium.total > 0 ? 'Medium' : 'Easy';
      const minutes = Math.floor(result.totalTime / 60);
      const seconds = result.totalTime % 60;
      const timeStr = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;

      return {
        title: `${result.subject} Quiz`,
        accuracy: `${Math.round(result.accuracy)}%`,
        difficulty: avgDifficulty,
        time: timeStr,
      };
    });
  }, []);

  // Get video history from activity tracker
  const videoHistory = useMemo(() => {
    const activities = getActivityRecords();
    const videoActivities: { title: string; date: string; metadata?: any }[] = [];

    activities.forEach(record => {
      record.activities.forEach((activity, idx) => {
        // We need to get the metadata from storage - activity tracker doesn't store full metadata
        // For now, we'll use a simplified approach
        if (activity === 'video_watched') {
          videoActivities.push({
            title: `Video watched on ${new Date(record.date).toLocaleDateString()}`,
            date: record.date,
          });
        }
      });
    });

    // Sort by date, most recent first
    videoActivities.sort((a, b) => b.date.localeCompare(a.date));

    // Format relative time
    const now = new Date();
    return videoActivities.slice(0, 5).map(video => {
      const videoDate = new Date(video.date);
      const diffMs = now.getTime() - videoDate.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

      let lastWatched = '';
      if (diffDays > 0) {
        lastWatched = `${diffDays}d ago`;
      } else if (diffHours > 0) {
        lastWatched = `${diffHours}h ago`;
      } else {
        lastWatched = 'Just now';
      }

      return {
        title: video.title,
        lastWatched,
        playlist: 'Learning Videos',
      };
    });
  }, []);

  // Calculate XP and level
  const xpData = useMemo(() => {
    const quizResults = getQuizResults();
    const activities = getTotalActivityCount();
    const xp = quizResults.length * 50 + activities * 10;
    const currentLevel = Math.floor(xp / 300);
    const xpInLevel = xp % 300;
    const xpNeeded = 300 - xpInLevel;
    return { xp, currentLevel, xpInLevel, xpNeeded };
  }, []);

  // Calculate achievements dynamically
  const achievements = useMemo(() => {
    const quizResults = getQuizResults();
    const streak = getActivityStreak();
    const totalActivities = getTotalActivityCount();

    const achievementList = [];

    // Consistency Champ - based on streak
    if (streak >= 7) {
      achievementList.push({
        name: 'Consistency Champ',
        description: `${streak}-day learning streak`,
        color: 'bg-amber-200 text-amber-900',
      });
    }

    // Quiz Ace - flawless quizzes
    const flawlessQuizzes = quizResults.filter(r => r.accuracy === 100).length;
    if (flawlessQuizzes >= 1) {
      achievementList.push({
        name: 'Quiz Ace',
        description: `${flawlessQuizzes} flawless quiz${flawlessQuizzes > 1 ? 'zes' : ''}`,
        color: 'bg-indigo-200 text-indigo-900',
      });
    }

    // Activity Master - based on total activities
    if (totalActivities >= 50) {
      achievementList.push({
        name: 'Activity Master',
        description: `${totalActivities} activities completed`,
        color: 'bg-emerald-200 text-emerald-900',
      });
    }

    return achievementList.length > 0 ? achievementList : [];
  }, []);

  const mentorSummary = {
    batch: 'AI Launchpad ' + new Date().getFullYear(),
    studentCount: 42,
    alerts: 6,
    atRisk: 4,
    interactions: [
      { name: 'Priya S.', action: 'Requested project feedback' },
      { name: 'Rahul K.', action: 'Flagged burnout risk' },
      { name: 'Team Delta', action: 'Shared milestone update' },
    ],
  };

  // Get job insights from localStorage
  const jobInsights = useMemo(() => {
    try {
      const savedJobs = JSON.parse(localStorage.getItem('savedJobs') || '[]');
      const appliedJobs = JSON.parse(localStorage.getItem('appliedJobs') || '[]');

      const lastApplied = appliedJobs.length > 0
        ? new Date(appliedJobs[appliedJobs.length - 1].appliedAt || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : 'Never';

      return {
        applied: appliedJobs.length,
        saved: savedJobs.length,
        recommended: 0, // Would need to calculate from job recommendations
        lastApplied,
      };
    } catch {
      return {
        applied: 0,
        saved: 0,
        recommended: 0,
        lastApplied: 'Never',
      };
    }
  }, []);



  const saveProfile = async () => {
    if (!user) return;

    try {
      // Save basic info to database
      const { error: dbError } = await supabase
        .from('profiles')
        .update({
          full_name: profile.fullName,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (dbError) {
        console.error('Error saving to database:', dbError);
      }

      // Save extended profile to localStorage
      const extendedProfile = {
        branch: profile.branch,
        year: profile.year,
        phone: profile.phone,
        github: profile.github,
        linkedin: profile.linkedin,
      };
      localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(extendedProfile));
    } catch (error) {
      console.error('Error saving profile:', error);
    }
  };

  const handleProfileChange = (key: string, value: string) => {
    setProfile((prev) => ({ ...prev, [key]: value }));
  };

  const handleManualSave = async () => {
    setSaving(true);
    try {
      await saveProfile();
      toast({
        title: 'Profile saved',
        description: 'Changes are secured successfully.',
      });
    } catch (error) {
      toast({
        title: 'Error saving profile',
        description: 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <StudentNavbar />
        <main className="container mx-auto px-4 py-8 space-y-8">
          <div className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">Loading profile...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <StudentNavbar />
      <main className="container mx-auto px-4 py-8 space-y-8">
        <header className="space-y-2">

          <h1 className="text-3xl font-semibold text-foreground">Hey {profile.fullName.split(' ')[0] || 'Student'}, keep the momentum alive!</h1>
          <p className="text-muted-foreground">
            Edit details, track learning, monitor achievements, and stay job-ready — all powered by real-time adaptive signals.
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
          <Card className="bg-blue-50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-800">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle>Profile Overview</CardTitle>
                <CardDescription>Live view of your learner identity</CardDescription>
              </div>
              <Dialog open={isEditing} onOpenChange={setIsEditing}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Edit className="h-4 w-4" />
                    Edit Profile
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Edit Profile</DialogTitle>
                    <DialogDescription>
                      Update your personal details and public profile info.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Full name</Label>
                        <Input id="name" value={profile.fullName} onChange={(e) => handleProfileChange('fullName', e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone number</Label>
                        <Input id="phone" value={profile.phone} onChange={(e) => handleProfileChange('phone', e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="branch">Stream / Branch</Label>
                        <Input id="branch" value={profile.branch} onChange={(e) => handleProfileChange('branch', e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="year">Semester</Label>
                        <Select value={profile.year} onValueChange={(value) => handleProfileChange('year', value)}>
                          <SelectTrigger id="year">
                            <SelectValue placeholder="Select semester" />
                          </SelectTrigger>
                          <SelectContent>
                            {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                              <SelectItem key={sem} value={sem.toString()}>
                                Semester {sem}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="github">GitHub URL</Label>
                        <Input id="github" value={profile.github} onChange={(e) => handleProfileChange('github', e.target.value)} placeholder="https://github.com/..." />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="linkedin">LinkedIn URL</Label>
                        <Input id="linkedin" value={profile.linkedin} onChange={(e) => handleProfileChange('linkedin', e.target.value)} placeholder="https://linkedin.com/in/..." />
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
                    <Button onClick={() => { handleManualSave(); setIsEditing(false); }} disabled={saving}>
                      {saving ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col gap-6 sm:flex-row">
                <Avatar className="h-24 w-24 border-4 border-background shadow-sm">
                  <AvatarImage src={`https://api.dicebear.com/7.x/thumbs/svg?seed=${profile.fullName}`} alt={profile.fullName} />
                  <AvatarFallback>{profile.fullName.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-2">
                  <div>
                    <h2 className="text-2xl font-bold">{profile.fullName}</h2>
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <Mail className="h-3 w-3" /> {profile.email}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Badge variant="secondary" className="gap-1 font-normal">
                      <User className="h-3 w-3" /> {userRole === 'mentor' ? 'Mentor' : 'Student'}
                    </Badge>
                    {profile.linkedin && (
                      <a href={profile.linkedin} target="_blank" rel="noreferrer" className="cursor-pointer">
                        <Badge variant="outline" className="gap-1 hover:bg-muted">
                          <Linkedin className="h-3 w-3" /> LinkedIn
                        </Badge>
                      </a>
                    )}
                    {profile.github && (
                      <a href={profile.github} target="_blank" rel="noreferrer" className="cursor-pointer">
                        <Badge variant="outline" className="gap-1 hover:bg-muted">
                          <Github className="h-3 w-3" /> GitHub
                        </Badge>
                      </a>
                    )}
                  </div>
                </div>
              </div>

              <Separator />

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <BookOpen className="h-3.5 w-3.5" /> Branch / Stream
                  </p>
                  <p className="text-base pl-6">{profile.branch || 'Not set'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5" /> Semester
                  </p>
                  <p className="text-base pl-6">{profile.year ? `Semester ${profile.year}` : 'Not set'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5" /> Phone Number
                  </p>
                  <p className="text-base pl-6">{profile.phone || 'Not set'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5" /> Last Login
                  </p>
                  <p className="text-base pl-6">{profile.lastLogin}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-blue-50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-800">
            <CardHeader>
              <div className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Live Achievements</CardTitle>
                  <CardDescription>Your gamified growth trail</CardDescription>
                </div>
                <HoverCard>
                  <HoverCardTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground/50 hover:text-primary">
                      <Info className="h-4 w-4" />
                    </Button>
                  </HoverCardTrigger>
                  <HoverCardContent className="w-80" align="end">
                    <div className="space-y-4">
                      <h4 className="text-sm font-semibold">How to earn XP</h4>
                      <div className="grid gap-3">
                        <div className="grid grid-cols-[25px_1fr_auto] items-center gap-2">
                          <Brain className="h-4 w-4 text-indigo-500" />
                          <div className="text-sm">
                            <p className="font-medium text-foreground">Quiz Completed</p>
                            <p className="text-xs text-muted-foreground">Major milestone</p>
                          </div>
                          <span className="text-sm font-bold text-indigo-600">+50 XP</span>
                        </div>
                        <div className="grid grid-cols-[25px_1fr_auto] items-center gap-2">
                          <Zap className="h-4 w-4 text-amber-500" />
                          <div className="text-sm">
                            <p className="font-medium text-foreground">Activity Logged</p>
                            <p className="text-xs text-muted-foreground">Daily engagement</p>
                          </div>
                          <span className="text-sm font-bold text-amber-600">+10 XP</span>
                        </div>
                      </div>
                      <Separator />
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Level Up Requirement</span>
                        <span className="font-mono font-medium text-foreground">300 XP / level</span>
                      </div>
                    </div>
                  </HoverCardContent>
                </HoverCard>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">XP Earned</p>
                <p className="text-2xl font-bold">{xpData.xp.toLocaleString()} XP</p>
                <Progress value={(xpData.xpInLevel / 300) * 100} className="mt-2" />
                <p className="text-xs text-muted-foreground mt-1">
                  Level {xpData.currentLevel + 1} · {xpData.xpNeeded} XP to level up
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {achievements.length > 0 ? (
                  achievements.map((badge) => (
                    <Badge key={badge.name} variant="secondary" className={cn('px-3 py-1 text-xs', badge.color)}>
                      {badge.name}
                    </Badge>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground">Complete activities to earn achievements!</p>
                )}
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border bg-muted/40 p-3">
                  <p className="text-xs text-muted-foreground">Streak days</p>
                  <p className="text-xl font-semibold">{getActivityStreak()}</p>
                </div>
                <div className="rounded-lg border bg-muted/40 p-3">
                  <p className="text-xs text-muted-foreground">Total activities</p>
                  <p className="text-xl font-semibold">{getTotalActivityCount()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="bg-blue-50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-800">
            <CardHeader>
              <CardTitle>Learning Statistics</CardTitle>
              <CardDescription>Mastery, difficulty trends, focus signals</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                {masteryData.map((item) => (
                  <div key={item.label}>
                    <div className="flex justify-between text-sm font-medium">
                      <span>{item.label}</span>
                      <span>{item.value}%</span>
                    </div>
                    <Progress value={item.value} />
                  </div>
                ))}
              </div>
              <Separator />
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border bg-muted/40 p-3">
                  <p className="text-xs text-muted-foreground">Overall mastery</p>
                  <p className="text-lg font-semibold">{masteryData.length > 0 ? Math.round(masteryData.reduce((sum, item) => sum + item.value, 0) / masteryData.length) : 0}%</p>
                </div>
                <div className="rounded-lg border bg-muted/40 p-3">
                  <p className="text-xs text-muted-foreground">Difficulty trend</p>
                  <p className="text-lg font-semibold text-emerald-600">
                    {(() => {
                      const results = getQuizResults().slice(-5);
                      if (results.length < 2) return 'Neutral';
                      const recentAvg = results.slice(-3).reduce((sum, r) => sum + r.accuracy, 0) / Math.min(3, results.length);
                      const olderAvg = results.slice(0, -3).reduce((sum, r) => sum + r.accuracy, 0) / Math.max(1, results.length - 3);
                      return recentAvg > olderAvg ? 'Rising' : 'Stable';
                    })()}
                  </p>
                </div>
                <div className="rounded-lg border bg-muted/40 p-3">
                  <p className="text-xs text-muted-foreground">Focus concept</p>
                  <p className="text-lg font-semibold">
                    {(() => {
                      const weakAreas = getWeakAreas();
                      return weakAreas.length > 0 ? weakAreas[0].topic : 'None yet';
                    })()}
                  </p>
                </div>
              </div>
              <Separator />
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Concept summary</p>
                {conceptBreakdown.length > 0 ? (
                  conceptBreakdown.map((concept) => (
                    <div key={concept.concept} className="flex items-center justify-between rounded-md border px-3 py-2">
                      <span className="text-sm font-medium">{concept.concept}</span>
                      <Badge variant="outline">{concept.mastery}</Badge>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">Complete quizzes to see your concept breakdown</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-blue-50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-800">
            <CardHeader>
              <CardTitle>Study & Quiz Insights</CardTitle>
              <CardDescription>Time on task and accuracy trends</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-lg border bg-muted/40 p-3">
                  <p className="text-xs text-muted-foreground">Study hours</p>
                  <p className="text-lg font-semibold">
                    {(() => {
                      const activities = getActivityRecords();
                      const totalMinutes = activities.reduce((sum, a) => sum + a.count * 30, 0); // Estimate 30 min per activity
                      return `${Math.round(totalMinutes / 60)}h`;
                    })()}
                  </p>
                  <p className="text-xs text-emerald-600">
                    {(() => {
                      const activities = getActivityRecords();
                      const weekAgo = new Date();
                      weekAgo.setDate(weekAgo.getDate() - 7);
                      const thisWeek = activities.filter(a => new Date(a.date) >= weekAgo);
                      const lastWeek = activities.filter(a => {
                        const date = new Date(a.date);
                        return date >= new Date(weekAgo.getTime() - 7 * 24 * 60 * 60 * 1000) && date < weekAgo;
                      });
                      const diff = thisWeek.length - lastWeek.length;
                      return diff > 0 ? `+${diff} activities this week` : 'Keep it up!';
                    })()}
                  </p>
                </div>
                <div className="rounded-lg border bg-muted/40 p-3">
                  <p className="text-xs text-muted-foreground">Weekly activity</p>
                  <p className="text-lg font-semibold">
                    {(() => {
                      const activities = getActivityRecords();
                      const weekAgo = new Date();
                      weekAgo.setDate(weekAgo.getDate() - 7);
                      const thisWeek = activities.filter(a => new Date(a.date) >= weekAgo);
                      return thisWeek.length;
                    })()} days
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {(() => {
                      const activities = getActivityRecords();
                      const weekAgo = new Date();
                      weekAgo.setDate(weekAgo.getDate() - 7);
                      const thisWeek = activities.filter(a => new Date(a.date) >= weekAgo);
                      if (thisWeek.length === 0) return 'Start learning!';
                      const mostActive = thisWeek.reduce((max, a) => a.count > max.count ? a : max, thisWeek[0]);
                      const dayName = new Date(mostActive.date).toLocaleDateString('en-US', { weekday: 'short' });
                      return `Most active: ${dayName}`;
                    })()}
                  </p>
                </div>
                <div className="rounded-lg border bg-muted/40 p-3">
                  <p className="text-xs text-muted-foreground">Fastest quiz</p>
                  <p className="text-lg font-semibold">
                    {(() => {
                      const results = getQuizResults();
                      if (results.length === 0) return 'N/A';
                      const fastest = results.reduce((min, r) => r.totalTime < min.totalTime ? r : min, results[0]);
                      const minutes = Math.floor(fastest.totalTime / 60);
                      const seconds = fastest.totalTime % 60;
                      return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
                    })()}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {(() => {
                      const results = getQuizResults();
                      if (results.length === 0) return 'Take a quiz';
                      const fastest = results.reduce((min, r) => r.totalTime < min.totalTime ? r : min, results[0]);
                      return fastest.subject || 'Quiz';
                    })()}
                  </p>
                </div>
              </div>
              <Separator />
              <div>
                <p className="text-sm font-medium mb-3">Recent quiz performance</p>
                <div className="space-y-3">
                  {quizHistory.length > 0 ? (
                    quizHistory.map((quiz, idx) => (
                      <div key={`${quiz.title}-${idx}`} className="rounded-lg border p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{quiz.title}</p>
                            <p className="text-xs text-muted-foreground">Avg difficulty: {quiz.difficulty}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold">{quiz.accuracy}</p>
                            <p className="text-xs text-muted-foreground">{quiz.time}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">No quiz history yet. Take your first quiz!</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="bg-blue-50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-800">
            <CardHeader>
              <CardTitle>Video Watch History</CardTitle>
              <CardDescription>Resume where you left off</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-72 pr-4">
                <div className="space-y-4">
                  {videoHistory.length > 0 ? (
                    videoHistory.map((video, idx) => (
                      <div key={`${video.title}-${idx}`} className="rounded-lg border p-3">
                        <p className="font-medium">{video.title}</p>
                        <p className="text-sm text-muted-foreground">{video.playlist}</p>
                        <p className="text-xs text-muted-foreground mt-1">Last watched {video.lastWatched}</p>
                        <Button size="sm" variant="secondary" className="mt-3 w-full">
                          Continue watching
                        </Button>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">No video history yet. Start watching videos!</p>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {userRole === 'mentor' ? (
            <Card className="bg-blue-50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-800">
              <CardHeader>
                <CardTitle>Mentor Summary</CardTitle>
                <CardDescription>Active batches and alerts</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border bg-muted/40 p-3">
                    <p className="text-xs text-muted-foreground">Batch handled</p>
                    <p className="text-lg font-semibold">{mentorSummary.batch}</p>
                  </div>
                  <div className="rounded-lg border bg-muted/40 p-3">
                    <p className="text-xs text-muted-foreground">Students</p>
                    <p className="text-lg font-semibold">{mentorSummary.studentCount}</p>
                  </div>
                  <div className="rounded-lg border bg-muted/40 p-3">
                    <p className="text-xs text-muted-foreground">Alerts</p>
                    <p className="text-lg font-semibold text-amber-600">{mentorSummary.alerts}</p>
                  </div>
                  <div className="rounded-lg border bg-muted/40 p-3">
                    <p className="text-xs text-muted-foreground">At risk</p>
                    <p className="text-lg font-semibold text-rose-600">{mentorSummary.atRisk}</p>
                  </div>
                </div>
                <Separator />
                <div className="space-y-3">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">Recent interactions</p>
                  {mentorSummary.interactions.map((item) => (
                    <div key={item.name} className="rounded-md border px-3 py-2">
                      <p className="text-sm font-medium">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{item.action}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-blue-50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-800">
              <CardHeader>
                <CardTitle>Job Application Summary</CardTitle>
                <CardDescription>Track applications and recommendations</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border bg-muted/40 p-3">
                    <p className="text-xs text-muted-foreground">Applied</p>
                    <p className="text-2xl font-semibold">{jobInsights.applied}</p>
                  </div>
                  <div className="rounded-lg border bg-muted/40 p-3">
                    <p className="text-xs text-muted-foreground">Saved jobs</p>
                    <p className="text-2xl font-semibold">{jobInsights.saved}</p>
                  </div>
                  <div className="rounded-lg border bg-muted/40 p-3">
                    <p className="text-xs text-muted-foreground">Recommended</p>
                    <p className="text-2xl font-semibold">{jobInsights.recommended}</p>
                  </div>
                  <div className="rounded-lg border bg-muted/40 p-3">
                    <p className="text-xs text-muted-foreground">Last application</p>
                    <p className="text-base font-semibold">{jobInsights.lastApplied}</p>
                  </div>
                </div>
                <Button variant="secondary" className="w-full">
                  View job board
                </Button>
              </CardContent>
            </Card>
          )}
        </div>




      </main>
    </div>
  );
}


