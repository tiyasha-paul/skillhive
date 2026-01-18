
export interface ExtensionStats {
    focusScore: number;
    learningTime: number; // seconds
    distractionTime: number; // seconds
    mixedTime: number; // seconds
    topSitesToday: { domain: string; duration: number; category: string }[];
}

export interface ActivityEntry {
    url: string;
    domain: string;
    category: 'Learning' | 'Distraction' | 'Mixed' | 'Neutral' | 'Unknown';
    duration: number; // seconds
    startTime: number;
}

// Singleton state to hold the latest data
let cachedStats: ExtensionStats | null = null;
let isListenerSetup = false;

export function setupExtensionListener() {
    if (isListenerSetup) return;

    window.addEventListener('message', (event) => {
        if (event.source !== window) return;

        if (event.data.type === 'SKILLHIVE_EXTENSION_DATA') {
            const log: ActivityEntry[] = event.data.payload || [];
            cachedStats = calculateStats(log);
        }
    });

    // Initial request
    window.postMessage({ type: 'REQUEST_EXTENSION_DATA' }, '*');

    // Poll occasionally
    setInterval(() => {
        window.postMessage({ type: 'REQUEST_EXTENSION_DATA' }, '*');
    }, 5000);

    isListenerSetup = true;
}

export function getExtensionStats(): ExtensionStats | null {
    // If not setup, set it up now
    if (!isListenerSetup) {
        setupExtensionListener();
    }
    // Trigger a fresh request just in case
    window.postMessage({ type: 'REQUEST_EXTENSION_DATA' }, '*');

    return cachedStats;
}

function calculateStats(log: ActivityEntry[]): ExtensionStats {
    const todayStart = new Date().setHours(0, 0, 0, 0);

    let learning = 0;
    let distraction = 0;
    let mixed = 0;

    const siteMapToday: Record<string, { duration: number, category: string }> = {};

    log.forEach(entry => {
        if (entry.startTime >= todayStart) {
            if (entry.category === 'Learning') learning += entry.duration;
            if (entry.category === 'Distraction') distraction += entry.duration;
            if (entry.category === 'Mixed') mixed += entry.duration;

            // Site stats
            if (!siteMapToday[entry.domain]) {
                siteMapToday[entry.domain] = { duration: 0, category: entry.category };
            }
            siteMapToday[entry.domain].duration += entry.duration;
            if (entry.category !== 'Neutral' && entry.category !== 'Unknown') {
                if (siteMapToday[entry.domain].category === 'Neutral' || siteMapToday[entry.domain].category === 'Unknown') {
                    siteMapToday[entry.domain].category = entry.category;
                }
            }
        }
    });

    const totalFocus = learning + distraction;
    const focusScore = totalFocus > 0 ? Math.round((learning / totalFocus) * 100) : 0;

    const topSitesToday = Object.entries(siteMapToday)
        .map(([domain, data]) => ({ domain, ...data }))
        .sort((a, b) => b.duration - a.duration)
        .slice(0, 5);

    return {
        focusScore,
        learningTime: learning,
        distractionTime: distraction,
        mixedTime: mixed,
        topSitesToday
    };
}
