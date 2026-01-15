import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Loader2, CheckCircle2, XCircle, ArrowLeft } from 'lucide-react';
import { generateQuiz, QuizQuestion, getAllBranches, getAllYears, getSemestersForYear, getSubjectsForBranchSemester } from '@/services/quiz';
import { saveQuizResult, type QuizAnswer } from '@/services/quizResults';
import { recordActivity } from '@/services/activityTracker';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface QuizGeneratorProps {
  onClose?: () => void;
}

export function QuizGenerator({ onClose }: QuizGeneratorProps) {
  const [branch, setBranch] = useState<string>('');
  const [year, setYear] = useState<string>('');
  const [semester, setSemester] = useState<string>('');
  const [subject, setSubject] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [quiz, setQuiz] = useState<QuizQuestion[] | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [questionStartTimes, setQuestionStartTimes] = useState<Record<number, number>>({});
  const [showResults, setShowResults] = useState(false);
  const [error, setError] = useState<string>('');
  const [quizStartTime, setQuizStartTime] = useState<number | null>(null);

  const branches = getAllBranches();
  const years = getAllYears();
  const semesters = year ? getSemestersForYear(year) : [];
  const subjects = branch && year && semester ? getSubjectsForBranchSemester(branch, year, semester) : [];

  const handleGenerate = async () => {
    if (!branch || !semester || !subject) {
      setError('Please select branch, semester, and subject');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const quizData = await generateQuiz(branch, semester, subject);
      setQuiz(quizData.questions);
      setCurrentQuestion(0);
      setAnswers({});
      setQuestionStartTimes({});
      setShowResults(false);
      setQuizStartTime(Date.now());
    } catch (err) {
      console.error('Quiz generation error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate quiz. Please try again.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = (option: string) => {
    setAnswers((prev) => ({ ...prev, [currentQuestion]: option }));
    // Track when question was started (if not already tracked)
    if (!questionStartTimes[currentQuestion]) {
      setQuestionStartTimes((prev) => ({ ...prev, [currentQuestion]: Date.now() }));
    }
  };

  // Track question start time
  useEffect(() => {
    if (quiz && currentQuestion >= 0 && !questionStartTimes[currentQuestion]) {
      setQuestionStartTimes((prev) => ({ ...prev, [currentQuestion]: Date.now() }));
    }
  }, [currentQuestion, quiz, questionStartTimes]);

  const handleNext = () => {
    if (currentQuestion < (quiz?.length || 0) - 1) {
      setCurrentQuestion((prev) => prev + 1);
    } else {
      setShowResults(true);
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion((prev) => prev - 1);
    }
  };

  const handleSubmit = () => {
    if (!quiz || !subject || !branch || !semester || !quizStartTime) return;

    // Calculate results and save
    const totalTime = (Date.now() - quizStartTime) / 1000; // in seconds
    const quizAnswers: QuizAnswer[] = quiz.map((question, index) => {
      const selectedAnswer = answers[index] || '';
      const isCorrect = selectedAnswer === question.correct;
      const timeTaken = questionStartTimes[index]
        ? (Date.now() - questionStartTimes[index]) / 1000
        : totalTime / quiz.length; // Estimate if not tracked

      return {
        qid: question.qid,
        question,
        selectedAnswer,
        correctAnswer: question.correct,
        isCorrect,
        timeTaken,
        hintUsed: false, // Can be enhanced later
        attemptNumber: 1,
        topic: question.topic,
        difficulty: question.difficulty,
        subject,
      };
    });

    // Calculate stats
    const correctCount = quizAnswers.filter(a => a.isCorrect).length;
    const accuracy = (correctCount / quiz.length) * 100;

    // Difficulty stats
    const difficultyStats = {
      easy: { correct: 0, total: 0, accuracy: 0 },
      medium: { correct: 0, total: 0, accuracy: 0 },
      hard: { correct: 0, total: 0, accuracy: 0 },
    };

    quizAnswers.forEach(answer => {
      const diff = answer.difficulty;
      difficultyStats[diff].total++;
      if (answer.isCorrect) {
        difficultyStats[diff].correct++;
      }
    });

    Object.keys(difficultyStats).forEach(diff => {
      const stats = difficultyStats[diff as keyof typeof difficultyStats];
      stats.accuracy = stats.total > 0 ? (stats.correct / stats.total) * 100 : 0;
    });

    // Subject stats
    const subjectStats: { [subject: string]: { correct: number; total: number; accuracy: number } } = {};
    subjectStats[subject] = { correct: correctCount, total: quiz.length, accuracy };

    // Topic stats
    const topicStats: { [topic: string]: { correct: number; total: number; accuracy: number; avgTime: number } } = {};
    quizAnswers.forEach(answer => {
      if (!topicStats[answer.topic]) {
        topicStats[answer.topic] = { correct: 0, total: 0, accuracy: 0, avgTime: 0 };
      }
      topicStats[answer.topic].total++;
      if (answer.isCorrect) {
        topicStats[answer.topic].correct++;
      }
      topicStats[answer.topic].avgTime += answer.timeTaken;
    });

    Object.keys(topicStats).forEach(topic => {
      const stats = topicStats[topic];
      stats.accuracy = stats.total > 0 ? (stats.correct / stats.total) * 100 : 0;
      stats.avgTime = stats.total > 0 ? stats.avgTime / stats.total : 0;
    });

    // Save result
    saveQuizResult({
      quizId: crypto.randomUUID(),
      branch,
      semester,
      subject,
      answers: quizAnswers,
      totalScore: correctCount,
      totalTime,
      accuracy,
      difficultyStats,
      subjectStats,
      topicStats,
      completedAt: new Date().toISOString(),
    });

    // Record activity
    recordActivity('quiz_completed', { subject, branch, semester });

    toast.success('Quiz results saved!', {
      description: 'View your progress in the Practice section',
    });

    // Dispatch events for real-time updates
    window.dispatchEvent(new CustomEvent('quiz-completed'));
    window.dispatchEvent(new CustomEvent('activity-updated'));

    setShowResults(true);
  };

  const calculateScore = () => {
    if (!quiz) return { correct: 0, total: 0, percentage: 0 };
    let correct = 0;
    quiz.forEach((q, index) => {
      if (answers[index] === q.correct) {
        correct++;
      }
    });
    return {
      correct,
      total: quiz.length,
      percentage: Math.round((correct / quiz.length) * 100),
    };
  };

  const score = quiz ? calculateScore() : { correct: 0, total: 0, percentage: 0 };

  if (showResults && quiz) {
    return (
      <Dialog open={true} onOpenChange={(open) => !open && onClose?.()}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Quiz Results</DialogTitle>
            <DialogDescription>
              {subject} - {branch} {semester}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center space-y-4">
                  <div className="text-4xl font-bold text-primary">{score.percentage}%</div>
                  <div className="text-lg text-muted-foreground">
                    You scored {score.correct} out of {score.total} questions
                  </div>
                  <Progress value={score.percentage} className="h-3" />
                </div>
              </CardContent>
            </Card>

            <div className="space-y-4">
              {quiz.map((question, index) => {
                const userAnswer = answers[index];
                const isCorrect = userAnswer === question.correct;
                return (
                  <Card key={question.qid} className={cn(isCorrect ? 'border-green-500' : 'border-red-500')}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-base">
                          Question {index + 1}: {question.question}
                        </CardTitle>
                        <Badge variant={isCorrect ? 'default' : 'destructive'}>
                          {isCorrect ? <CheckCircle2 className="h-4 w-4 mr-1" /> : <XCircle className="h-4 w-4 mr-1" />}
                          {isCorrect ? 'Correct' : 'Incorrect'}
                        </Badge>
                      </div>
                      <CardDescription>
                        Topic: {question.topic} · Difficulty: {question.difficulty}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        {Object.entries(question.options).map(([key, value]) => {
                          const isSelected = userAnswer === key;
                          const isCorrectOption = key === question.correct;
                          return (
                            <div
                              key={key}
                              className={cn(
                                'p-3 rounded-lg border-2',
                                isCorrectOption
                                  ? 'border-green-500 bg-green-50 dark:bg-green-950'
                                  : isSelected
                                    ? 'border-red-500 bg-red-50 dark:bg-red-950'
                                    : 'border-border'
                              )}
                            >
                              <div className="flex items-center gap-2">
                                <span className="font-semibold">{key}.</span>
                                <span>{value}</span>
                                {isCorrectOption && <CheckCircle2 className="h-4 w-4 text-green-600 ml-auto" />}
                                {isSelected && !isCorrectOption && <XCircle className="h-4 w-4 text-red-600 ml-auto" />}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <div className="p-3 bg-muted rounded-lg">
                        <p className="text-sm font-medium mb-1">Explanation:</p>
                        <p className="text-sm text-muted-foreground">{question.explanation}</p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => {
                setShowResults(false);
                setCurrentQuestion(0);
                setAnswers({});
                setQuestionStartTimes({});
                setQuizStartTime(Date.now());
              }}>
                Retake Quiz
              </Button>
              <Button variant="outline" onClick={() => {
                setQuiz(null);
                setShowResults(false);
                setAnswers({});
                setQuestionStartTimes({});
                setQuizStartTime(null);
              }}>
                New Quiz
              </Button>
              {onClose && (
                <Button onClick={onClose} className="ml-auto">
                  Close
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (quiz && !showResults) {
    const question = quiz[currentQuestion];
    const userAnswer = answers[currentQuestion];

    return (
      <Dialog open={true} onOpenChange={(open) => !open && onClose?.()}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Quiz: {subject} - {branch} {semester}
            </DialogTitle>
            <DialogDescription>
              Question {currentQuestion + 1} of {quiz.length}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Progress value={((currentQuestion + 1) / quiz.length) * 100} className="h-2" />

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{question.question}</CardTitle>
                <CardDescription>
                  Topic: {question.topic} · Difficulty: <Badge variant="outline">{question.difficulty}</Badge>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(question.options).map(([key, value]) => (
                    <button
                      key={key}
                      onClick={() => handleAnswer(key)}
                      className={cn(
                        'w-full p-4 text-left rounded-lg border-2 transition-all',
                        userAnswer === key
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:border-primary/50'
                      )}
                    >
                      <span className="font-semibold mr-2">{key}.</span>
                      {value}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-between">
              <Button variant="outline" onClick={handlePrevious} disabled={currentQuestion === 0}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Previous
              </Button>
              <div className="flex gap-2">
                {currentQuestion === quiz.length - 1 ? (
                  <Button onClick={handleSubmit} disabled={!userAnswer}>
                    Submit Quiz
                  </Button>
                ) : (
                  <Button onClick={handleNext} disabled={!userAnswer}>
                    Next
                  </Button>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose?.()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Take Quiz</DialogTitle>
          <DialogDescription>Generate a personalized quiz based on your branch, semester, and subject</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Branch</Label>
            <Select value={branch} onValueChange={(value) => { setBranch(value); setYear(''); setSemester(''); setSubject(''); }}>
              <SelectTrigger>
                <SelectValue placeholder="Select branch" />
              </SelectTrigger>
              <SelectContent>
                {branches.map((b) => (
                  <SelectItem key={b} value={b}>
                    {b}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {branch && (
            <div className="space-y-2">
              <Label>Year</Label>
              <Select value={year} onValueChange={(value) => { setYear(value); setSemester(''); setSubject(''); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent>
                  {years.map((y) => (
                    <SelectItem key={y} value={y}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {year && (
            <div className="space-y-2">
              <Label>Semester</Label>
              <Select value={semester} onValueChange={(value) => { setSemester(value); setSubject(''); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select semester" />
                </SelectTrigger>
                <SelectContent>
                  {semesters.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {semester && (
            <div className="space-y-2">
              <Label>Subject</Label>
              <Select value={subject} onValueChange={setSubject}>
                <SelectTrigger>
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {error && (
            <div className="p-3 bg-destructive/10 text-destructive rounded-lg text-sm">{error}</div>
          )}

          <div className="flex justify-end gap-2">
            {onClose && (
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
            )}
            <Button onClick={handleGenerate} disabled={loading || !branch || !semester || !subject}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating Quiz...
                </>
              ) : (
                'Generate Quiz'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

