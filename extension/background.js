// Background script for productivity tracking

let activeTabId = null;
let activeTabStartTime = null;
let activeTabUrl = null;

// Initialize storage
chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.local.get(['activityLog', 'settings', 'distractionState'], (result) => {
        if (!result.activityLog) {
            chrome.storage.local.set({ activityLog: [] });
        }
        if (!result.settings) {
            chrome.storage.local.set({ settings: { focusMode: false } });
        }
        if (!result.distractionState) {
            chrome.storage.local.set({ distractionState: { startTime: null, lastAlertTime: null } });
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
            'stackoverflow.com', 'github.com', 'udemy.com', 'coursera.org',
            'edx.org', 'khanacademy.org', 'w3schools.com',
            'chatgpt.com', 'claude.ai', 'gemini.google.com',
            'skillhive-gamma.vercel.app', 'linkedin.com'
        ];

        // Distraction domains
        const distraction = [
            'facebook.com', 'twitter.com', 'instagram.com', 'tiktok.com',
            'netflix.com', 'reddit.com', 'twitch.tv', 'x.com'
        ];

        if (education.some(d => hostname.includes(d))) {
            return 'Learning';
        }

        if (hostname.includes('youtube.com') || hostname.includes('spotify.com')) {
            return 'Mixed'; // Could be learning or distraction
        }

        if (distraction.some(d => hostname.includes(d))) return 'Distraction';

        return 'Neutral';
    } catch (e) {
        return 'Unknown';
    }
}

// Log activity function
function logActivity(tabId, url, title, startTime, endTime) {
    if (!url || !startTime || !endTime) return;

    const duration = (endTime - startTime) / 1000; // seconds
    if (duration < 1) return; // Ignore very short interactions

    const category = categorizeUrl(url, title);

    // Check for distraction alert - REMOVED: Alerts should only come from Alarm/Timer, not from logging history (which happens on tab switch)
    // checkDistractionAlert(category);

    const entry = {
        url,
        domain: new URL(url).hostname,
        category,
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

function checkDistractionAlert(category) {
    chrome.storage.local.get(['settings', 'distractionState'], (result) => {
        const settings = result.settings || { enabled: true, interval: '5' };
        const state = result.distractionState || { startTime: null, lastAlertTime: null };

        // Allow alerts for both Distraction and Mixed
        const isDistracting = category === 'Distraction' || category === 'Mixed';

        if (!settings.enabled || !isDistracting) {
            return;
        }

        const now = Date.now();
        if (!state.startTime) {
            // Should have been set by updateDistractionState, but double check
            chrome.storage.local.set({ distractionState: { startTime: now, lastAlertTime: now } });
            return;
        }

        const intervalMinutes = parseInt(settings.interval) || 5;
        const intervalMs = intervalMinutes * 60 * 1000;

        // Check if enough time has passed since last alert
        if (state.lastAlertTime && (now - state.lastAlertTime >= intervalMs)) {
            // Trigger System Notification
            chrome.notifications.create({
                type: 'basic',
                iconUrl: 'icons/icon128.png',
                title: 'Distraction Alert!',
                message: `You've been on ${category} sites for over ${intervalMinutes} minutes. Time to refocus?`,
                priority: 2
            });

            // Trigger In-Page Alert (Overlay)
            chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
                if (tabs && tabs.length > 0) {
                    console.log('Sending alert to tab:', tabs[0].url);
                    chrome.tabs.sendMessage(tabs[0].id, {
                        type: 'SHOW_ALERT',
                        message: `You've been on ${category} sites for over ${intervalMinutes} minutes. Time to refocus?`
                    }).catch(err => console.log('Could not send alert to tab (content script might be missing):', err));
                }
            });

            // Update last alert time
            chrome.storage.local.set({ distractionState: { ...state, lastAlertTime: now } });
        }
    });
}

