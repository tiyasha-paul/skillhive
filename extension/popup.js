document.addEventListener('DOMContentLoaded', () => {
    // Open Dashboard
    document.getElementById('open-dashboard').addEventListener('click', () => {
        chrome.tabs.create({ url: 'http://localhost:5173/student/extension' });
    });

    // Calculate Todays Stats
    chrome.storage.local.get(['activityLog'], (result) => {
        const log = result.activityLog || [];
        const today = new Date().setHours(0, 0, 0, 0);

        let learningSeconds = 0;
        let distractionSeconds = 0;

        log.forEach(entry => {
            if (entry.startTime >= today) {
                if (entry.category === 'Learning') {
                    learningSeconds += entry.duration;
                } else if (entry.category === 'Distraction') {
                    distractionSeconds += entry.duration;
                }
            }
        });

        updateUI(learningSeconds, distractionSeconds);
    });

    function updateUI(learning, distraction) {
        document.getElementById('learning-time').textContent = formatTime(learning);
        document.getElementById('distraction-time').textContent = formatTime(distraction);
    }

    function formatTime(seconds) {
        if (seconds < 60) return '< 1m';
        const m = Math.floor(seconds / 60);
        const h = Math.floor(m / 60);
        if (h > 0) {
            return `${h}h ${m % 60}m`;
        }
        return `${m}m`;
    }
});
