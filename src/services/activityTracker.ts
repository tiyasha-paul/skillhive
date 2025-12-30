// Activity Tracker Service - Tracks student activity for heatmap

export interface ActivityRecord {
  date: string; // YYYY-MM-DD format
  count: number; // Number of activities on this date
  activities: ActivityType[];
}

export type ActivityType =
  | 'quiz_completed'
  | 'study_note_viewed'
  | 'video_watched'
  | 'timetable_session_completed'
  | 'job_saved'
  | 'practice_viewed'
  | 'resume_analyzed';

const BASE_STORAGE_KEY = 'student_activity';
let currentUserId: string | null = null;

export function setActivityServiceUserId(userId: string | null) {
  currentUserId = userId;
}

function getStorageKey(): string {
  return currentUserId ? `user_${currentUserId}_${BASE_STORAGE_KEY}` : BASE_STORAGE_KEY;
}

// Record an activity
export function recordActivity(type: ActivityType, metadata?: Record<string, any>): void {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const activities = getActivityRecords();

  let todayRecord = activities.find(a => a.date === today);
  if (!todayRecord) {
    todayRecord = { date: today, count: 0, activities: [] };
    activities.push(todayRecord);
  }

  todayRecord.count++;
  todayRecord.activities.push(type);

  // Keep only last 365 days
  const oneYearAgo = new Date();
  oneYearAgo.setDate(oneYearAgo.getDate() - 365);
  const filtered = activities.filter(a => new Date(a.date) >= oneYearAgo);

  localStorage.setItem(getStorageKey(), JSON.stringify(filtered));
}

// Get activity records
export function getActivityRecords(): ActivityRecord[] {
  try {
    const stored = localStorage.getItem(getStorageKey());
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

// Get activity for a specific date
export function getActivityForDate(date: string): ActivityRecord | null {
  const activities = getActivityRecords();
  return activities.find(a => a.date === date) || null;
}

// Get activity count for a date range
export function getActivityCount(startDate: string, endDate: string): number {
  const activities = getActivityRecords();
  return activities
    .filter(a => a.date >= startDate && a.date <= endDate)
    .reduce((sum, a) => sum + a.count, 0);
}

// Get activity heatmap data (last 365 days)
export function getActivityHeatmapData(): { date: string; count: number; level: 0 | 1 | 2 | 3 | 4 }[] {
  const activities = getActivityRecords();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Calculate 53 weeks ago (approximately 1 year)
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - (53 * 7));
  startDate.setHours(0, 0, 0, 0);

  // Create a map of all dates in the range
  const dateMap = new Map<string, number>();
  const currentDate = new Date(startDate);

  while (currentDate <= today) {
    const dateStr = currentDate.toISOString().split('T')[0];
    dateMap.set(dateStr, 0);
    currentDate.setDate(currentDate.getDate() + 1);
  }

  // Fill in actual activity counts
  activities.forEach(activity => {
    const activityDate = new Date(activity.date);
    activityDate.setHours(0, 0, 0, 0);
    if (activityDate >= startDate && activityDate <= today) {
      const dateStr = activity.date;
      if (dateMap.has(dateStr)) {
        dateMap.set(dateStr, activity.count);
      }
    }
  });

  // Calculate max count for normalization (use 75th percentile for better distribution)
  const counts = Array.from(dateMap.values()).filter(c => c > 0);
  const maxCount = counts.length > 0
    ? Math.max(...counts)
    : 1;

  // Convert to array with levels (0-4)
  // Use a more balanced distribution
  return Array.from(dateMap.entries()).map(([date, count]) => {
    let level: 0 | 1 | 2 | 3 | 4 = 0;
    if (count > 0) {
      if (maxCount <= 1) {
        level = count >= 1 ? 1 : 0;
      } else {
        const ratio = count / maxCount;
        if (ratio >= 0.75) level = 4;
        else if (ratio >= 0.5) level = 3;
        else if (ratio >= 0.25) level = 2;
        else level = 1;
      }
    }
    return { date, count, level };
  });
}

// Get activity level for a specific date
export function getActivityLevel(date: string): 0 | 1 | 2 | 3 | 4 {
  const record = getActivityForDate(date);
  if (!record || record.count === 0) return 0;

  const allActivities = getActivityRecords();
  const maxCount = Math.max(...allActivities.map(a => a.count), 1);
  const ratio = record.count / maxCount;

  if (ratio >= 0.8) return 4;
  if (ratio >= 0.6) return 3;
  if (ratio >= 0.4) return 2;
  return 1;
}

// Get total activity count
export function getTotalActivityCount(): number {
  const activities = getActivityRecords();
  return activities.reduce((sum, a) => sum + a.count, 0);
}

// Get activity streak (consecutive days with activity)
export function getActivityStreak(): number {
  const activities = getActivityRecords();
  if (activities.length === 0) return 0;

  // Sort by date descending
  const sorted = activities
    .filter(a => a.count > 0)
    .sort((a, b) => b.date.localeCompare(a.date));

  if (sorted.length === 0) return 0;

  // Check if today or yesterday has activity
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  let streak = 0;
  let currentDate = new Date(today);

  // Start from today or yesterday
  let checkDate = sorted[0].date === today ? today : yesterdayStr;

  while (true) {
    const dateStr = currentDate.toISOString().split('T')[0];
    const hasActivity = sorted.some(a => a.date === dateStr);

    if (hasActivity) {
      streak++;
      currentDate.setDate(currentDate.getDate() - 1);
    } else {
      break;
    }

    // Safety check to prevent infinite loop
    if (streak > 365) break;
  }

  return streak;
}
// Get longest activity streak
export function getLongestActivityStreak(): number {
  const activities = getActivityRecords();
  if (activities.length === 0) return 0;

  // Sort by date ascending to process chronologically
  const sorted = activities
    .filter(a => a.count > 0)
    .sort((a, b) => a.date.localeCompare(b.date));

  if (sorted.length === 0) return 0;

  let maxStreak = 0;
  let currentStreak = 0;
  let lastDate: Date | null = null;

  sorted.forEach(record => {
    const currentDate = new Date(record.date);
    currentDate.setHours(0, 0, 0, 0);

    if (lastDate === null) {
      currentStreak = 1;
    } else {
      const diffDays = Math.round((currentDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        currentStreak++;
      } else if (diffDays > 1) {
        currentStreak = 1;
      }
    }

    if (currentStreak > maxStreak) {
      maxStreak = currentStreak;
    }

    lastDate = currentDate;
  });

  return maxStreak;
}
