// Popup script

document.addEventListener('DOMContentLoaded', () => {
    updateStats();
});

function updateStats() {
    chrome.storage.local.get(['activityLog'], (result) => {
        const log = result.activityLog || [];
        const todayStart = new Date().setHours(0, 0, 0, 0);

        let learning = 0;
        let distraction = 0;
        let mixed = 0;

        log.forEach(entry => {
            if (entry.startTime >= todayStart) {
                if (entry.category === 'Learning') learning += entry.duration;
                else if (entry.category === 'Distraction') distraction += entry.duration;
                else if (entry.category === 'Mixed') mixed += entry.duration;
            }
        });

        // Update Text Stats
        document.getElementById('learning-time').textContent = formatDuration(learning);
        document.getElementById('distraction-time').textContent = formatDuration(distraction);
        document.getElementById('mixed-time').textContent = formatDuration(mixed);

        // Update Bar Chart
        renderChart(learning, mixed, distraction);
    });
}

function renderChart(learning, mixed, distraction) {
    const total = learning + mixed + distraction;
    const chart = document.getElementById('day-chart');
    chart.innerHTML = ''; // Clear previous

    if (total === 0) {
        chart.innerHTML = '<div style="width: 100%; height: 100%; text-align: center; color: #94a3b8; font-size: 10px; line-height: 24px;">No Activity</div>';
        return;
    }

    const learnPct = (learning / total) * 100;
    const mixedPct = (mixed / total) * 100;
    const distractPct = (distraction / total) * 100;

    if (learnPct > 0) appendBar(chart, learnPct, 'bar-green');
    if (mixedPct > 0) appendBar(chart, mixedPct, 'bar-yellow');
    if (distractPct > 0) appendBar(chart, distractPct, 'bar-red');
}

function appendBar(container, widthPct, className) {
    const el = document.createElement('div');
    el.className = `bar-segment ${className}`;
    el.style.width = `${widthPct}%`;
    container.appendChild(el);
}

function formatDuration(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
}
