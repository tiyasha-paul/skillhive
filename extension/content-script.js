// Content script to sync data with SkillHive Dashboard

// Only run on the dashboard extension page
if (window.location.pathname.includes('/student/extension')) {
    console.log('SkillHive Extension Content Script Active');

    // Function to send data to the page
    function syncData() {
        chrome.storage.local.get(['activityLog'], (result) => {
            const data = result.activityLog || [];
            window.postMessage({ type: 'SKILLHIVE_EXTENSION_DATA', payload: data }, '*');
        });
    }

    // Initial Sync
    syncData();

    // Listen for changes
    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === 'local' && changes.activityLog) {
            syncData();
        }
    });

    // Listen for requests from the web app
    window.addEventListener('message', (event) => {
        if (event.data.type === 'REQUEST_EXTENSION_DATA') {
            syncData();
        }
    });
}
