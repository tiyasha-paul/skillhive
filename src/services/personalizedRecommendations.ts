// Personalized Recommendations Service with ML-like Adaptive Learning

import {
  getQuizResults,
  getWeakAreas,
  getStrongAreas,
  getRecentWeakAreas,
  getRecentStrongAreas,
  getRecentAverageAreas,
  getPerformanceMetrics,
  getSubjectPerformance,
  type WeakArea,
  type AverageArea,
  type PerformanceMetrics,
  type SubjectPerformance,
} from './quizResults';
import { searchYouTubeVideos, searchVideosForTopic, type YouTubeVideo } from './youtube';
import { queueSubjectVideos, queueTopicVideos } from './youtubeQueue';

export interface PersonalizedRecommendation {
  type: 'video' | 'practice' | 'review' | 'study_plan';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  subject?: string;
  topic?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  estimatedTime?: string;
  actionUrl?: string;
  video?: YouTubeVideo;
}

export interface AdaptiveLearningInsights {
  recommendedDifficulty: 'easy' | 'medium' | 'hard';
  learningPace: 'slow' | 'moderate' | 'fast';
  focusAreas: string[];
  averageAreas: string[];
  strengths: string[];
  studyPlan: {
    dailyGoal: number; // minutes
    weeklyGoal: number; // quizzes
    focusSubjects: string[];
  };
  recommendations: PersonalizedRecommendation[];
}

/**
 * Analyze learner performance and generate personalized recommendations
 * Uses ML-like algorithms to adjust difficulty and learning pace
 */
export function analyzeLearnerPerformance(): AdaptiveLearningInsights {
  const results = getQuizResults();
  const metrics = getPerformanceMetrics();
  // Use recent weak areas (top 5 prioritized by latest quiz)
  const weakAreas = getRecentWeakAreas(5);
  const subjectPerformance = getSubjectPerformance();

  // If no quiz data, return default recommendations
  if (results.length === 0) {
    return getDefaultRecommendations();
  }

  // Calculate recommended difficulty based on performance
  const recommendedDifficulty = calculateRecommendedDifficulty(metrics);

  // Calculate learning pace based on time efficiency and consistency
  const learningPace = calculateLearningPace(results, metrics);

  // Identify focus areas (weak topics that need attention)
  const focusAreas = weakAreas
    .map(area => `${area.topic} (${area.subject})`);

  // Identify strengths (topics with >80% accuracy)
  // Use recent strong areas (top 5 prioritized by latest quiz)
  const strengths = getRecentStrongAreas(5)
    .map(area => `${area.topic} (${area.subject})`);

  // Identify average areas (topics with 60-79% accuracy)
  // Use recent average areas (top 5 prioritized by latest quiz)
  const averageAreas = getRecentAverageAreas(5)
    .map(area => `${area.topic} (${area.subject})`);

  // Generate study plan
  const studyPlan = generateStudyPlan(metrics, weakAreas, subjectPerformance);

  // Generate personalized recommendations
  const recommendations = generateRecommendations(weakAreas, metrics, subjectPerformance);

  return {
    recommendedDifficulty,
    learningPace,
    focusAreas,
    averageAreas,
    strengths,
    studyPlan,
    recommendations,
  };
}

/**
 * Calculate recommended difficulty level using adaptive algorithm
 */
function calculateRecommendedDifficulty(metrics: PerformanceMetrics): 'easy' | 'medium' | 'hard' {
  const avgAccuracy = metrics.averageAccuracy;
  const hardAccuracy = metrics.difficultySuccessRate.hard;
  const mediumAccuracy = metrics.difficultySuccessRate.medium;
  const easyAccuracy = metrics.difficultySuccessRate.easy;

  // If overall accuracy is low, recommend easier content
  if (avgAccuracy < 50) {
    return 'easy';
  }

  // If hard questions have >70% accuracy, recommend hard
  if (hardAccuracy >= 70) {
    return 'hard';
  }

  // If medium questions have >65% accuracy, recommend medium
  if (mediumAccuracy >= 65) {
    return 'medium';
  }

  // Default to medium for balanced learning
  return 'medium';
}

/**
 * Calculate learning pace based on time efficiency and consistency
 */
function calculateLearningPace(
  results: any[],
  metrics: PerformanceMetrics
): 'slow' | 'moderate' | 'fast' {
  const avgTimePerQuestion = metrics.averageTimePerQuestion;
  const avgAccuracy = metrics.averageAccuracy;

  // Fast pace: quick answers with good accuracy
  if (avgTimePerQuestion < 60 && avgAccuracy >= 70) {
    return 'fast';
  }

  // Slow pace: takes longer or lower accuracy
  if (avgTimePerQuestion > 120 || avgAccuracy < 50) {
    return 'slow';
  }

  // Moderate pace: balanced
  return 'moderate';
}

