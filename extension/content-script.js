// Content script to sync data with SkillHive Dashboard

console.log('SkillHive Extension: Content Script Loaded');

// Function to send data
function syncData() {
    chrome.storage.local.get(['activityLog'], (result) => {
        const data = result.activityLog || [];
        console.log('SkillHive Extension: Sending Data to Page', data);
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

// Listen for requests from the web app
window.addEventListener('message', (event) => {
    // We only care about messages from the same window
    if (event.source !== window) return;

    if (event.data.type === 'REQUEST_EXTENSION_DATA') {
        console.log('SkillHive Extension: Received Request from Page');
        syncData();
    }
});
