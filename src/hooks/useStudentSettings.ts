import { useState, useEffect } from 'react';

// Define the shape of our settings
export interface StudentSettings {
    notifications: {
        timetableNotifications: boolean;
    };
    privacy: {
        twoStep: boolean;
        visibility: 'mentor' | 'all' | 'private';
    };
    theme: {
        mode: 'light' | 'dark' | 'system';
        accent: 'blue' | 'green' | 'purple';
        animations: boolean;
    };
    learning: {
        format: 'videos' | 'notes' | 'podcasts';
        difficulty: 'normal' | 'hard';
        dailyTime: string;
        quizMode: 'adaptive' | 'timed' | 'practice';
        aiExplain: 'simple' | 'detailed';
    };
    chatbot: {
        enabled: boolean;
        useLearningData: boolean;
        tone: 'formal' | 'casual' | 'teacher';
    };
    jobs: {
        locations: string;
        roles: string;
        preference: 'Internship' | 'Full-time' | 'Both';
        salary: string;
        workType: 'Remote' | 'Hybrid' | 'On-site';
    };
}

const DEFAULT_SETTINGS: StudentSettings = {
    notifications: {
        timetableNotifications: true,
    },
    privacy: {
        twoStep: true,
        visibility: 'mentor',
    },
    theme: {
        mode: 'system',
        accent: 'blue',
        animations: true,
    },
    learning: {
        format: 'videos',
        difficulty: 'normal',
        dailyTime: '2h',
        quizMode: 'adaptive',
        aiExplain: 'detailed',
    },
    chatbot: {
        enabled: true,
        useLearningData: true,
        tone: 'teacher',
    },
    jobs: {
        locations: 'Global / Remote first',
        roles: 'ML Engineer, Data Scientist',
        preference: 'Full-time',
        salary: '₹12L - ₹20L',
        workType: 'Hybrid',
    },
};

const STORAGE_KEY = 'skillhive_student_settings';

export function useStudentSettings() {
    // Load from local storage or use defaults
    const [settings, setSettings] = useState<StudentSettings>(() => {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            try {
                // Merge with defaults to ensure new keys are present if schema updates
                const parsed = JSON.parse(stored);
                return {
                    ...DEFAULT_SETTINGS,
                    ...parsed,
                    notifications: { ...DEFAULT_SETTINGS.notifications, ...(parsed.notifications || {}) },
                    privacy: { ...DEFAULT_SETTINGS.privacy, ...(parsed.privacy || {}) },
                    theme: { ...DEFAULT_SETTINGS.theme, ...(parsed.theme || {}) },
                    learning: { ...DEFAULT_SETTINGS.learning, ...(parsed.learning || {}) },
                    chatbot: { ...DEFAULT_SETTINGS.chatbot, ...(parsed.chatbot || {}) },
                    jobs: { ...DEFAULT_SETTINGS.jobs, ...(parsed.jobs || {}) },
                };
            } catch (e) {
                console.error("Failed to parse settings", e);
                return DEFAULT_SETTINGS;
            }
        }
        return DEFAULT_SETTINGS;
    });

    // Save to local storage whenever settings change
    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    }, [settings]);

    // Helpers to update specific sections
    const updateSection = <K extends keyof StudentSettings>(section: K, newData: Partial<StudentSettings[K]>) => {
        setSettings(prev => ({
            ...prev,
            [section]: { ...prev[section], ...newData }
        }));
    };

    return {
        settings,
        updateSection,
        resetSettings: () => setSettings(DEFAULT_SETTINGS)
    };
}
