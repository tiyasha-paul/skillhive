// Notification service for timetable events

import { supabase } from '@/integrations/supabase/client';
import type { TimetableSession } from './timetable';

export interface Notification {
  id?: string;
  user_id?: string;
  type: 'timetable' | 'reminder' | 'alert' | 'summary';
  title: string;
  message: string;
  read: boolean;
  created_at?: string;
  metadata?: Record<string, any>;
}

// Create a notification
export async function createNotification(
  userId: string,
  notification: Omit<Notification, 'id' | 'user_id' | 'created_at' | 'read'>
): Promise<Notification | null> {
  try {
    // For now, store in localStorage. In production, use Supabase notifications table
    const notifications = getStoredNotifications(userId);
    const newNotification: Notification = {
      ...notification,
      id: crypto.randomUUID(),
      user_id: userId,
      read: false,
      created_at: new Date().toISOString(),
    };

    notifications.unshift(newNotification);
    // Keep only last 50 notifications
    if (notifications.length > 50) {
      notifications.splice(50);
    }

    localStorage.setItem(`notifications_${userId}`, JSON.stringify(notifications));

    // Trigger custom event for real-time updates
    window.dispatchEvent(new CustomEvent('notification-created', { detail: newNotification }));

    return newNotification;
  } catch (error) {
    console.error('Error creating notification:', error);
    return null;
  }
}

// Get all notifications for a user
export function getNotifications(userId: string): Notification[] {
  return getStoredNotifications(userId);
}

// Get unread notifications count
export function getUnreadCount(userId: string): number {
  const notifications = getStoredNotifications(userId);
  return notifications.filter(n => !n.read).length;
}

// Mark notification as read
export function markAsRead(userId: string, notificationId: string): void {
  const notifications = getStoredNotifications(userId);
  const notification = notifications.find(n => n.id === notificationId);
  if (notification) {
    notification.read = true;
    localStorage.setItem(`notifications_${userId}`, JSON.stringify(notifications));
    window.dispatchEvent(new CustomEvent('notification-updated'));
  }
}

// Mark all as read
export function markAllAsRead(userId: string): void {
  const notifications = getStoredNotifications(userId);
  notifications.forEach(n => n.read = true);
  localStorage.setItem(`notifications_${userId}`, JSON.stringify(notifications));
  window.dispatchEvent(new CustomEvent('notification-updated'));
}

// Delete notification
export function deleteNotification(userId: string, notificationId: string): void {
  const notifications = getStoredNotifications(userId);
  const filtered = notifications.filter(n => n.id !== notificationId);
  localStorage.setItem(`notifications_${userId}`, JSON.stringify(filtered));
  window.dispatchEvent(new CustomEvent('notification-updated'));
}

// Clear all notifications
export function clearAllNotifications(userId: string): void {
  localStorage.setItem(`notifications_${userId}`, JSON.stringify([]));
  window.dispatchEvent(new CustomEvent('notification-updated'));
}

// Helper function to get stored notifications
function getStoredNotifications(userId: string): Notification[] {
  try {
    const stored = localStorage.getItem(`notifications_${userId}`);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

// Create timetable-related notifications
export async function notifyTimetableEvent(
  userId: string,
  event: 'created' | 'updated' | 'deleted',
  session: TimetableSession
): Promise<void> {
  const messages = {
    created: `New study session added: ${session.subject} at ${formatTime(session.start_time)}`,
    updated: `Your ${session.subject} session has been updated`,
    deleted: `Study session removed: ${session.subject}`,
  };

  await createNotification(userId, {
    type: 'timetable',
    title: 'Timetable Update',
    message: messages[event],
    metadata: { sessionId: session.id, event },
  });
}

// Create reminder notification
export async function notifyReminder(
  userId: string,
  session: TimetableSession,
  minutesBefore: number
): Promise<void> {
  await createNotification(userId, {
    type: 'reminder',
    title: 'Study Session Reminder',
    message: `Your ${session.subject} session starts in ${minutesBefore} minutes`,
    metadata: { sessionId: session.id, minutesBefore },
  });
}

// Create daily summary notification
export async function notifyDailySummary(
  userId: string,
  sessions: TimetableSession[]
): Promise<void> {
  const count = sessions.length;
  const subjects = [...new Set(sessions.map(s => s.subject))];

  await createNotification(userId, {
    type: 'summary',
    title: 'Today\'s Study Plan',
    message: `You have ${count} study session${count !== 1 ? 's' : ''} today: ${subjects.join(', ')}`,
    metadata: { sessionCount: count, subjects },
  });
}

function formatTime(timeString: string): string {
  const [hours, minutes] = timeString.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minutes} ${ampm}`;
}

