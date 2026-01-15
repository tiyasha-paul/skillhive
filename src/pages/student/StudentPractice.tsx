import { useState, useEffect } from 'react';
import { StudentNavbar } from '@/components/StudentNavbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  getPerformanceMetrics,
  getProgressOverTime,
  getSubjectPerformance,
  getWeakAreas,
  getStrongAreas,
  getDifficultyDistribution,
  getSkillRadarData,
  type PerformanceMetrics,
  type ProgressDataPoint,
  type SubjectPerformance,
  type WeakArea,
  type StrongArea,
  type DifficultyDistribution,
  type SkillRadarData,
} from '@/services/quizResults';
import { recordActivity } from '@/services/activityTracker';
import { searchVideosForTopic, type YouTubeVideo } from '@/services/youtube';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Target,
  Clock,
  Award,
  AlertCircle,
  BookOpen,
  Zap,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
  Lightbulb,
  Loader2,
  MessageSquare,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const COLORS = {
  easy: '#10b981',
  medium: '#f59e0b',
  hard: '#ef4444',
  primary: '#3b82f6',
  secondary: '#8b5cf6',
};

export default function StudentPractice() {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [progressData, setProgressData] = useState<ProgressDataPoint[]>([]);
  const [subjectData, setSubjectData] = useState<SubjectPerformance[]>([]);
  const [weakAreas, setWeakAreas] = useState<WeakArea[]>([]);
  const [strongAreas, setStrongAreas] = useState<StrongArea[]>([]);
  const [difficultyData, setDifficultyData] = useState<DifficultyDistribution | null>(null);
  const [skillData, setSkillData] = useState<SkillRadarData | null>(null);
  const [insights, setInsights] = useState<string[]>([]);
  const [weakAreaVideos, setWeakAreaVideos] = useState<Map<string, YouTubeVideo[]>>(new Map());
  const [loadingVideos, setLoadingVideos] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Record activity when viewing practice page
    // Activity recording removed per user request
    window.dispatchEvent(new CustomEvent('activity-updated'));

    loadAnalytics();

    // Listen for quiz completion events
    const handleQuizComplete = () => {
      loadAnalytics();
    };

    window.addEventListener('quiz-completed', handleQuizComplete);

    return () => {
      window.removeEventListener('quiz-completed', handleQuizComplete);
    };
  }, []);

  const loadAnalytics = () => {
    const perfMetrics = getPerformanceMetrics();
    const progress = getProgressOverTime();
    const subjects = getSubjectPerformance();
    const weak = getWeakAreas();
    const strong = getStrongAreas();
    const difficulty = getDifficultyDistribution();
    const skills = getSkillRadarData();

    setMetrics(perfMetrics);
    setProgressData(progress);
    setSubjectData(subjects);
    setWeakAreas(weak);
    setStrongAreas(strong);
    setDifficultyData(difficulty);
    setSkillData(skills);

    // Generate insights
    const generatedInsights = generateInsights(perfMetrics, progress, weak, strong);
    setInsights(generatedInsights);

    // Fetch YouTube videos for weak areas
    fetchVideosForWeakAreas(weak);
  };

  const fetchVideosForWeakAreas = async (weakAreas: WeakArea[]) => {
    // Fetch videos for top 6 weak areas
    const topWeakAreas = weakAreas.slice(0, 6);

    // Fetch videos in parallel for better performance
    const videoPromises = topWeakAreas.map(async (area) => {
      const key = `${area.subject}::${area.topic}`;

      // Skip if already loaded or loading
      if (weakAreaVideos.has(key) || loadingVideos.has(key)) {
        return;
      }

      setLoadingVideos(prev => new Set(prev).add(key));

      try {
        console.log(`Fetching YouTube videos for weak area: ${area.topic} (${area.subject})`);
        const videos = await searchVideosForTopic(area.topic, area.subject, 5); // Get 5 videos per topic

        if (videos.length > 0) {
          console.log(`Successfully fetched ${videos.length} videos for ${area.topic}`);
          setWeakAreaVideos(prev => {
            const newMap = new Map(prev);
            newMap.set(key, videos);
            return newMap;
          });
        } else {
          console.warn(`No videos found for ${area.topic}`);
        }
      } catch (error) {
        console.error(`Error fetching videos for ${area.topic}:`, error);
        // Set empty array to indicate we tried but failed
        setWeakAreaVideos(prev => {
          const newMap = new Map(prev);
          newMap.set(key, []);
          return newMap;
        });
      } finally {
        setLoadingVideos(prev => {
          const newSet = new Set(prev);
          newSet.delete(key);
          return newSet;
        });
      }
    });

    // Wait for all video fetches to complete
    await Promise.all(videoPromises);
  };

  const generateInsights = (
    metrics: PerformanceMetrics,
    progress: ProgressDataPoint[],
    weak: WeakArea[],
    strong: StrongArea[]
  ): string[] => {
    const insights: string[] = [];

    if (progress.length >= 2) {
      const recent = progress.slice(-3);
      const older = progress.slice(0, Math.max(1, progress.length - 3));
      if (recent.length > 0 && older.length > 0) {
        const recentAvg = recent.reduce((sum, p) => sum + p.accuracy, 0) / recent.length;
        const olderAvg = older.reduce((sum, p) => sum + p.accuracy, 0) / older.length;
        const improvement = recentAvg - olderAvg;
        if (improvement > 5) {
          insights.push(`Your accuracy improved by ${improvement.toFixed(1)}% recently! Keep up the great work.`);
        } else if (improvement < -5) {
          insights.push(`Your accuracy decreased by ${Math.abs(improvement).toFixed(1)}%. Consider reviewing previous topics.`);
        }
      }
    }

    if (metrics.difficultySuccessRate.hard > 50) {
      insights.push(`Excellent! You're handling hard questions well with ${metrics.difficultySuccessRate.hard.toFixed(1)}% success rate.`);
    } else if (metrics.difficultySuccessRate.hard < 30) {
      insights.push(`Focus on practicing more hard difficulty questions. Current success rate: ${metrics.difficultySuccessRate.hard.toFixed(1)}%`);
    }

    if (weak.length > 0) {
      const topWeak = weak[0];
      insights.push(`You need to work more on ${topWeak.subject}: ${topWeak.topic} (accuracy: ${topWeak.accuracy.toFixed(1)}%)`);
    }

    if (strong.length > 0) {
      const topStrong = strong[0];
      insights.push(`Great job on ${topStrong.subject}: ${topStrong.topic}! You're excelling with ${topStrong.accuracy.toFixed(1)}% accuracy.`);
    }

    if (metrics.averageTimePerQuestion > 120) {
      insights.push(`You're taking ${(metrics.averageTimePerQuestion / 60).toFixed(1)} minutes per question on average. Try to improve your speed.`);
    }

    if (insights.length === 0) {
      insights.push('Keep practicing to see personalized insights and recommendations!');
    }

    return insights;
  };

  // Prepare data for charts
  const difficultyPieData = difficultyData ? [
    { name: 'Easy', value: difficultyData.easy.total, correct: difficultyData.easy.correct },
    { name: 'Medium', value: difficultyData.medium.total, correct: difficultyData.medium.correct },
    { name: 'Hard', value: difficultyData.hard.total, correct: difficultyData.hard.correct },
  ] : [];

  const weakTopicsPieData = weakAreas.slice(0, 5).map(area => ({
    name: area.topic.length > 20 ? `${area.topic.substring(0, 20)}...` : area.topic,
    value: Math.round(100 - area.accuracy),
    fullName: `${area.subject}: ${area.topic}`,
  }));

  const radarData = skillData ? [
    { skill: 'Speed', value: skillData.speed },
    { skill: 'Accuracy', value: skillData.accuracy },
    { skill: 'Consistency', value: skillData.consistency },
    { skill: 'Concept Mastery', value: skillData.conceptMastery },
    { skill: 'Difficulty Handling', value: skillData.difficultyHandling },
    { skill: 'Stability', value: skillData.stability },
  ] : [];

  if (!metrics) {
    return (
      <div className="min-h-screen bg-background">
        <StudentNavbar />
        <main className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="py-12 text-center">
              <Activity className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground mb-4">No quiz data available yet</p>
              <Button onClick={() => navigate('/student/dashboard')}>
                Take Your First Quiz
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <StudentNavbar />

      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
              <BarChart3 className="h-8 w-8" />
              Practice Analytics
            </h1>
            <p className="text-muted-foreground">
              Track your progress, identify weak areas, and improve your performance
            </p>
          </div>
          <Button
            onClick={() => {
              const context = `Here is my current practice summary:
- Average Score: ${metrics.averageScore.toFixed(1)}/10
- Average Accuracy: ${metrics.averageAccuracy.toFixed(1)}%
- Average Time per Question: ${Math.round(metrics.averageTimePerQuestion)}s
- Weakest Subject: ${metrics.weakestSubject.subject} (${metrics.weakestSubject.accuracy.toFixed(1)}%)
- Best Subject: ${metrics.bestSubject.subject} (${metrics.bestSubject.accuracy.toFixed(1)}%)
- Recent Weak Topics: ${weakAreas.slice(0, 3).map(w => w.topic).join(', ')}

Can you give me specific advice on how to improve my weak areas?`;

              window.dispatchEvent(new CustomEvent('open-chatbot-with-context', {
                detail: { context }
              }));
            }}
            className="gap-2"
          >
            <MessageSquare className="h-4 w-4" />
            Ask Study Coach
          </Button>
        </div>

        {/* Performance Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Quizzes</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.totalQuizzes}</div>
              <p className="text-xs text-muted-foreground">Quizzes completed</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Average Score</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.averageScore.toFixed(1)}</div>
              <p className="text-xs text-muted-foreground">Out of 10 questions</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Average Accuracy</CardTitle>
              <Award className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.averageAccuracy.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">Correct answers</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Avg Time/Question</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{Math.round(metrics.averageTimePerQuestion)}s</div>
              <p className="text-xs text-muted-foreground">Per question</p>
            </CardContent>
          </Card>
        </div>

        {/* Difficulty Success Rate */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Easy Questions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {metrics.difficultySuccessRate.easy.toFixed(1)}%
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Medium Questions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {metrics.difficultySuccessRate.medium.toFixed(1)}%
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Hard Questions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {metrics.difficultySuccessRate.hard.toFixed(1)}%
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Best & Weakest Subject */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
                Best Subject
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold">{metrics.bestSubject.subject}</div>
              <p className="text-sm text-muted-foreground">
                {metrics.bestSubject.accuracy.toFixed(1)}% accuracy
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingDown className="h-5 w-5 text-red-600" />
                Weakest Subject
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold">{metrics.weakestSubject.subject}</div>
              <p className="text-sm text-muted-foreground">
                {metrics.weakestSubject.accuracy.toFixed(1)}% accuracy
              </p>
            </CardContent>
          </Card>
        </div>

        {/* AI Insights */}
        {insights.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-yellow-600" />
                Personalized Insights
              </CardTitle>
              <CardDescription>AI-powered recommendations based on your performance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {insights.map((insight, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                    <Zap className="h-5 w-5 text-primary mt-0.5" />
                    <p className="text-sm">{insight}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Progress Over Time - Line Chart */}
        {progressData.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Progress Over Time</CardTitle>
              <CardDescription>Track your score, accuracy, and time efficiency</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={progressData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="score" stroke="#3b82f6" name="Score" />
                  <Line type="monotone" dataKey="accuracy" stroke="#10b981" name="Accuracy %" />
                  <Line type="monotone" dataKey="timeEfficiency" stroke="#f59e0b" name="Questions/Min" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Subject-wise Performance - Bar Chart */}
        {subjectData.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Subject-wise Performance</CardTitle>
              <CardDescription>Average score, attempts, and accuracy by subject</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={subjectData} margin={{ bottom: 80 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="subject" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip />
                  <Legend verticalAlign="top" height={36} />
                  <Bar dataKey="averageScore" fill="#3b82f6" name="Avg Score" />
                  <Bar dataKey="attempts" fill="#8b5cf6" name="Attempts" />
                  <Bar dataKey="accuracy" fill="#10b981" name="Accuracy %" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Difficulty Distribution - Pie Chart */}
          {difficultyPieData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChartIcon className="h-5 w-5" />
                  Difficulty Distribution
                </CardTitle>
                <CardDescription>Questions answered by difficulty level</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={difficultyPieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {difficultyPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[entry.name.toLowerCase() as keyof typeof COLORS] || COLORS.primary} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Weak Topics - Donut Chart */}
          {weakTopicsPieData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                  Weak Topics Distribution
                </CardTitle>
                <CardDescription>Topics needing more practice</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={weakTopicsPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value.toFixed(1)}%`}
                    >
                      {weakTopicsPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS.hard} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number, name: string, props: any) => [
                      `${props.payload.fullName}: ${value}% weakness`,
                      'Weakness'
                    ]} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Skill Radar Chart */}
        {radarData.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Skill Profile
              </CardTitle>
              <CardDescription>Your performance across different skill dimensions</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="skill" />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} />
                  <Radar
                    name="Skills"
                    dataKey="value"
                    stroke="#3b82f6"
                    fill="#3b82f6"
                    fillOpacity={0.6}
                  />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Weak Areas */}
        {weakAreas.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-600" />
                Weak Areas
              </CardTitle>
              <CardDescription>Topics with accuracy below 60% - Focus on these! Watch suggested videos to improve.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {weakAreas.slice(0, 6).map((area, index) => {
                  const videoKey = `${area.subject}::${area.topic}`;
                  const videos = weakAreaVideos.get(videoKey) || [];
                  const isLoading = loadingVideos.has(videoKey);

                  return (
                    <Card key={index} className="border-red-200">
                      <CardHeader>
                        <CardTitle className="text-base">{area.topic}</CardTitle>
                        <CardDescription>{area.subject}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span className="text-sm text-muted-foreground">Accuracy:</span>
                              <Badge variant="destructive">{area.accuracy.toFixed(1)}%</Badge>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-muted-foreground">Avg Time:</span>
                              <span className="text-sm">{Math.round(area.averageTime)}s</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-muted-foreground">Attempts:</span>
                              <span className="text-sm">{area.totalAttempts}</span>
                            </div>
                          </div>

                          {/* Suggested YouTube Videos */}
                          {isLoading && (
                            <div className="text-xs text-muted-foreground flex items-center gap-2 border-t pt-3">
                              <Loader2 className="h-3 w-3 animate-spin" />
                              Loading videos...
                            </div>
                          )}
                          {!isLoading && videos.length > 0 && (
                            <div className="space-y-2 border-t pt-3">
                              <div className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                                <Zap className="h-3 w-3 text-primary" />
                                Suggested Videos to Improve:
                              </div>
                              {videos.map((video, vidIndex) => (
                                <a
                                  key={vidIndex}
                                  href={`https://www.youtube.com/watch?v=${video.id.videoId}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex gap-2 p-2 rounded-lg border hover:bg-muted hover:border-primary transition-all group"
                                >
                                  <img
                                    src={video.snippet.thumbnails.medium.url}
                                    alt={video.snippet.title}
                                    className="w-20 h-14 object-cover rounded flex-shrink-0"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <div className="text-xs font-medium line-clamp-2 group-hover:text-primary transition-colors">
                                      {video.snippet.title}
                                    </div>
                                    <div className="text-[10px] text-muted-foreground mt-1">
                                      {video.snippet.channelTitle}
                                    </div>
                                  </div>
                                </a>
                              ))}
                            </div>
                          )}
                          {!isLoading && videos.length === 0 && weakAreaVideos.has(videoKey) && (
                            <div className="text-xs text-muted-foreground border-t pt-3">
                              No videos found. Try searching manually on YouTube.
                            </div>
                          )}

                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full mt-2"
                            onClick={() => navigate('/student/study-notes')}
                          >
                            <BookOpen className="h-4 w-4 mr-2" />
                            Study Notes
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Strong Areas */}
        {strongAreas.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5 text-green-600" />
                Strong Areas
              </CardTitle>
              <CardDescription>Topics where you excel (80%+ accuracy)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {strongAreas.slice(0, 6).map((area, index) => (
                  <Card key={index} className="border-green-200">
                    <CardHeader>
                      <CardTitle className="text-base">{area.topic}</CardTitle>
                      <CardDescription>{area.subject}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Accuracy:</span>
                          <Badge variant="default" className="bg-green-600">
                            {area.accuracy.toFixed(1)}%
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Avg Time:</span>
                          <span className="text-sm">{Math.round(area.averageTime)}s</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Attempts:</span>
                          <span className="text-sm">{area.totalAttempts}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}

