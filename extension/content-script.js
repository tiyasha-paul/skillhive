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
        bottom: 24px;
        right: 24px;
        background-color: #0f172a; /* Slate 900 */
        border: 1px solid #1e293b; /* Slate 800 */
        border-radius: 12px;
        padding: 20px;
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5);
        z-index: 2147483647;
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        color: #e2e8f0;
        width: 340px;
        animation: slideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        display: flex;
        flex-direction: column;
        gap: 12px;
        backdrop-filter: blur(8px);
    `;

    const title = document.createElement('h3');
    title.innerText = 'Time to Refocus?';
    title.style.cssText = `
        margin: 0;
        font-size: 16px;
        font-weight: 600;
        letter-spacing: -0.025em;
        color: #f8fafc;
    `;

    const body = document.createElement('p');
    body.innerText = text;
    body.style.cssText = `
        margin: 0;
        font-size: 14px;
        line-height: 1.5;
        color: #94a3b8;
    `;

    const closeBtn = document.createElement('button');
    closeBtn.innerText = 'Dismiss';
    closeBtn.style.cssText = `
        align-self: flex-end;
        background: #334155;
        border: 1px solid #475569;
        padding: 8px 16px;
        border-radius: 8px;
        cursor: pointer;
        font-size: 13px;
        font-weight: 500;
        color: #ffffff;
        transition: all 0.2s;
    `;
    closeBtn.onmouseover = () => {
        closeBtn.style.background = '#475569';
        closeBtn.style.borderColor = '#64748b';
    };
    closeBtn.onmouseout = () => {
        closeBtn.style.background = '#334155';
        closeBtn.style.borderColor = '#475569';
    };
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
