// Content script to sync data with SkillHive Dashboard

console.log('SkillHive Extension: Content Script Loaded');

// Function to send data
function syncData() {
    chrome.storage.local.get(['activityLog'], (result) => {
        const data = result.activityLog || [];
        // Only log if we are on localhost to reduce console noise on other sites
        if (window.location.hostname === 'localhost') {
            console.log('SkillHive Extension: Sending Data to Page', data);
        }
        window.postMessage({ type: 'SKILLHIVE_EXTENSION_DATA', payload: data }, '*');
    });
}

// Initial Sync
syncData();

// Listen for changes in storage
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes.activityLog) {
        syncData();
    }
});

// Listen for settings updates from Dashboard
document.addEventListener('SKILLHIVE_EXTENSION_SETTINGS', (event) => {
    console.log('Content Script: Received Settings Update', event.detail);
    chrome.runtime.sendMessage({ type: 'UPDATE_SETTINGS', settings: event.detail });
});

// Listen for messages from Background Script (Alerts)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'SHOW_ALERT') {
        showInPageAlert(message.message);
    }
});

function showInPageAlert(text) {
    // Remove existing alert if any
    const existing = document.getElementById('skillhive-alert-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'skillhive-alert-overlay';
    overlay.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background-color: #ffffff;
        border: 2px solid #ef4444;
        border-radius: 12px;
        padding: 16px;
        box-shadow: 0 10px 25px rgba(0,0,0,0.2);
        z-index: 2147483647; /* Max Z-Index */
        font-family: 'Segoe UI', sans-serif;
        color: #1f2937;
        width: 320px;
        animation: slideIn 0.5s ease-out;
        display: flex;
        flex-direction: column;
        gap: 8px;
    `;

    const title = document.createElement('h3');
    title.innerText = '🎯 Time to Refocus?';
    title.style.cssText = `
        margin: 0;
        font-size: 16px;
        font-weight: 700;
        color: #dc2626;
    `;

    const body = document.createElement('p');
    body.innerText = text;
    body.style.cssText = `
        margin: 0;
        font-size: 14px;
        line-height: 1.4;
        color: #4b5563;
    `;

    const closeBtn = document.createElement('button');
    closeBtn.innerText = 'Dismiss';
    closeBtn.style.cssText = `
        align-self: flex-end;
        background: #f3f4f6;
        border: none;
        padding: 6px 12px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 12px;
        font-weight: 600;
        color: #374151;
        transition: background 0.2s;
    `;
    closeBtn.onmouseover = () => closeBtn.style.background = '#e5e7eb';
    closeBtn.onmouseout = () => closeBtn.style.background = '#f3f4f6';
    closeBtn.onclick = () => overlay.remove();

    overlay.appendChild(title);
    overlay.appendChild(body);
    overlay.appendChild(closeBtn);

    // Add animation styles
    const style = document.createElement('style');
    style.innerHTML = `
        @keyframes slideIn {
            from { transform: translateY(100%); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
        }
    `;
    overlay.appendChild(style);

    document.body.appendChild(overlay);

    // Auto dismiss after 10 seconds
    setTimeout(() => {
        if (document.body.contains(overlay)) {
            overlay.remove();
        }
    }, 10000);
}

// Original Listeners
window.addEventListener('message', (event) => {
    // We only care about messages from the same window
    if (event.source !== window) return;

    if (event.data.type === 'REQUEST_EXTENSION_DATA') {
        // console.log('SkillHive Extension: Received Request from Page'); 
        syncData();
    }
});
