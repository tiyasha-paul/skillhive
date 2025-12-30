// Goals Service - Manages daily goals for students

import { createTimetableSession, type TimetableSession, type DayOfWeek } from './timetable';

export interface Goal {
  id: string;
  text: string;
  completed: boolean;
  createdAt: string;
  completedAt?: string;
  timetableSessionId?: string; // Link to timetable session
  startTime?: string; // Format: "HH:MM"
  endTime?: string; // Format: "HH:MM"
}

const STORAGE_KEY_PREFIX = 'student_goals_';
let currentUserId: string | null = null;

export function setGoalServiceUserId(userId: string | null) {
  currentUserId = userId;
}

// Get today's date string (YYYY-MM-DD)
function getTodayDateString(): string {
  return new Date().toISOString().split('T')[0];
}

// Get storage key for a specific date
function getStorageKey(date?: string): string {
  const prefix = currentUserId ? `user_${currentUserId}_${STORAGE_KEY_PREFIX}` : STORAGE_KEY_PREFIX;
  return `${prefix}${date || getTodayDateString()}`;
}

// Get goals for a specific date (defaults to today)
export function getGoals(date?: string): Goal[] {
  try {
    const key = getStorageKey(date);
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

// Get today's goals
export function getTodayGoals(): Goal[] {
  return getGoals();
}

// Get today's day name
function getTodayDayName(): DayOfWeek {
  const dayNames: DayOfWeek[] = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return dayNames[new Date().getDay()];
}

// Add a new goal and create corresponding timetable session if sync is enabled
export async function addGoal(text: string, userId?: string, date?: string, startTime?: string, endTime?: string): Promise<Goal> {
  const goals = getGoals(date);

  // Default to entire day if no time specified
  const start = startTime || '00:00';
  const end = endTime || '23:59';
  const day = getTodayDayName();

  let timetableSessionId: string | undefined;

  // Check if sync is enabled before creating timetable session
  const { getSyncEnabled } = await import('./syncSettings');
  const syncEnabled = getSyncEnabled();

  // Create timetable session if userId is provided AND sync is enabled
  if (userId && syncEnabled) {
    try {
      const session = await createTimetableSession(userId, {
        subject: text.trim(),
        day: day,
        start_time: start,
        end_time: end,
        priority: 'Medium',
      });

      if (session && session.id) {
        timetableSessionId = session.id;
      }
    } catch (error) {
      console.error('Error creating timetable session for goal:', error);
      // Continue even if timetable creation fails
    }
  }

  const newGoal: Goal = {
    id: crypto.randomUUID(),
    text: text.trim(),
    completed: false,
    createdAt: new Date().toISOString(),
    timetableSessionId,
    startTime: start,
    endTime: end,
  };

  goals.push(newGoal);
  const key = getStorageKey(date);
  localStorage.setItem(key, JSON.stringify(goals));

  return newGoal;
}

// Create a goal from a timetable session
export function createGoalFromSession(session: TimetableSession, date?: string): Goal {
  const goals = getGoals(date);

  // Check if goal already exists for this session
  const existingGoal = goals.find(g => g.timetableSessionId === session.id);
  if (existingGoal) {
    return existingGoal;
  }

  const goalText = session.topic ? `${session.subject} - ${session.topic}` : session.subject;

  const newGoal: Goal = {
    id: crypto.randomUUID(),
    text: goalText,
    completed: false,
    createdAt: new Date().toISOString(),
    timetableSessionId: session.id,
    startTime: session.start_time,
    endTime: session.end_time,
  };

  goals.push(newGoal);
  const key = getStorageKey(date);
  localStorage.setItem(key, JSON.stringify(goals));

  return newGoal;
}

// Toggle goal completion (and mark timetable session as completed if linked)
export async function toggleGoal(goalId: string, date?: string): Promise<boolean> {
  const goals = getGoals(date);
  const goal = goals.find(g => g.id === goalId);

  if (!goal) return false;

  goal.completed = !goal.completed;
  if (goal.completed) {
    goal.completedAt = new Date().toISOString();

    // Mark timetable session as completed if linked
    if (goal.timetableSessionId) {
      try {
        const { markSessionCompleted } = await import('./timetable');
        await markSessionCompleted(goal.timetableSessionId);
      } catch (error) {
        console.error('Error marking timetable session as completed:', error);
      }
    }
  } else {
    delete goal.completedAt;

    // Unmark timetable session completion if linked
    if (goal.timetableSessionId) {
      try {
        const completedSessions = JSON.parse(localStorage.getItem('completed_sessions') || '[]');
        const filtered = completedSessions.filter((id: string) => id !== goal.timetableSessionId);
        localStorage.setItem('completed_sessions', JSON.stringify(filtered));
      } catch (error) {
        console.error('Error unmarking timetable session completion:', error);
      }
    }
  }

  const key = getStorageKey(date);
  localStorage.setItem(key, JSON.stringify(goals));

  return goal.completed;
}

// Delete a goal (and optionally delete linked timetable session)
export async function deleteGoal(goalId: string, date?: string, deleteTimetableSession: boolean = false): Promise<boolean> {
  const goals = getGoals(date);
  const goal = goals.find(g => g.id === goalId);

  if (!goal) return false;

  // Delete timetable session if requested
  if (deleteTimetableSession && goal.timetableSessionId) {
    try {
      const { deleteTimetableSession: deleteSession } = await import('./timetable');
      await deleteSession(goal.timetableSessionId);
    } catch (error) {
      console.error('Error deleting timetable session:', error);
    }
  }

  const filtered = goals.filter(g => g.id !== goalId);
  const key = getStorageKey(date);
  localStorage.setItem(key, JSON.stringify(filtered));

  return true;
}

// Get goal by timetable session ID
export function getGoalBySessionId(sessionId: string, date?: string): Goal | null {
  const goals = getGoals(date);
  return goals.find(g => g.timetableSessionId === sessionId) || null;
}

// Update goal text
export function updateGoal(goalId: string, newText: string, date?: string): boolean {
  const goals = getGoals(date);
  const goal = goals.find(g => g.id === goalId);

  if (!goal) return false;

  goal.text = newText.trim();
  const key = getStorageKey(date);
  localStorage.setItem(key, JSON.stringify(goals));

  return true;
}

// Get completion stats for a date
export function getGoalStats(date?: string): { total: number; completed: number; percentage: number } {
  const goals = getGoals(date);
  const completed = goals.filter(g => g.completed).length;

  return {
    total: goals.length,
    completed,
    percentage: goals.length > 0 ? Math.round((completed / goals.length) * 100) : 0,
  };
}