/**
 * Generate personalized study plan
 */
function generateStudyPlan(
  metrics: PerformanceMetrics,
  weakAreas: WeakArea[],
  subjectPerformance: SubjectPerformance[]
): {
  dailyGoal: number;
  weeklyGoal: number;
  focusSubjects: string[];
} {
  const totalQuizzes = metrics.totalQuizzes;
  const avgAccuracy = metrics.averageAccuracy;

  // Calculate daily study time goal (in minutes)
  // More time if performance is lower
  let dailyGoal = 60; // Default 1 hour
  if (avgAccuracy < 50) {
    dailyGoal = 90; // 1.5 hours if struggling
  } else if (avgAccuracy >= 80) {
    dailyGoal = 45; // 45 minutes if doing well
  }

  // Calculate weekly quiz goal
  let weeklyGoal = 3; // Default 3 quizzes per week
  if (totalQuizzes === 0) {
    weeklyGoal = 5; // More quizzes if just starting
  } else if (avgAccuracy < 50) {
    weeklyGoal = 4; // More practice if struggling
  }

  // Focus on weakest subjects
  const focusSubjects = subjectPerformance
    .sort((a, b) => a.accuracy - b.accuracy)
    .slice(0, 2)
    .map(subj => subj.subject);

  return {
    dailyGoal,
    weeklyGoal,
    focusSubjects,
  };
}

/**
 * Generate personalized recommendations based on weak areas
 */
function generateRecommendations(
  weakAreas: WeakArea[],
  metrics: PerformanceMetrics,
  subjectPerformance: SubjectPerformance[]
): PersonalizedRecommendation[] {
  const recommendations: PersonalizedRecommendation[] = [];

  // Top 3 weak areas get high priority video recommendations
  weakAreas.slice(0, 3).forEach((area, index) => {
    recommendations.push({
      type: 'video',
      priority: 'high',
      title: `Learn ${area.topic}`,
      description: `You scored ${area.accuracy.toFixed(1)}% on ${area.topic}. Watch this video to strengthen your understanding.`,
      subject: area.subject,
      topic: area.topic,
      difficulty: area.accuracy < 40 ? 'easy' : 'medium',
      estimatedTime: '10-15 min',
    });
  });

  // Add practice recommendations for weak subjects
  const weakestSubject = metrics.weakestSubject;
  if (weakestSubject.subject !== 'N/A') {
    recommendations.push({
      type: 'practice',
      priority: 'high',
      title: `Practice ${weakestSubject.subject}`,
      description: `Your accuracy in ${weakestSubject.subject} is ${weakestSubject.accuracy.toFixed(1)}%. Take a practice quiz to improve.`,
      subject: weakestSubject.subject,
      difficulty: 'medium',
      estimatedTime: '15-20 min',
      actionUrl: '/student/practice',
    });
  }

  // Add review recommendations for medium-performing topics
  weakAreas
    .filter(area => area.accuracy >= 40 && area.accuracy < 60)
    .slice(0, 2)
    .forEach(area => {
      recommendations.push({
        type: 'review',
        priority: 'medium',
        title: `Review ${area.topic}`,
        description: `Review ${area.topic} concepts to improve your ${area.accuracy.toFixed(1)}% accuracy.`,
        subject: area.subject,
        topic: area.topic,
        estimatedTime: '20-30 min',
      });
    });

  // Add study plan recommendation
  recommendations.push({
    type: 'study_plan',
    priority: 'medium',
    title: 'Customize Your Study Plan',
    description: 'Based on your performance, we recommend focusing on specific subjects and topics.',
    estimatedTime: '5 min',
    actionUrl: '/student/practice',
  });

  return recommendations;
}

/**
 * Get YouTube videos for weak areas using queue (one API call at a time)
 */
