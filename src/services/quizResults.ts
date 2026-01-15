// Quiz Results Storage and Analytics Service

import type { QuizQuestion } from './quiz';

export interface QuizAnswer {
  qid: string;
  question: QuizQuestion;
  selectedAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  timeTaken: number; // in seconds
  hintUsed: boolean;
  attemptNumber: number;
  topic: string;
  difficulty: 'easy' | 'medium' | 'hard';
  subject: string;
}

export interface QuizResult {
  id: string;
  quizId: string;
  branch: string;
  semester: string;
  subject: string;
  answers: QuizAnswer[];
  totalScore: number;
  totalTime: number; // in seconds
  accuracy: number; // percentage
  difficultyStats: {
    easy: { correct: number; total: number; accuracy: number };
    medium: { correct: number; total: number; accuracy: number };
    hard: { correct: number; total: number; accuracy: number };
  };
  subjectStats: {
    [subject: string]: { correct: number; total: number; accuracy: number };
  };
  topicStats: {
    [topic: string]: { correct: number; total: number; accuracy: number; avgTime: number };
  };
  completedAt: string;
  createdAt: string;
}

const BASE_STORAGE_KEY = 'quiz_results';
let currentUserId: string | null = null;

export function setQuizServiceUserId(userId: string | null) {
  currentUserId = userId;
}

function getStorageKey(): string {
  return currentUserId ? `user_${currentUserId}_${BASE_STORAGE_KEY}` : BASE_STORAGE_KEY;
}

