let logs = [];

/* Fetch logs from API & update logs */
async function fetchLogs() {
    try {
        const data = await (await fetch('https://api.sylvain.pro/logs')).json();
        const newLogs = data.filter(log =>
            !logs.some(old =>
                old.timestamp === log.timestamp &&
                old.method === log.method &&
                old.url === log.url
            )
        );
        logs = data;
        updateTimeline(newLogs);
    } catch (error) {
        console.error('Error fetching logs:', error);
    }
}

/* Update the timeline with new logs */
function updateTimeline(logs) {
    const timeline = document.getElementById('timeline');
    logs.forEach(log => {
        const logElement = document.createElement('div');
        let method, status = '';

        if (log.method === 'GET') method = 'method-get';
        else if (log.method === 'POST') method = 'method-post';

        if (log.status === 200) status = 'status-200';
        else if (log.status === 404 || log.status === 500) status = 'status-error';

        logElement.classList.add('timeline-item');
        logElement.innerHTML = `
            <div class="timeline-item-content">
                <div class="status ${status}">${log.status}</div>
                <div class="method ${method}">${log.method}</div>
                <div class="request">${log.method} ${log.url}</div>
                <div class="subtitle">${new Date(log.timestamp).toLocaleString()} &nbsp;-&nbsp; ${log.duration} ${log.platform ? '&nbsp;-&nbsp; ' + log.platform : ''}</div>
            </div>
        `;
        timeline.prepend(logElement);
    });
}

/* Fetch logs on page load & then every 2 seconds */
setInterval(fetchLogs, 2000);
fetchLogs();