// Helper to handle distraction state updates
function updateDistractionState(category, now) {
    const isDistracting = category === 'Distraction' || category === 'Mixed';

    chrome.storage.local.get(['distractionState'], (result) => {
        const state = result.distractionState || { startTime: null, lastAlertTime: null };

        if (isDistracting) {
            if (!state.startTime) {
                // Start tracking
                chrome.storage.local.set({ distractionState: { startTime: now, lastAlertTime: now } });
            }
            // If already started, do nothing (keep counting)
        } else {
            // Safe category -> Reset timer if it was running
            if (state.startTime) {
                chrome.storage.local.set({ distractionState: { startTime: null, lastAlertTime: null } });
            }
        }
    });
}

// Listen for settings updates
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'UPDATE_SETTINGS') {
        chrome.storage.local.set({ settings: message.settings });
    }
});

// Track tab activation
let activeTabTitle = null;

chrome.tabs.onActivated.addListener(async (activeInfo) => {
    const now = Date.now();

    // Log previous tab activity
    if (activeTabId && activeTabStartTime && activeTabUrl) {
        logActivity(activeTabId, activeTabUrl, activeTabTitle, activeTabStartTime, now);
    }

    // Set new active tab
    activeTabId = activeInfo.tabId;
    activeTabStartTime = now;

    try {
        const tab = await chrome.tabs.get(activeTabId);
        activeTabUrl = tab.url;
        activeTabTitle = tab.title;

        // Immediate check for distraction start
        const category = categorizeUrl(activeTabUrl, activeTabTitle);
        updateDistractionState(category, now);

    } catch (e) {
        activeTabUrl = null;
        activeTabTitle = null;
    }
});

// Track URL/Title updates in active tab
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (tabId === activeTabId && (changeInfo.url || changeInfo.title)) {
        const now = Date.now();

        // Log previous activity
        if (activeTabStartTime && activeTabUrl) {
            const duration = (now - activeTabStartTime) / 1000;
            if (duration > 1) {
                logActivity(tabId, activeTabUrl, activeTabTitle, activeTabStartTime, now);
                activeTabStartTime = now;
            }
        }

        // Update current state
        if (changeInfo.url) activeTabUrl = changeInfo.url;
        if (changeInfo.title) activeTabTitle = changeInfo.title;
        // Also ensure we have the latest if not in changeInfo
        if (!changeInfo.url) activeTabUrl = tab.url;
        if (!changeInfo.title) activeTabTitle = tab.title;

        // Check category update
        const category = categorizeUrl(activeTabUrl, activeTabTitle);
        updateDistractionState(category, now);
    }
});

// Handle window focus changes
chrome.windows.onFocusChanged.addListener(async (windowId) => {
    const now = Date.now();

    if (windowId === chrome.windows.WINDOW_ID_NONE) {
        // Browser lost focus
        if (activeTabId && activeTabStartTime && activeTabUrl) {
            logActivity(activeTabId, activeTabUrl, activeTabTitle, activeTabStartTime, now);
        }
        activeTabStartTime = null;
        // Do NOT reset distraction timer here, just let it sit (or pause it?)
        // If we pause, we need to track accumulated time.
        // For simplicity: If browser is not focused, we assume user is NOT distracted by browser.
        // So we can pause/reset. Let's reset for now as "not on browser".
        chrome.storage.local.set({ distractionState: { startTime: null, lastAlertTime: null } });

    } else {
        // Browser gained focus
        try {
            const tabs = await chrome.tabs.query({ active: true, windowId });
            if (tabs.length > 0) {
                activeTabId = tabs[0].id;
                activeTabUrl = tabs[0].url;
                activeTabTitle = tabs[0].title;
                activeTabStartTime = now;

                const category = categorizeUrl(activeTabUrl, activeTabTitle);
                updateDistractionState(category, now);
            }
        } catch (e) {
            console.error(e);
        }
    }
});

// Periodic check for distraction alerts
chrome.alarms.create('distractionCheck', { periodInMinutes: 0.5 }); // Check every 30s

chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'distractionCheck') {
        // We need to re-fetch active tab info because globals might be gone if SW restarted
        // BUT activeTabId global is also risky.
        // Better to query active tab again for robust checking.
        chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
            if (tabs && tabs.length > 0) {
                const tab = tabs[0];
                const category = categorizeUrl(tab.url, tab.title);
                checkDistractionAlert(category);
            }
        });
    }
});
