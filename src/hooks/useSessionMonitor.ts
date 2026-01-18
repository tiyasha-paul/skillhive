import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getTimetableSessions, getSessionStatus } from '@/services/timetable';
import { createNotification } from '@/services/notifications';
import { toast } from 'sonner';

export function useSessionMonitor() {
    const { user } = useAuth();

    useEffect(() => {
        if (!user) return;

        const checkSessions = async () => {
            try {
                const sessions = await getTimetableSessions(user.id);
                const now = new Date();
                const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                const todayDay = dayNames[now.getDay()];

                const todaySessions = sessions.filter(s => s.day === todayDay);

                todaySessions.forEach(async (session) => {
                    // Check if session is completed (using logic similar to timetable service)
                    const completedKey = `user_${user.id}_completed_sessions`;
                    const baseKey = 'completed_sessions';
                    const completedSessions = JSON.parse(localStorage.getItem(completedKey) || localStorage.getItem(baseKey) || '[]');

                    if (session.id && completedSessions.includes(session.id)) return;
                    if (session.status === 'completed') return;

                    const endTimeParts = session.end_time.split(':').map(Number);
                    const sessionEnd = new Date(now);
                    sessionEnd.setHours(endTimeParts[0], endTimeParts[1], 0, 0);

                    // Check if session has ended (buffer of 1 minute)
                    if (now > sessionEnd) {
                        const notificationKey = `notified_missed_${session.id}_${new Date().toDateString()}`;

                        // Check if already notified for this specific session instance
                        if (!localStorage.getItem(notificationKey)) {

                            // Mark as notified immediately
                            localStorage.setItem(notificationKey, 'true');

                            // Send Notification
                            await createNotification(user.id, {
                                type: 'alert',
                                title: 'Missed Session',
                                message: `You missed your ${session.subject} session. It ended at ${formatTime(session.end_time)}.`,
                                metadata: { sessionId: session.id, event: 'missed' },
                            });

                            toast.error(`Missed Session: ${session.subject}`, {
                                description: `Session ended at ${formatTime(session.end_time)}`,
                            });
                        }
                    }
                });
            } catch (error) {
                console.error('Error in session monitor:', error);
            }
        };

        // Run immediately and then every minute
        checkSessions();
        const interval = setInterval(checkSessions, 60000);

        return () => clearInterval(interval);
    }, [user]);
}

function formatTime(timeString: string): string {
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
}