// Save quiz result
export function saveQuizResult(result: Omit<QuizResult, 'id' | 'createdAt'>): QuizResult {
  const results = getQuizResults();
  const newResult: QuizResult = {
    ...result,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  results.push(newResult);
  localStorage.setItem(getStorageKey(), JSON.stringify(results));
  return newResult;
}

// Get all quiz results
export function getQuizResults(): QuizResult[] {
  try {
    const stored = localStorage.getItem(getStorageKey());
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

// Get quiz result by ID
export function getQuizResultById(id: string): QuizResult | null {
  const results = getQuizResults();
  return results.find(r => r.id === id) || null;
}

// Delete quiz result
export function deleteQuizResult(id: string): boolean {
  const results = getQuizResults();
  const filtered = results.filter(r => r.id !== id);
  localStorage.setItem(getStorageKey(), JSON.stringify(filtered));
  return filtered.length < results.length;
}

// Analytics functions
export interface PerformanceMetrics {
  totalQuizzes: number;
  averageScore: number;
  averageAccuracy: number;
  averageTimePerQuestion: number;
  difficultySuccessRate: {
    easy: number;
    medium: number;
    hard: number;
  };
  bestSubject: { subject: string; accuracy: number };
  weakestSubject: { subject: string; accuracy: number };
}

export function getPerformanceMetrics(): PerformanceMetrics {
  const results = getQuizResults();

  if (results.length === 0) {
    return {
      totalQuizzes: 0,
      averageScore: 0,
      averageAccuracy: 0,
      averageTimePerQuestion: 0,
      difficultySuccessRate: { easy: 0, medium: 0, hard: 0 },
      bestSubject: { subject: 'N/A', accuracy: 0 },
      weakestSubject: { subject: 'N/A', accuracy: 0 },
    };
  }

  const totalQuizzes = results.length;
  const totalScore = results.reduce((sum, r) => sum + r.totalScore, 0);
  const totalAccuracy = results.reduce((sum, r) => sum + r.accuracy, 0);
  const totalTime = results.reduce((sum, r) => sum + r.totalTime, 0);
  const totalQuestions = results.reduce((sum, r) => sum + r.answers.length, 0);

  // Difficulty stats
  const difficultyStats = {
    easy: { correct: 0, total: 0 },
    medium: { correct: 0, total: 0 },
    hard: { correct: 0, total: 0 },
  };

  results.forEach(result => {
    Object.entries(result.difficultyStats).forEach(([difficulty, stats]) => {
      if (difficulty in difficultyStats) {
        difficultyStats[difficulty as keyof typeof difficultyStats].correct += stats.correct;
        difficultyStats[difficulty as keyof typeof difficultyStats].total += stats.total;
      }
    });
  });

  const difficultySuccessRate = {
    easy: difficultyStats.easy.total > 0 ? (difficultyStats.easy.correct / difficultyStats.easy.total) * 100 : 0,
    medium: difficultyStats.medium.total > 0 ? (difficultyStats.medium.correct / difficultyStats.medium.total) * 100 : 0,
    hard: difficultyStats.hard.total > 0 ? (difficultyStats.hard.correct / difficultyStats.hard.total) * 100 : 0,
  };

  // Subject stats
  const subjectAccuracies: { [subject: string]: { correct: number; total: number } } = {};
  results.forEach(result => {
    Object.entries(result.subjectStats).forEach(([subject, stats]) => {
      if (!subjectAccuracies[subject]) {
        subjectAccuracies[subject] = { correct: 0, total: 0 };
      }
      subjectAccuracies[subject].correct += stats.correct;
      subjectAccuracies[subject].total += stats.total;
    });
  });

  const subjectAccuracyMap: { [subject: string]: number } = {};
  Object.entries(subjectAccuracies).forEach(([subject, stats]) => {
    subjectAccuracyMap[subject] = stats.total > 0 ? (stats.correct / stats.total) * 100 : 0;
  });

  const subjects = Object.entries(subjectAccuracyMap);
  const bestSubject = subjects.length > 0
    ? subjects.reduce((best, [subject, accuracy]) => accuracy > best.accuracy ? { subject, accuracy } : best, { subject: 'N/A', accuracy: 0 })
    : { subject: 'N/A', accuracy: 0 };

  const weakestSubject = subjects.length > 0
    ? subjects.reduce((weakest, [subject, accuracy]) => accuracy < weakest.accuracy ? { subject, accuracy } : weakest, { subject: 'N/A', accuracy: 100 })
    : { subject: 'N/A', accuracy: 0 };

  return {
    totalQuizzes,
    averageScore: totalScore / totalQuizzes,
    averageAccuracy: totalAccuracy / totalQuizzes,
    averageTimePerQuestion: totalQuestions > 0 ? totalTime / totalQuestions : 0,
    difficultySuccessRate,
    bestSubject,
    weakestSubject,
  };
}

// Get progress over time
export interface ProgressDataPoint {
  date: string;
  score: number;
  accuracy: number;
  timeEfficiency: number; // questions per minute
}

export function getProgressOverTime(): ProgressDataPoint[] {
  const results = getQuizResults();
  return results
    .sort((a, b) => new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime())
    .map(result => ({
      date: new Date(result.completedAt).toLocaleDateString(),
      score: result.totalScore,
      accuracy: result.accuracy,
      timeEfficiency: result.totalTime > 0 ? (result.answers.length / (result.totalTime / 60)) : 0,
    }));
}

// Get subject-wise performance
export interface SubjectPerformance {
  subject: string;
  averageScore: number;
  attempts: number;
  accuracy: number;
}

export function getSubjectPerformance(): SubjectPerformance[] {
  const results = getQuizResults();
  const subjectMap: { [subject: string]: { scores: number[]; attempts: number; correct: number; total: number } } = {};

  results.forEach(result => {
    if (!subjectMap[result.subject]) {
      subjectMap[result.subject] = { scores: [], attempts: 0, correct: 0, total: 0 };
    }
    subjectMap[result.subject].scores.push(result.totalScore);
    subjectMap[result.subject].attempts++;

    Object.entries(result.subjectStats).forEach(([subject, stats]) => {
      if (subject === result.subject) {
        subjectMap[subject].correct += stats.correct;
        subjectMap[subject].total += stats.total;
      }
    });
  });

  return Object.entries(subjectMap).map(([subject, data]) => ({
    subject,
    averageScore: data.scores.length > 0 ? data.scores.reduce((a, b) => a + b, 0) / data.scores.length : 0,
    attempts: data.attempts,
    accuracy: data.total > 0 ? (data.correct / data.total) * 100 : 0,
  }));
}

// Helper to get unified topic performance data
function getTopicPerformances() {
  const results = getQuizResults();
  const topicMap: { [key: string]: { subject: string; correct: number; total: number; totalTime: number; originalTopicName: string } } = {};

  results.forEach(result => {
    Object.entries(result.topicStats).forEach(([topic, stats]) => {
      // Normalize subject and topic for consistent grouping
      const normalizedSubject = result.subject.trim();
      const normalizedTopic = topic.trim().toLowerCase();
      const key = `${normalizedSubject}::${normalizedTopic}`;

      if (!topicMap[key]) {
        topicMap[key] = {
          subject: normalizedSubject,
          correct: 0,
          total: 0,
          totalTime: 0,
          originalTopicName: topic.trim()
        };
      }
      topicMap[key].correct += stats.correct;
      topicMap[key].total += stats.total;
      topicMap[key].totalTime += (stats.avgTime || 0) * stats.total;
    });
  });

  return Object.entries(topicMap).map(([key, data]) => {
    const accuracy = data.total > 0 ? (data.correct / data.total) * 100 : 0;
    return {
      topic: data.originalTopicName,
      subject: data.subject,
      accuracy,
      averageTime: data.total > 0 ? data.totalTime / data.total : 0,
      totalAttempts: data.total,
      correctAttempts: data.correct,
    };
  });
}

// Get weak areas (topics with <60% accuracy)
export interface WeakArea {
  topic: string;
  subject: string;
  accuracy: number;
  averageTime: number;
  totalAttempts: number;
  correctAttempts: number;
}

// Get recent weak areas (prioritizing latest quizzes)
export function getRecentWeakAreas(limit: number = 5): WeakArea[] {
  const results = getQuizResults().sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
  const seenTopics = new Set<string>();
  const weakAreas: WeakArea[] = [];

  for (const result of results) {
    if (weakAreas.length >= limit) break;

    Object.entries(result.topicStats).forEach(([topic, stats]) => {
      const normalizedTopic = topic.trim().toLowerCase();
      // Use "Subject::Topic" key to ensure uniqueness across subjects
      const key = `${result.subject.trim()}::${normalizedTopic}`;

      if (seenTopics.has(key)) return;
      seenTopics.add(key);

      const accuracy = stats.total > 0 ? (stats.correct / stats.total) * 100 : 0;
      if (accuracy < 60) {
        weakAreas.push({
          topic: topic.trim(),
          subject: result.subject.trim(),
          accuracy,
          averageTime: stats.avgTime || 0,
          totalAttempts: stats.total,
          correctAttempts: stats.correct,
        });
      }
    });
  }

  // If we don't have enough recent ones, we could fallback to aggregate, but for now strict recency is better for "prioritise latest"
  return weakAreas.slice(0, limit);
}

// Get recent strong areas (prioritizing latest quizzes)
export function getRecentStrongAreas(limit: number = 5): StrongArea[] {
  const results = getQuizResults().sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
  const seenTopics = new Set<string>();
  const strongAreas: StrongArea[] = [];

  for (const result of results) {
    if (strongAreas.length >= limit) break;

    Object.entries(result.topicStats).forEach(([topic, stats]) => {
      const normalizedTopic = topic.trim().toLowerCase();
      const key = `${result.subject.trim()}::${normalizedTopic}`;

      if (seenTopics.has(key)) return;
      seenTopics.add(key);

      const accuracy = stats.total > 0 ? (stats.correct / stats.total) * 100 : 0;
      if (accuracy >= 80) {
        strongAreas.push({
          topic: topic.trim(),
          subject: result.subject.trim(),
          accuracy,
          averageTime: stats.avgTime || 0,
          totalAttempts: stats.total,
        });
      }
    });
  }

  return strongAreas.slice(0, limit);
}

export function getWeakAreas(): WeakArea[] {
  return getTopicPerformances()
    .filter(area => area.accuracy < 60 && area.totalAttempts >= 1) // At least 1 attempt
    .sort((a, b) => a.accuracy - b.accuracy);
}

export interface StrongArea {
  topic: string;
  subject: string;
  accuracy: number;
  averageTime: number;
  totalAttempts: number;
}

export function getStrongAreas(): StrongArea[] {
  return getTopicPerformances()
    .filter(area => area.accuracy >= 80 && area.totalAttempts >= 1)
    .sort((a, b) => b.accuracy - a.accuracy);
}

// Get difficulty distribution
export interface DifficultyDistribution {
  easy: { total: number; correct: number };
  medium: { total: number; correct: number };
  hard: { total: number; correct: number };
}

export function getDifficultyDistribution(): DifficultyDistribution {
  const results = getQuizResults();
  const distribution: DifficultyDistribution = {
    easy: { total: 0, correct: 0 },
    medium: { total: 0, correct: 0 },
    hard: { total: 0, correct: 0 },
  };

  results.forEach(result => {
    Object.entries(result.difficultyStats).forEach(([difficulty, stats]) => {
      if (difficulty in distribution) {
        distribution[difficulty as keyof DifficultyDistribution].total += stats.total;
        distribution[difficulty as keyof DifficultyDistribution].correct += stats.correct;
      }
    });
  });

  return distribution;
}

// Get weak areas with YouTube video suggestions
export interface WeakAreaWithVideos extends WeakArea {
  suggestedVideos?: any[]; // YouTubeVideo[] from youtube service
}

// Get skill radar data
export interface SkillRadarData {
  speed: number; // 0-100 based on time efficiency
  accuracy: number; // 0-100
  consistency: number; // 0-100 based on score variance
  conceptMastery: number; // 0-100 based on topic accuracy
  difficultyHandling: number; // 0-100 based on hard question accuracy
  stability: number; // 0-100 based on recent performance consistency
}

export function getSkillRadarData(): SkillRadarData {
  const results = getQuizResults();

  if (results.length === 0) {
    return {
      speed: 0,
      accuracy: 0,
      consistency: 0,
      conceptMastery: 0,
      difficultyHandling: 0,
      stability: 0,
    };
  }

  const metrics = getPerformanceMetrics();
  const scores = results.map(r => r.totalScore);
  const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
  const variance = scores.reduce((sum, score) => sum + Math.pow(score - avgScore, 2), 0) / scores.length;
  const consistency = Math.max(0, 100 - (variance / 10)); // Lower variance = higher consistency

  // Concept mastery: average topic accuracy
  const topicAccuracies: number[] = [];
  results.forEach(result => {
    Object.values(result.topicStats).forEach(stats => {
      if (stats.total > 0) {
        topicAccuracies.push((stats.correct / stats.total) * 100);
      }
    });
  });
  const conceptMastery = topicAccuracies.length > 0
    ? topicAccuracies.reduce((a, b) => a + b, 0) / topicAccuracies.length
    : 0;

  // Difficulty handling: hard question accuracy
  const difficultyHandling = metrics.difficultySuccessRate.hard;

  // Speed: based on time efficiency (questions per minute)
  const avgTimePerQuestion = metrics.averageTimePerQuestion;
  const speed = Math.min(100, (60 / Math.max(avgTimePerQuestion, 1)) * 10); // Normalize to 0-100

  // Stability: recent performance consistency (last 5 quizzes)
  const recentResults = results.slice(-5);
  const recentScores = recentResults.map(r => r.totalScore);
  const recentAvg = recentScores.reduce((a, b) => a + b, 0) / recentScores.length;
  const recentVariance = recentScores.reduce((sum, score) => sum + Math.pow(score - recentAvg, 2), 0) / recentScores.length;
  const stability = Math.max(0, 100 - (recentVariance / 10));

  return {
    speed: Math.round(speed),
    accuracy: Math.round(metrics.averageAccuracy),
    consistency: Math.round(consistency),
    conceptMastery: Math.round(conceptMastery),
    difficultyHandling: Math.round(difficultyHandling),
    stability: Math.round(stability),
  };
}

// Helper to group topics by subject
export function groupTopicsBySubject<T extends { subject: string }>(items: T[]): Record<string, T[]> {
  return items.reduce((acc, item) => {
    if (!acc[item.subject]) {
      acc[item.subject] = [];
    }
    acc[item.subject].push(item);
    return acc;
  }, {} as Record<string, T[]>);
}