export async function getRecommendedVideos(
  weakAreas: WeakArea[],
  maxVideos: number = 6
): Promise<Map<string, YouTubeVideo[]>> {
  const videoMap = new Map<string, YouTubeVideo[]>();

  // Get videos for top weak areas
  // CRITICAL: Do NOT sort by accuracy. Preserve the order passed in (which is by recency from getRecentWeakAreas)
  // This fulfills the requirement: "prioritise the latest quiz taken"
  const topWeakAreas = weakAreas
    .slice(0, Math.min(5, weakAreas.length)); // Get top 5 weakest areas (already prioritized by recency)

  console.log(`[Recommendations] Fetching videos for ${topWeakAreas.length} weak areas using queue...`);

  // Queue all requests - they will be processed one at a time
  const videoPromises = topWeakAreas.map(async (area) => {
    try {
      const key = `${area.subject}::${area.topic}`;

      // Use queue to ensure only one API call at a time
      const videos = await queueTopicVideos(area.topic, area.subject, 3);

      if (videos.length > 0) {
        videoMap.set(key, videos);
        console.log(`[Recommendations] Fetched ${videos.length} videos for ${area.topic}`);
      } else {
        console.warn(`[Recommendations] No videos found for ${area.topic}`);
      }
    } catch (error) {
      console.error(`[Recommendations] Error fetching videos for ${area.topic}:`, error);
    }
  });

  // Wait for all queued requests to complete (they process sequentially)
  await Promise.all(videoPromises);

  console.log(`[Recommendations] Completed fetching videos. Total: ${videoMap.size} topics with videos`);
  return videoMap;
}

/**
 * Get recommended videos for focus subjects (from study plan)
 */
export async function getSubjectRecommendedVideos(
  subjects: string[],
  maxVideosPerSubject: number = 3
): Promise<Map<string, YouTubeVideo[]>> {
  const videoMap = new Map<string, YouTubeVideo[]>();

  if (subjects.length === 0) {
    return videoMap;
  }

  console.log(`[Recommendations] Fetching videos for ${subjects.length} focus subjects using queue...`);

  // Queue requests for each subject
  const videoPromises = subjects.map(async (subject) => {
    try {
      // Use queue to ensure only one API call at a time
      const videos = await queueSubjectVideos(subject, maxVideosPerSubject);

      if (videos.length > 0) {
        videoMap.set(subject, videos);
        console.log(`[Recommendations] Fetched ${videos.length} videos for ${subject}`);
      }
    } catch (error) {
      console.error(`[Recommendations] Error fetching videos for ${subject}:`, error);
    }
  });

  // Wait for all queued requests to complete
  await Promise.all(videoPromises);

  return videoMap;
}

/**
 * Get default recommendations when no quiz data exists
 */
function getDefaultRecommendations(): AdaptiveLearningInsights {
  return {
    recommendedDifficulty: 'medium',
    learningPace: 'moderate',
    focusAreas: [],
    averageAreas: [],
    strengths: [],
    studyPlan: {
      dailyGoal: 60,
      weeklyGoal: 3,
      focusSubjects: [],
    },
    recommendations: [
      {
        type: 'practice',
        priority: 'high',
        title: 'Take Your First Quiz',
        description: 'Start by taking a quiz to get personalized recommendations based on your performance.',
        estimatedTime: '15-20 min',
        actionUrl: '/student/practice',
      },
      {
        type: 'study_plan',
        priority: 'medium',
        title: 'Explore Learning Resources',
        description: 'Browse study notes, videos, and practice materials to get started.',
        estimatedTime: '10 min',
        actionUrl: '/student/learning',
      },
    ],
  };
}

/**
 * Get difficulty adjustment recommendation
 */
export function getDifficultyAdjustment(
  currentDifficulty: 'easy' | 'medium' | 'hard',
  metrics: PerformanceMetrics
): {
  shouldAdjust: boolean;
  newDifficulty: 'easy' | 'medium' | 'hard';
  reason: string;
} {
  const avgAccuracy = metrics.averageAccuracy;
  const recommendedDifficulty = calculateRecommendedDifficulty(metrics);

  if (currentDifficulty === recommendedDifficulty) {
    return {
      shouldAdjust: false,
      newDifficulty: currentDifficulty,
      reason: `Your current difficulty level (${currentDifficulty}) matches your performance.`,
    };
  }

  let reason = '';
  if (recommendedDifficulty === 'easy' && currentDifficulty !== 'easy') {
    reason = `Your accuracy is ${avgAccuracy.toFixed(1)}%. Start with easier questions to build confidence.`;
  } else if (recommendedDifficulty === 'hard' && currentDifficulty !== 'hard') {
    reason = `You're performing well (${avgAccuracy.toFixed(1)}% accuracy). Challenge yourself with harder questions.`;
  } else {
    reason = `Based on your performance, ${recommendedDifficulty} difficulty would be more suitable.`;
  }

  return {
    shouldAdjust: true,
    newDifficulty: recommendedDifficulty,
    reason,
  };
}

