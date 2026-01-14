// Background script for productivity tracking

let activeTabId = null;
let activeTabStartTime = null;
let activeTabUrl = null;

// Initialize storage
chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.local.get(['activityLog', 'settings'], (result) => {
        if (!result.activityLog) {
            chrome.storage.local.set({ activityLog: [] });
        }
        if (!result.settings) {
            chrome.storage.local.set({ settings: { focusMode: false } });
        }
    });
});

// Helper to categorize URL
function categorizeUrl(url) {
    if (!url) return 'Unknown';
    try {
        const hostname = new URL(url).hostname;

        // Educational domains
        const education = [
            'stackoverflow.com',
            'github.com',
            'udemy.com',
            'coursera.org',
            'edx.org',
            'khanacademy.org',
            'w3schools.com',
            'developer.mozilla.org',
            'localhost', // For SkillHive itself
            'chatgpt.com',
            'claude.ai',
            'gemini.google.com'
        ];

        // Distraction domains
        const distraction = [
            'facebook.com',
            'twitter.com',
            'instagram.com',
            'tiktok.com',
            'netflix.com',
            'reddit.com',
            'twitch.tv'
        ];

        if (education.some(d => hostname.includes(d))) {
            // Exception for youtube: depends on content, but for now mark as mixed or specific logic needed
            return 'Learning';
        }

        if (hostname.includes('youtube.com')) {
            return 'Mixed'; // Could be learning or distraction
        }

        if (distraction.some(d => hostname.includes(d))) return 'Distraction';

        return 'Neutral';
    } catch (e) {
        return 'Unknown';
    }
}

// Log activity function
function logActivity(tabId, url, startTime, endTime) {
    if (!url || !startTime || !endTime) return;

    const duration = (endTime - startTime) / 1000; // seconds
    if (duration < 1) return; // Ignore very short interactions

    const entry = {
        url,
        domain: new URL(url).hostname,
        category: categorizeUrl(url),
        startTime,
        endTime,
        duration
    };

    chrome.storage.local.get(['activityLog'], (result) => {
        const log = result.activityLog || [];
        log.push(entry);
        // Keep only last 7 days
        const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
        const filteredLog = log.filter(item => item.startTime > sevenDaysAgo);

        chrome.storage.local.set({ activityLog: filteredLog });
    });
}

// Track tab activation
chrome.tabs.onActivated.addListener(async (activeInfo) => {
    const now = Date.now();

    // Log previous tab activity
    if (activeTabId && activeTabStartTime && activeTabUrl) {
        logActivity(activeTabId, activeTabUrl, activeTabStartTime, now);
    }

    // Set new active tab
    activeTabId = activeInfo.tabId;
    activeTabStartTime = now;

    try {
        const tab = await chrome.tabs.get(activeTabId);
        activeTabUrl = tab.url;
    } catch (e) {
        activeTabUrl = null;
    }
});

// Track URL updates in active tab
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (tabId === activeTabId && changeInfo.url) {
        const now = Date.now();

        // Log previous URL activity
        if (activeTabStartTime && activeTabUrl) {
            logActivity(tabId, activeTabUrl, activeTabStartTime, now);
        }

        // Start new URL tracking
        activeTabUrl = changeInfo.url;
        activeTabStartTime = now;
    }
});

// Handle window focus changes (stop tracking if browser loses focus)
chrome.windows.onFocusChanged.addListener(async (windowId) => {
    const now = Date.now();

    if (windowId === chrome.windows.WINDOW_ID_NONE) {
        // Browser lost focus
        if (activeTabId && activeTabStartTime && activeTabUrl) {
            logActivity(activeTabId, activeTabUrl, activeTabStartTime, now);
        }
        activeTabStartTime = null;
    } else {
        // Browser gained focus
        try {
            const tabs = await chrome.tabs.query({ active: true, windowId });
            if (tabs.length > 0) {
                activeTabId = tabs[0].id;
                activeTabUrl = tabs[0].url;
                activeTabStartTime = now;
            }
        } catch (e) {
            console.error(e);
        }
    }
});
