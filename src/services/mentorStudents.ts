// Mentor Students Service - Fetches and manages student data for mentors

import { supabase } from '@/integrations/supabase/client';
import { getQuizResults } from './quizResults';
import type { QuizResult } from './quizResults';

export interface Student {
  id: string;
  name: string;
  email: string;
  rollNumber: string;
  branch: 'CSE' | 'ECE' | 'Civil' | 'Mechanical';
  semester: number;
  profilePicture?: string;
  currentProgress: number;
  lastActiveTime: string;
  weakAreas: string[];
  performanceStatus: 'Good' | 'Average' | 'Needs Attention';
  accuracy: number;
  totalQuizzes: number;
  isActive: boolean;
}

export interface StudentReport {
  student: Student;
  overallProgress: number;
  quizPerformance: {
    labels: string[];
    accuracy: number[];
    scores: number[];
  };
  difficultyDistribution: {
    easy: number;
    medium: number;
    hard: number;
  };
  weakTopics: Array<{
    topic: string;
    subject: string;
    accuracy: number;
    attempts: number;
  }>;
  strongTopics: Array<{
    topic: string;
    subject: string;
    accuracy: number;
    attempts: number;
  }>;
  recentActivities: Array<{
    type: 'quiz' | 'video' | 'notes' | 'timetable';
    title: string;
    timestamp: string;
    details?: string;
  }>;
  timetableAdherence: number;
  videoCompletion: number;
  notesCompletion: number;
  attendance?: number;
  aiFeedback?: string;
}

// Fetch all students assigned to a mentor
// For now, we'll fetch all students (mentors can view student profiles per RLS policy)
// In production, this should filter by mentor_students table
export async function getMentorStudents(mentorId: string): Promise<Student[]> {
  try {
    // Fetch all student profiles
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, email, full_name, avatar_url, created_at')
      .eq('role', 'student');

    if (error) {
      console.error('Error fetching students:', error);
      // Return mock data as fallback
      return getMockStudents();
    }

    if (!profiles || profiles.length === 0) {
      return getMockStudents();
    }

    // Transform profiles to Student objects with progress data
    const students: Student[] = await Promise.all(
      profiles.map(async (profile) => {
        // Get quiz results for this student (from localStorage for now)
        // In production, this should come from database
        const quizResults = getQuizResultsForStudent(profile.id);

        const progress = calculateProgress(quizResults);
        const accuracy = calculateAccuracy(quizResults);
        const weakAreas = getWeakAreasForStudent(quizResults);
        const lastActive = getLastActiveTime(profile.id, quizResults);
        const performanceStatus = determinePerformanceStatus(accuracy, progress);

        // Extract branch and semester from profile or use defaults
        // In production, these should be stored in student_profiles table
        const branch = extractBranch(profile.full_name || '') || 'CSE';
        const semester = extractSemester(profile.full_name || '') || 4;

        return {
          id: profile.id,
          name: profile.full_name || 'Student',
          email: profile.email,
          rollNumber: generateRollNumber(profile.id),
          branch: branch as 'CSE' | 'ECE' | 'Civil' | 'Mechanical',
          semester,
          profilePicture: profile.avatar_url || undefined,
          currentProgress: progress,
          lastActiveTime: lastActive,
          weakAreas,
          performanceStatus,
          accuracy,
          totalQuizzes: quizResults.length,
          isActive: isStudentActive(lastActive),
        };
      })
    );

    return students;
  } catch (error) {
    console.error('Error in getMentorStudents:', error);
    return getMockStudents();
  }
}

