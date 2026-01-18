import { StudentNavbar } from '@/components/StudentNavbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { QuizGenerator } from '@/components/QuizGenerator';
import { ActivityHeatmap } from '@/components/ActivityHeatmap';
import { getActivityStreak, recordActivity, getTotalActivityCount } from '@/services/activityTracker';
import {
  analyzeLearnerPerformance,
  getRecommendedVideos,
  getSubjectRecommendedVideos,
  type AdaptiveLearningInsights
} from '@/services/personalizedRecommendations';
import {
  getWeakAreas,
  getSubjectPerformance,
  getQuizResults,
  getRecentWeakAreas,
  getRecentStrongAreas,
  getRecentAverageAreas,
  groupTopicsBySubject,
  type WeakArea,
  type StrongArea,
  type AverageArea
} from '@/services/quizResults';
import { type YouTubeVideo } from '@/services/youtube';
import { youtubeQueue } from '@/services/youtubeQueue';
import { supabase } from '@/integrations/supabase/client';
import { getTodayGoals, addGoal, toggleGoal, deleteGoal, createGoalFromSession, type Goal } from '@/services/goals';
import { getUpcomingSessions, getSessionsByDay, type DayOfWeek } from '@/services/timetable';
import {
  Target,
  Clock,
  Award,
  AlertCircle,
  BookOpen,
  Zap,
  Video,
  PlayCircle,
  Lightbulb,
  Brain,
  BarChart3,
  Plus,
  Trash2,
  CheckCircle2,
  Circle,
  Loader2,
  ArrowRight,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { GoalList } from '@/components/dashboard/GoalList';
import { LearningProgress } from '@/components/dashboard/LearningProgress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Info } from 'lucide-react';

export default function StudentDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showQuiz, setShowQuiz] = useState(false);
  const [streak, setStreak] = useState(0);
  const [insights, setInsights] = useState<AdaptiveLearningInsights | null>(null);
  const [recommendedVideos, setRecommendedVideos] = useState<Map<string, YouTubeVideo[]>>(new Map());
  const [subjectVideos, setSubjectVideos] = useState<Map<string, YouTubeVideo[]>>(new Map());
  const [loadingVideos, setLoadingVideos] = useState(false);
  const [videoQueueStatus, setVideoQueueStatus] = useState<string>('');
  const [userName, setUserName] = useState('Student');
  const [todayGoals, setTodayGoals] = useState<Goal[]>([]);
  const [newGoalText, setNewGoalText] = useState('');
  const [isAddingGoal, setIsAddingGoal] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [videosExpanded, setVideosExpanded] = useState(false);
  const [showAllStrengths, setShowAllStrengths] = useState(false);
  const [showAllAverage, setShowAllAverage] = useState(false);
  const [showAllWeaknesses, setShowAllWeaknesses] = useState(false);
  const [allStrengths, setAllStrengths] = useState<Record<string, StrongArea[]>>({});
  const [allAverage, setAllAverage] = useState<Record<string, AverageArea[]>>({});
  const [allWeaknesses, setAllWeaknesses] = useState<Record<string, WeakArea[]>>({});
  useEffect(() => {
    // Load user profile to get name
    const loadUserProfile = async () => {
      if (!user) return;

      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .single();

        if (profile?.full_name) {
          setUserName(profile.full_name.split(' ')[0] || 'Student');
        } else if (user?.user_metadata?.full_name) {
          setUserName(user.user_metadata.full_name.split(' ')[0] || 'Student');
        }
      } catch (error) {
        console.error('Error loading user profile:', error);
      }
    };

    // Load today's goals from storage and sync with timetable
    const loadTodayGoals = async () => {
      if (!user) return;

      try {
        const storedGoals = getTodayGoals();
        const todayDay: DayOfWeek = (() => {
          const dayNames: DayOfWeek[] = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
          return dayNames[new Date().getDay()];
        })();

        // Get today's timetable sessions
        const todaySessions = await getSessionsByDay(user.id, todayDay);

        // Create goals for timetable sessions that don't have goals yet
        const sessionGoalIds = new Set(storedGoals.filter(g => g.timetableSessionId).map(g => g.timetableSessionId));
        const newGoals: Goal[] = [];

        for (const session of todaySessions) {
          if (session.id && !sessionGoalIds.has(session.id)) {
            const goal = createGoalFromSession(session);
            newGoals.push(goal);
          }
        }

        // Merge stored goals with new goals from sessions
        const allGoals = [...storedGoals, ...newGoals];

        // Update goals that are linked to sessions to sync completion status
        const completedSessions = JSON.parse(localStorage.getItem('completed_sessions') || '[]');
        const syncedGoals = allGoals.map(goal => {
          if (goal.timetableSessionId && completedSessions.includes(goal.timetableSessionId)) {
            return { ...goal, completed: true };
          }
          return goal;
        });

        setTodayGoals(syncedGoals);
      } catch (error) {
        console.error('Error loading today\'s goals:', error);
        // Fallback to just stored goals
        const goals = getTodayGoals();
        setTodayGoals(goals);
      }
    };

    // Record dashboard view activity (once per day)
    const today = new Date().toISOString().split('T')[0];
    const lastDashboardView = localStorage.getItem(`dashboard_view_${today}`);
    if (!lastDashboardView) {
      // Activity recording removed
      localStorage.setItem(`dashboard_view_${today}`, 'true');
    }

    // Update streak from activity tracker
    const currentStreak = getActivityStreak();
    setStreak(currentStreak);

    // Load user profile and goals
    loadUserProfile();
    loadTodayGoals();

    // Load personalized insights
    loadPersonalizedInsights();

    // Listen for timetable updates to sync goals
    const handleTimetableUpdate = () => {
      loadTodayGoals();
    };

    // Listen for goals updates
    const handleGoalsUpdate = () => {
      loadTodayGoals();
    };

    // Listen for activity updates
    const handleActivityUpdate = () => {
      setStreak(getActivityStreak());
      setRefreshTrigger(prev => prev + 1); // Trigger recalculation of XP
    };

    // Listen for quiz completion to refresh recommendations
    const handleQuizComplete = () => {
      loadPersonalizedInsights();
      setRefreshTrigger(prev => prev + 1); // Trigger recalculation of XP
    };

    window.addEventListener('timetable-updated', handleTimetableUpdate);
    window.addEventListener('goals-updated', handleGoalsUpdate);
    window.addEventListener('activity-updated', handleActivityUpdate);
    window.addEventListener('quiz-completed', handleQuizComplete);

    return () => {
      window.removeEventListener('timetable-updated', handleTimetableUpdate);
      window.removeEventListener('goals-updated', handleGoalsUpdate);
      window.removeEventListener('activity-updated', handleActivityUpdate);
      window.removeEventListener('quiz-completed', handleQuizComplete);
    };
  }, [user]);

  const loadPersonalizedInsights = async () => {
    const adaptiveInsights = analyzeLearnerPerformance();
    setInsights(adaptiveInsights);

    // Load detailed stats for "All Topics" view
    const allStrengthsData = getRecentStrongAreas(100);
    const allAverageData = getRecentAverageAreas(100);
    const allWeaknessesData = getRecentWeakAreas(100);
    setAllStrengths(groupTopicsBySubject(allStrengthsData));
    setAllAverage(groupTopicsBySubject(allAverageData));
    setAllWeaknesses(groupTopicsBySubject(allWeaknessesData));

    setLoadingVideos(true);
    setVideoQueueStatus('Fetching recommended videos...');

    try {
      // Load recommended videos for weak areas (one API call at a time via queue)
      // Use getRecentWeakAreas to prioritize latest quizzes for videos too, as requested
      const weakAreas = getRecentWeakAreas(5);
      if (weakAreas.length > 0) {
        setVideoQueueStatus(`Loading videos for ${weakAreas.length} weak areas...`);
        const videoMap = await getRecommendedVideos(weakAreas, 6);
        setRecommendedVideos(videoMap);
        console.log(`[Dashboard] Loaded ${videoMap.size} weak area video sets`);
      }

      // Load videos for focus subjects from study plan (one API call at a time via queue)
      if (adaptiveInsights.studyPlan.focusSubjects.length > 0) {
        setVideoQueueStatus(`Loading videos for ${adaptiveInsights.studyPlan.focusSubjects.length} focus subjects...`);
        const subjectVideoMap = await getSubjectRecommendedVideos(
          adaptiveInsights.studyPlan.focusSubjects,
          4 // 4 videos per subject
        );
        setSubjectVideos(subjectVideoMap);
        console.log(`[Dashboard] Loaded ${subjectVideoMap.size} subject video sets`);
      }

      setVideoQueueStatus('');
    } catch (error) {
      console.error('Error loading recommended videos:', error);
      setVideoQueueStatus('Error loading videos. Using cached data if available.');
    } finally {
      setLoadingVideos(false);
    }
  };

  // Calculate XP dynamically
  const xpData = useMemo(() => {
    const quizResults = getQuizResults();
    const activities = getTotalActivityCount();
    const xp = quizResults.length * 50 + activities * 10; // 50 XP per quiz, 10 XP per activity
    const currentLevel = Math.floor(xp / 300); // Level up every 300 XP
    const xpInLevel = xp % 300;
    const xpNeeded = 300 - xpInLevel;
    return { xp, currentLevel, xpInLevel, xpNeeded };
  }, [refreshTrigger]); // Recalculate when activities/quizzes update

  // Get subject performance for learning progress
  const subjectPerformance = useMemo(() => {
    return getSubjectPerformance();
  }, [refreshTrigger]); // Recalculate when quizzes update

  // Handle adding a new goal
  const handleAddGoal = async () => {
    const trimmedText = newGoalText.trim();
    if (!trimmedText) return;

    try {
      const newGoal = await addGoal(trimmedText, user?.id);
      setTodayGoals(prev => [...prev, newGoal]);
      setNewGoalText('');
      setIsAddingGoal(false);
      // Dispatch event to refresh timetable
      window.dispatchEvent(new CustomEvent('timetable-updated'));
    } catch (error) {
      console.error('Error adding goal:', error);
    }
  };

  // Handle toggling goal completion
  const handleToggleGoal = async (goalId: string) => {
    try {
      await toggleGoal(goalId);
      setTodayGoals(prev =>
        prev.map(goal =>
          goal.id === goalId
            ? { ...goal, completed: !goal.completed, completedAt: !goal.completed ? new Date().toISOString() : undefined }
            : goal
        )
      );
      // Dispatch event to refresh timetable
      window.dispatchEvent(new CustomEvent('timetable-updated'));
    } catch (error) {
      console.error('Error toggling goal:', error);
    }
  };

  // Handle deleting a goal
  const handleDeleteGoal = async (goalId: string) => {
    try {
      await deleteGoal(goalId, undefined, true); // Also delete timetable session
      setTodayGoals(prev => prev.filter(goal => goal.id !== goalId));
      // Dispatch event to refresh timetable
      window.dispatchEvent(new CustomEvent('timetable-updated'));
    } catch (error) {
      console.error('Error deleting goal:', error);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-12">
      <StudentNavbar />

      <main className="container mx-auto px-4 py-8 max-w-7xl">
        <DashboardHeader
          userName={userName}
          streak={streak}
          xpData={xpData}
        />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Main Content Column */}
          <div className="lg:col-span-8 space-y-8">
            {/* Personalized Recommendations Section */}
            {insights && (
              <section className="space-y-8">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h2 className="text-2xl font-bold tracking-tight">Personalized Recommendations</h2>
                    <p className="text-sm text-muted-foreground">
                      Based on your latest quizzes, showing top 5 results. Click the info button <Info className="inline h-3 w-3 mb-0.5" /> for a detailed view of all topics.
                    </p>
                  </div>
                </div>




                <div className="flex flex-col gap-6">
                  {/* Strong Topics */}
                  <Card className="bg-gradient-to-br from-green-50/50 to-transparent dark:from-green-950/10 h-full">
                    <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
                      <CardTitle className="text-base flex items-center gap-2 text-green-700 dark:text-green-400">
                        <Award className="h-4 w-4" />
                        Your Strengths
                      </CardTitle>
                      <Dialog open={showAllStrengths} onOpenChange={setShowAllStrengths}>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-green-700/50 hover:text-green-700 hover:bg-green-100/50">
                            <Info className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md">
                          <DialogHeader>
                            <DialogTitle>All Strengths</DialogTitle>
                            <DialogDescription>
                              Topics where you have achieved &gt;80% accuracy.
                            </DialogDescription>
                          </DialogHeader>
                          <ScrollArea className="h-[60vh] pr-4">
                            <div className="space-y-6">
                              {Object.entries(allStrengths).length > 0 ? (
                                Object.entries(allStrengths).map(([subject, areas]) => (
                                  <div key={subject} className="space-y-2">
                                    <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">{subject}</h4>
                                    <div className="flex flex-wrap gap-2">
                                      {areas.map(area => (
                                        <Badge key={area.topic} variant="secondary" className="bg-green-500/10 text-green-700 dark:text-green-400 border-none">
                                          {area.topic}
                                          <span className="ml-1 opacity-60 text-[10px]">{Math.round(area.accuracy)}%</span>
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <p className="text-center text-muted-foreground py-8">No strengths recorded yet.</p>
                              )}
                            </div>
                          </ScrollArea>
                        </DialogContent>
                      </Dialog>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {insights.strengths.length > 0 ? (
                          insights.strengths.map(s => (
                            <Badge key={s} variant="secondary" className="bg-green-500/10 text-green-700 dark:text-green-400 border-none">
                              {s}
                            </Badge>
                          ))
                        ) : (
                          <p className="text-xs text-muted-foreground italic">Keep learning to discover your strengths!</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Average Topics */}
                  <Card className="bg-gradient-to-br from-yellow-50/50 to-transparent dark:from-yellow-950/10 h-full">
                    <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
                      <CardTitle className="text-base flex items-center gap-2 text-yellow-700 dark:text-yellow-400">
                        <Target className="h-4 w-4" />
                        Developing Skills
                      </CardTitle>
                      <Dialog open={showAllAverage} onOpenChange={setShowAllAverage}>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-yellow-700/50 hover:text-yellow-700 hover:bg-yellow-100/50">
                            <Info className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md">
                          <DialogHeader>
                            <DialogTitle>Developing Skills</DialogTitle>
                            <DialogDescription>
                              Topics with 60-79% accuracy. You're getting there!
                            </DialogDescription>
                          </DialogHeader>
                          <ScrollArea className="h-[60vh] pr-4">
                            <div className="space-y-6">
                              {Object.entries(allAverage).length > 0 ? (
                                Object.entries(allAverage).map(([subject, areas]) => (
                                  <div key={subject} className="space-y-2">
                                    <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">{subject}</h4>
                                    <div className="flex flex-wrap gap-2">
                                      {areas.map(area => (
                                        <Badge key={area.topic} variant="secondary" className="bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-none">
                                          {area.topic}
                                          <span className="ml-1 opacity-60 text-[10px]">{Math.round(area.accuracy)}%</span>
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <p className="text-center text-muted-foreground py-8">No developing skills yet.</p>
                              )}
                            </div>
                          </ScrollArea>
                        </DialogContent>
                      </Dialog>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {insights.averageAreas.length > 0 ? (
                          insights.averageAreas.map(s => (
                            <Badge key={s} variant="secondary" className="bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-none">
                              {s}
                            </Badge>
                          ))
                        ) : (
                          <p className="text-xs text-muted-foreground italic">No topics in this range yet.</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Weak Topics */}
                  <Card className="bg-gradient-to-br from-red-50/50 to-transparent dark:from-red-950/10 h-full">
                    <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
                      <CardTitle className="text-base flex items-center gap-2 text-red-700 dark:text-red-400">
                        <AlertCircle className="h-4 w-4" />
                        Areas for Improvement
                      </CardTitle>
                      <Dialog open={showAllWeaknesses} onOpenChange={setShowAllWeaknesses}>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-red-700/50 hover:text-red-700 hover:bg-red-100/50">
                            <Info className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md">
                          <DialogHeader>
                            <DialogTitle>Areas for Improvement</DialogTitle>
                            <DialogDescription>
                              Topics where accuracy is &lt;60%.
                            </DialogDescription>
                          </DialogHeader>
                          <ScrollArea className="h-[60vh] pr-4">
                            <div className="space-y-6">
                              {Object.entries(allWeaknesses).length > 0 ? (
                                Object.entries(allWeaknesses).map(([subject, areas]) => (
                                  <div key={subject} className="space-y-2">
                                    <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">{subject}</h4>
                                    <div className="flex flex-wrap gap-2">
                                      {areas.map(area => (
                                        <Badge key={area.topic} variant="secondary" className="bg-red-500/10 text-red-700 dark:text-red-400 border-none">
                                          {area.topic}
                                          <span className="ml-1 opacity-60 text-[10px]">{Math.round(area.accuracy)}%</span>
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <p className="text-center text-muted-foreground py-8">No weak areas identified!</p>
                              )}
                            </div>
                          </ScrollArea>
                        </DialogContent>
                      </Dialog>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {insights.focusAreas.length > 0 ? (
                          insights.focusAreas.map(f => (
                            <Badge key={f} variant="secondary" className="bg-red-500/10 text-red-700 dark:text-red-400 border-none">
                              {f}
                            </Badge>
                          ))
                        ) : (
                          <p className="text-xs text-muted-foreground italic">No weak areas identified yet. Great job!</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Subsection: Watch videos to improve your weak areas */}
                {recommendedVideos.size > 0 ? (
                  <div className="pt-8 border-t border-primary/5 space-y-6">
                    <button
                      onClick={() => setVideosExpanded(!videosExpanded)}
                      className="flex items-center gap-2 w-full text-left hover:opacity-80 transition-opacity"
                    >
                      {videosExpanded ? (
                        <ChevronDown className="h-5 w-5 text-primary" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-primary" />
                      )}
                      <PlayCircle className="h-6 w-6 text-primary" />
                      <h3 className="text-xl font-bold italic tracking-tight text-primary">Watch videos to improve your weak areas</h3>
                    </button>

                    {videosExpanded && (
                      <div className="space-y-10 mt-6">
                        {Array.from(recommendedVideos.entries()).map(([key, videos]) => {
                          const [subject, topic] = key.split('::');
                          return (
                            <div key={key} className="space-y-4">
                              <div className="flex items-center gap-3">
                                <div className="h-6 w-1 bg-destructive rounded-full" />
                                <h4 className="text-lg font-bold">{topic}</h4>
                              </div>
                              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {videos.slice(0, 3).map((video) => (
                                  <Card key={video.id.videoId} className="overflow-hidden group bg-card/50 backdrop-blur-sm">
                                    <div className="relative aspect-video bg-muted overflow-hidden">
                                      <img
                                        src={video.snippet.thumbnails.high?.url || video.snippet.thumbnails.medium.url}
                                        alt={video.snippet.title}
                                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                      />
                                      <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/50 transition-all opacity-0 group-hover:opacity-100">
                                        <a
                                          href={`https://www.youtube.com/watch?v=${video.id.videoId}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="p-2 bg-white/20 backdrop-blur-md rounded-full text-white hover:scale-110 transition-transform"
                                          onClick={() => {
                                            recordActivity('video_watched', {
                                              videoId: video.id.videoId,
                                              title: video.snippet.title,
                                              source: 'dashboard_weak_area'
                                            });
                                            window.dispatchEvent(new CustomEvent('activity-updated'));
                                          }}
                                        >
                                          <PlayCircle className="h-8 w-8 fill-white" />
                                        </a>
                                      </div>
                                    </div>
                                    <CardContent className="p-4">
                                      <h5 className="font-bold text-sm mb-1 line-clamp-2 group-hover:text-primary transition-colors">
                                        {video.snippet.title}
                                      </h5>
                                      <p className="text-xs text-muted-foreground">
                                        {video.snippet.channelTitle}
                                      </p>
                                    </CardContent>
                                  </Card>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="pt-8 border-t border-primary/5 text-center py-12">
                    <Video className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-20" />
                    <h3 className="text-lg font-medium mb-1">Personalized Videos are Coming!</h3>
                    <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                      {insights.focusAreas.length > 0
                        ? "We're matching your weak areas with the best video lessons. They'll appear here shortly!"
                        : "Take a quiz to unlock personalized video recommendations tailored to your performance."}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-6 border-primary/20 hover:bg-primary/5"
                      onClick={() => setShowQuiz(true)}
                    >
                      <Brain className="h-4 w-4 mr-2 text-primary" />
                      Take Your First Quiz
                    </Button>
                  </div>
                )}
              </section>
            )}

            {/* Activity Heatmap */}
            <section className="pt-4">
              <ActivityHeatmap />
            </section>
          </div>

          {/* Sidebar Column */}
          <div className="lg:col-span-4 space-y-8">
            <QuickActions onTakeQuiz={() => setShowQuiz(true)} />

            <GoalList
              goals={todayGoals}
              isAddingGoal={isAddingGoal}
              newGoalText={newGoalText}
              onAddGoal={handleAddGoal}
              onToggleGoal={handleToggleGoal}
              onDeleteGoal={handleDeleteGoal}
              onSetNewGoalText={setNewGoalText}
              onSetIsAddingGoal={setIsAddingGoal}
            />

            <LearningProgress performance={subjectPerformance} />


          </div>
        </div>
      </main >

      {showQuiz && <QuizGenerator onClose={() => setShowQuiz(false)} />
      }
    </div >
  );
}
