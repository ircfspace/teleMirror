// Progress Manager
class ProgressManager {
    static show() {
        const container = document.getElementById('progressContainer');
        const fill = document.getElementById('progressBarFill');
        const percent = document.getElementById('progressPercent');
        const message = document.getElementById('progressMessage');

        // Reset to initial state (check if elements exist)
        if (fill) {
            fill.style.width = '0%';
        }
        if (percent) {
            percent.textContent = '0%';
        }
        if (message) {
            message.textContent = 'Initializing...';
        }
        if (container) {
            container.style.display = 'block';
        }
    }

    static hide() {
        const container = document.getElementById('progressContainer');
        const fill = document.getElementById('progressFill');
        const percent = document.getElementById('progressPercent');
        const message = document.getElementById('progressMessage');

        // Check if elements exist before accessing them
        if (fill) {
            fill.style.width = '0%';
        }
        if (percent) {
            percent.textContent = '0%';
        }
        if (message) {
            message.textContent = 'Initializing...';
        }
        if (container) {
            container.style.display = 'none';
        }
    }

    static update(progress) {
        const fill = document.getElementById('progressBarFill');
        const percent = document.getElementById('progressPercent');
        const message = document.getElementById('progressMessage');

        if (fill) {
            fill.style.width = progress.percent + '%';
        }
        if (percent) {
            percent.textContent = progress.percent + '%';
        }
        if (message) {
            message.textContent = progress.message;
        }
    }
}