// Get detailed report for a specific student
export async function getStudentReport(studentId: string): Promise<StudentReport | null> {
  try {
    // Fetch student profile
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id, email, full_name, avatar_url, created_at')
      .eq('id', studentId)
      .eq('role', 'student')
      .single();

    if (error || !profile) {
      console.error('Error fetching student profile:', error);
      return null;
    }

    // Get quiz results
    const quizResults = getQuizResultsForStudent(studentId);

    const progress = calculateProgress(quizResults);
    const accuracy = calculateAccuracy(quizResults);
    const weakAreas = getWeakAreasForStudent(quizResults);
    const lastActive = getLastActiveTime(studentId, quizResults);
    const performanceStatus = determinePerformanceStatus(accuracy, progress);
    const branch = extractBranch(profile.full_name || '') || 'CSE';
    const semester = extractSemester(profile.full_name || '') || 4;

    const student: Student = {
      id: profile.id,
      name: profile.full_name || 'Student',
      email: profile.email,
      rollNumber: generateRollNumber(profile.id),
      branch: branch as 'CSE' | 'ECE' | 'Civil' | 'Mechanical',
      semester,
      profilePicture: profile.avatar_url || undefined,
      currentProgress: progress,
      lastActiveTime: lastActive,
      weakAreas,
      performanceStatus,
      accuracy,
      totalQuizzes: quizResults.length,
      isActive: isStudentActive(lastActive),
    };

    // Build detailed report
    const report: StudentReport = {
      student,
      overallProgress: progress,
      quizPerformance: getQuizPerformanceData(quizResults),
      difficultyDistribution: getDifficultyDistribution(quizResults),
      weakTopics: getWeakTopics(quizResults),
      strongTopics: getStrongTopics(quizResults),
      recentActivities: getRecentActivities(studentId, quizResults),
      timetableAdherence: calculateTimetableAdherence(studentId),
      videoCompletion: calculateVideoCompletion(studentId),
      notesCompletion: calculateNotesCompletion(studentId),
      attendance: undefined, // Can be added when attendance system is implemented
    };

    return report;
  } catch (error) {
    console.error('Error in getStudentReport:', error);
    return null;
  }
}

// Helper functions

function getQuizResultsForStudent(studentId: string): QuizResult[] {
  // For now, get all quiz results from localStorage
  // In production, this should query the database filtered by studentId
  const allResults = getQuizResults();
  // Since localStorage doesn't store studentId, we'll return all results
  // In production, quiz results should have studentId field
  return allResults;
}

function calculateProgress(results: QuizResult[]): number {
  if (results.length === 0) return 0;
  const avgAccuracy = results.reduce((sum, r) => sum + r.accuracy, 0) / results.length;
  return Math.round(avgAccuracy);
}

function calculateAccuracy(results: QuizResult[]): number {
  if (results.length === 0) return 0;
  return results.reduce((sum, r) => sum + r.accuracy, 0) / results.length;
}

function getWeakAreasForStudent(results: QuizResult[]): string[] {
  const topicMap: { [key: string]: { correct: number; total: number } } = {};

  results.forEach(result => {
    Object.entries(result.topicStats).forEach(([topic, stats]) => {
      if (!topicMap[topic]) {
        topicMap[topic] = { correct: 0, total: 0 };
      }
      topicMap[topic].correct += stats.correct;
      topicMap[topic].total += stats.total;
    });
  });

  return Object.entries(topicMap)
    .filter(([_, stats]) => stats.total > 0 && (stats.correct / stats.total) * 100 < 60)
    .map(([topic, _]) => topic)
    .slice(0, 5);
}

