// Timetable service for Supabase operations

import { supabase } from '@/integrations/supabase/client';

export type DayOfWeek = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';
export type Priority = 'High' | 'Medium' | 'Low';

export type SessionStatus = 'upcoming' | 'active' | 'completed' | 'missed';

export interface TimetableSession {
  id?: string;
  user_id?: string;
  subject: string;
  topic?: string;
  day: DayOfWeek;
  date?: string; // ISO date string for specific date
  start_time: string; // Format: "HH:MM"
  end_time: string; // Format: "HH:MM"
  priority: Priority;
  notes?: string;
  color?: string;
  status?: SessionStatus;
  completed_at?: string;
  created_at?: string;
  updated_at?: string;
}

export interface TimetableSessionInput {
  subject: string;
  topic?: string;
  day: DayOfWeek;
  date?: string; // ISO date string for specific date
  start_time: string;
  end_time: string;
  priority: Priority;
  notes?: string;
  color?: string;
}

// Get all sessions for a user
export async function getTimetableSessions(userId: string): Promise<TimetableSession[]> {
  try {
    const { data, error } = await supabase
      .from('timetable_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('day', { ascending: true })
      .order('start_time', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching timetable sessions:', error);
    return [];
  }
}

// Get sessions for a specific day
export async function getSessionsByDay(userId: string, day: DayOfWeek): Promise<TimetableSession[]> {
  try {
    const { data, error } = await supabase
      .from('timetable_sessions')
      .select('*')
      .eq('user_id', userId)
      .eq('day', day)
      .order('start_time', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching sessions by day:', error);
    return [];
  }
}

// Create a new session
export async function createTimetableSession(
  userId: string,
  session: TimetableSessionInput
): Promise<TimetableSession | null> {
  try {
    // Generate color if not provided
    const color = session.color || generateColorForSubject(session.subject);

    // Only include fields that exist in the database table
    const insertData: any = {
      user_id: userId,
      subject: session.subject,
      day: session.day,
      start_time: session.start_time,
      end_time: session.end_time,
      priority: session.priority,
      color: color,
    };

    // Add optional fields only if they exist
    if (session.topic) {
      insertData.topic = session.topic;
    }
    if (session.notes) {
      insertData.notes = session.notes;
    }
    if (session.date) {
      insertData.date = session.date;
    }

    const { data, error } = await supabase
      .from('timetable_sessions')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('Supabase error creating timetable session:', error);
      console.error('Error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });
      throw error;
    }

    return data;
  } catch (error: any) {
    console.error('Error creating timetable session:', error);
    // Log the full error for debugging
    if (error?.message) {
      console.error('Error message:', error.message);
    }
    return null;
  }
}

// Update a session
export async function updateTimetableSession(
  sessionId: string,
  updates: Partial<TimetableSessionInput>
): Promise<TimetableSession | null> {
  try {
    // Only include fields that exist in the database table
    const updateData: any = {};

    if (updates.subject !== undefined) updateData.subject = updates.subject;
    if (updates.day !== undefined) updateData.day = updates.day;
    if (updates.start_time !== undefined) updateData.start_time = updates.start_time;
    if (updates.end_time !== undefined) updateData.end_time = updates.end_time;
    if (updates.priority !== undefined) updateData.priority = updates.priority;
    if (updates.color !== undefined) updateData.color = updates.color;
    if (updates.topic !== undefined) updateData.topic = updates.topic;
    if (updates.notes !== undefined) updateData.notes = updates.notes;
    if (updates.date !== undefined) updateData.date = updates.date;

    const { data, error } = await supabase
      .from('timetable_sessions')
      .update(updateData)
      .eq('id', sessionId)
      .select()
      .single();

    if (error) {
      console.error('Supabase error updating timetable session:', error);
      throw error;
    }
    return data;
  } catch (error: any) {
    console.error('Error updating timetable session:', error);
    if (error?.message) {
      console.error('Error message:', error.message);
    }
    return null;
  }
}

// Delete a session
export async function deleteTimetableSession(sessionId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('timetable_sessions')
      .delete()
      .eq('id', sessionId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting timetable session:', error);
    return false;
  }
}

// Generate a color for a subject (consistent hash)
export function generateColorForSubject(subject: string): string {
  const colors = [
    '#3B82F6', // Blue
    '#10B981', // Green
    '#F59E0B', // Amber
    '#EF4444', // Red
    '#8B5CF6', // Purple
    '#EC4899', // Pink
    '#06B6D4', // Cyan
    '#84CC16', // Lime
    '#F97316', // Orange
    '#6366F1', // Indigo
  ];

  // Simple hash function for consistent color assignment
  let hash = 0;
  for (let i = 0; i < subject.length; i++) {
    hash = subject.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

// Get upcoming sessions (next 24 hours)
export async function getUpcomingSessions(userId: string): Promise<TimetableSession[]> {
  try {
    const allSessions = await getTimetableSessions(userId);
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const dayNames: DayOfWeek[] = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const todayDay = dayNames[now.getDay()];
    const tomorrowDay = dayNames[tomorrow.getDay()];

    return allSessions.filter(session => {
      const sessionTime = parseTime(session.start_time);
      const sessionDay = session.day;

      // Today's sessions that haven't started yet
      if (sessionDay === todayDay) {
        const sessionDateTime = new Date(now);
        sessionDateTime.setHours(sessionTime.hours, sessionTime.minutes, 0, 0);
        return sessionDateTime > now && sessionDateTime <= tomorrow;
      }

      // Tomorrow's sessions
      if (sessionDay === tomorrowDay) {
        return true;
      }

      return false;
    }).sort((a, b) => {
      const timeA = parseTime(a.start_time);
      const timeB = parseTime(b.start_time);
      return timeA.hours * 60 + timeA.minutes - (timeB.hours * 60 + timeB.minutes);
    });
  } catch (error) {
    console.error('Error fetching upcoming sessions:', error);
    return [];
  }
}

function parseTime(timeString: string): { hours: number; minutes: number } {
  const [hours, minutes] = timeString.split(':').map(Number);
  return { hours, minutes };
}

// Get session status based on current time
export function getSessionStatus(session: TimetableSession): SessionStatus {
  const now = new Date();
  const dayNames: DayOfWeek[] = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const todayDay = dayNames[now.getDay()];

  // Check if session is marked as completed in localStorage
  const key = getCompletedSessionsKey();
  const completedSessions = JSON.parse(localStorage.getItem(key) || '[]');
  if (session.id && completedSessions.includes(session.id)) {
    return 'completed';
  }

  // If session is marked as completed (legacy check)
  if (session.status === 'completed' || session.completed_at) {
    return 'completed';
  }

  // Check if session is for today
  if (session.day !== todayDay) {
    return 'upcoming';
  }

  const sessionTime = parseTime(session.start_time);
  const endTime = parseTime(session.end_time);

  const sessionStart = new Date(now);
  sessionStart.setHours(sessionTime.hours, sessionTime.minutes, 0, 0);

  const sessionEnd = new Date(now);
  sessionEnd.setHours(endTime.hours, endTime.minutes, 0, 0);

  // Check if session is missed (past end time and not completed)
  if (now > sessionEnd) {
    return 'missed';
  }

  // Check if session is active (between start and end time)
  if (now >= sessionStart && now <= sessionEnd) {
    return 'active';
  }

  // Session is upcoming
  return 'upcoming';
}

// Mark session as completed
// Mark session as completed
// Note: This uses localStorage since status/completed_at columns don't exist in DB
const BASE_COMPLETED_SESSIONS_KEY = 'completed_sessions';
let currentUserId: string | null = null;

export function setTimetableServiceUserId(userId: string | null) {
  currentUserId = userId;
}

function getCompletedSessionsKey(): string {
  return currentUserId ? `user_${currentUserId}_${BASE_COMPLETED_SESSIONS_KEY}` : BASE_COMPLETED_SESSIONS_KEY;
}

export async function markSessionCompleted(sessionId: string): Promise<boolean> {
  try {
    const key = getCompletedSessionsKey();
    const completedSessions = JSON.parse(localStorage.getItem(key) || '[]');
    if (!completedSessions.includes(sessionId)) {
      completedSessions.push(sessionId);
      localStorage.setItem(key, JSON.stringify(completedSessions));
    }
    return true;
  } catch (error) {
    console.error('Error marking session as completed:', error);
    return false;
  }
}