function getLastActiveTime(studentId: string, results: QuizResult[]): string {
  if (results.length === 0) {
    return 'Never';
  }

  const latestResult = results.sort((a, b) =>
    new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
  )[0];

  const lastActive = new Date(latestResult.completedAt);
  const now = new Date();
  const diffMs = now.getTime() - lastActive.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) {
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  } else if (diffHours > 0) {
    return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  } else {
    const diffMins = Math.floor(diffMs / (1000 * 60));
    return diffMins < 1 ? 'Just now' : `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  }
}

function determinePerformanceStatus(accuracy: number, progress: number): 'Good' | 'Average' | 'Needs Attention' {
  if (accuracy < 50 || progress < 50) {
    return 'Needs Attention';
  } else if (accuracy >= 70 && progress >= 70) {
    return 'Good';
  } else {
    return 'Average';
  }
}

function isStudentActive(lastActive: string): boolean {
  if (lastActive === 'Never') return false;
  const daysMatch = lastActive.match(/(\d+)\s+day/);
  if (daysMatch) {
    const days = parseInt(daysMatch[1]);
    return days <= 7; // Active if last active within 7 days
  }
  return true; // Active if hours/minutes ago
}

function extractBranch(name: string): string | null {
  // Try to extract branch from name or use default
  // In production, this should come from database
  return null;
}

function extractSemester(name: string): number | null {
  // Try to extract semester from name or use default
  // In production, this should come from database
  return null;
}

function generateRollNumber(id: string): string {
  // Generate a roll number from user ID
  return `STU${id.substring(0, 8).toUpperCase()}`;
}

function getQuizPerformanceData(results: QuizResult[]): {
  labels: string[];
  accuracy: number[];
  scores: number[];
} {
  if (results.length === 0) {
    return { labels: [], accuracy: [], scores: [] };
  }

  const sorted = results
    .sort((a, b) => new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime())
    .slice(-10); // Last 10 quizzes

  return {
    labels: sorted.map(r => new Date(r.completedAt).toLocaleDateString('en-GB')),
    accuracy: sorted.map(r => r.accuracy),
    scores: sorted.map(r => r.totalScore),
  };
}

function getDifficultyDistribution(results: QuizResult[]): {
  easy: number;
  medium: number;
  hard: number;
} {
  const distribution = { easy: 0, medium: 0, hard: 0 };

  results.forEach(result => {
    distribution.easy += result.difficultyStats.easy.total;
    distribution.medium += result.difficultyStats.medium.total;
    distribution.hard += result.difficultyStats.hard.total;
  });

  const total = distribution.easy + distribution.medium + distribution.hard;
  if (total === 0) return { easy: 0, medium: 0, hard: 0 };

  return {
    easy: Math.round((distribution.easy / total) * 100),
    medium: Math.round((distribution.medium / total) * 100),
    hard: Math.round((distribution.hard / total) * 100),
  };
}

function getWeakTopics(results: QuizResult[]): Array<{
  topic: string;
  subject: string;
  accuracy: number;
  attempts: number;
}> {
  const topicMap: { [key: string]: { subject: string; correct: number; total: number } } = {};

  results.forEach(result => {
    Object.entries(result.topicStats).forEach(([topic, stats]) => {
      const key = `${result.subject}::${topic}`;
      if (!topicMap[key]) {
        topicMap[key] = { subject: result.subject, correct: 0, total: 0 };
      }
      topicMap[key].correct += stats.correct;
      topicMap[key].total += stats.total;
    });
  });

  return Object.entries(topicMap)
    .map(([key, data]) => {
      const [subject, topic] = key.split('::');
      return {
        topic,
        subject,
        accuracy: data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0,
        attempts: data.total,
      };
    })
    .filter(t => t.accuracy < 60 && t.attempts >= 2)
    .sort((a, b) => a.accuracy - b.accuracy)
    .slice(0, 10);
}

function getStrongTopics(results: QuizResult[]): Array<{
  topic: string;
  subject: string;
  accuracy: number;
  attempts: number;
}> {
  const topicMap: { [key: string]: { subject: string; correct: number; total: number } } = {};

  results.forEach(result => {
    Object.entries(result.topicStats).forEach(([topic, stats]) => {
      const key = `${result.subject}::${topic}`;
      if (!topicMap[key]) {
        topicMap[key] = { subject: result.subject, correct: 0, total: 0 };
      }
      topicMap[key].correct += stats.correct;
      topicMap[key].total += stats.total;
    });
  });

  return Object.entries(topicMap)
    .map(([key, data]) => {
      const [subject, topic] = key.split('::');
      return {
        topic,
        subject,
        accuracy: data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0,
        attempts: data.total,
      };
    })
    .filter(t => t.accuracy >= 80 && t.attempts >= 2)
    .sort((a, b) => b.accuracy - a.accuracy)
    .slice(0, 10);
}

function getRecentActivities(studentId: string, results: QuizResult[]): Array<{
  type: 'quiz' | 'video' | 'notes' | 'timetable';
  title: string;
  timestamp: string;
  details?: string;
}> {
  const activities: Array<{
    type: 'quiz' | 'video' | 'notes' | 'timetable';
    title: string;
    timestamp: string;
    details?: string;
  }> = [];

  // Add quiz activities
  results
    .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
    .slice(0, 5)
    .forEach(result => {
      activities.push({
        type: 'quiz',
        title: `${result.subject} Quiz`,
        timestamp: result.completedAt,
        details: `Score: ${result.totalScore}/${result.answers.length} (${result.accuracy.toFixed(1)}%)`,
      });
    });

  // Add mock activities for videos, notes, timetable
  // In production, these should come from respective services
  activities.push({
    type: 'video',
    title: 'Data Structures - Linked Lists',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    details: 'Watched 85%',
  });

  activities.push({
    type: 'notes',
    title: 'Operating Systems Notes',
    timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    details: 'Completed',
  });

  return activities
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 10);
}

function calculateTimetableAdherence(studentId: string): number {
  // Mock calculation - in production, this should check timetable completion
  return Math.floor(Math.random() * 30) + 70; // 70-100%
}

function calculateVideoCompletion(studentId: string): number {
  // Mock calculation - in production, this should check video watch progress
  return Math.floor(Math.random() * 20) + 75; // 75-95%
}

function calculateNotesCompletion(studentId: string): number {
  // Mock calculation - in production, this should check notes completion
  return Math.floor(Math.random() * 15) + 80; // 80-95%
}

// Mock data for development/fallback
function getMockStudents(): Student[] {
  return [
    {
      id: '1',
      name: 'Anurag Dey',
      email: 'anurag@example.com',
      rollNumber: 'STU2024001',
      branch: 'CSE',
      semester: 4,
      currentProgress: 72,
      lastActiveTime: '2 hours ago',
      weakAreas: ['OS', 'DBMS Joins'],
      performanceStatus: 'Good',
      accuracy: 75,
      totalQuizzes: 15,
      isActive: true,
    },
    {
      id: '2',
      name: 'Priya Sharma',
      email: 'priya@example.com',
      rollNumber: 'STU2024002',
      branch: 'ECE',
      semester: 3,
      currentProgress: 45,
      lastActiveTime: '5 days ago',
      weakAreas: ['Digital Electronics', 'Signals & Systems'],
      performanceStatus: 'Needs Attention',
      accuracy: 42,
      totalQuizzes: 8,
      isActive: false,
    },
    {
      id: '3',
      name: 'Rahul Kumar',
      email: 'rahul@example.com',
      rollNumber: 'STU2024003',
      branch: 'CSE',
      semester: 5,
      currentProgress: 88,
      lastActiveTime: '1 hour ago',
      weakAreas: [],
      performanceStatus: 'Good',
      accuracy: 90,
      totalQuizzes: 25,
      isActive: true,
    },
    {
      id: '4',
      name: 'Sneha Patel',
      email: 'sneha@example.com',
      rollNumber: 'STU2024004',
      branch: 'Mechanical',
      semester: 4,
      currentProgress: 65,
      lastActiveTime: '3 hours ago',
      weakAreas: ['Thermodynamics'],
      performanceStatus: 'Average',
      accuracy: 68,
      totalQuizzes: 12,
      isActive: true,
    },
    {
      id: '5',
      name: 'Amit Singh',
      email: 'amit@example.com',
      rollNumber: 'STU2024005',
      branch: 'Civil',
      semester: 3,
      currentProgress: 38,
      lastActiveTime: '10 days ago',
      weakAreas: ['Surveying', 'Fluid Mechanics', 'Strength of Materials'],
      performanceStatus: 'Needs Attention',
      accuracy: 35,
      totalQuizzes: 5,
      isActive: false,
    },
  ];
}

