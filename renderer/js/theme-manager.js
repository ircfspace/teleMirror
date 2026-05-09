// Theme Manager
class ThemeManager {
    static init() {
        // Load saved theme or default to dark
        const savedTheme = localStorage.getItem('appTheme') || 'dark';
        const body = document.body;
        const themeIcon = document.querySelector('#themeSwitchBottom .menu-icon');

        if (savedTheme === 'light') {
            body.classList.add('light-theme');
            if (themeIcon) themeIcon.textContent = '☀️';
        } else {
            if (themeIcon) themeIcon.textContent = '🌙';
        }

        this.setupEventListeners();
    }

    static setupEventListeners() {
        const themeSwitch = document.getElementById('themeSwitchBottom');

        if (themeSwitch) {
            themeSwitch.addEventListener('click', () => {
                this.toggleTheme();
            });
        }
    }

    static toggleTheme() {
        const body = document.body;
        const themeIcon = document.querySelector('#themeSwitchBottom .menu-icon');

        if (body.classList.contains('light-theme')) {
            // Switch to dark
            body.classList.remove('light-theme');
            themeIcon.textContent = '🌙';
            localStorage.setItem('appTheme', 'dark');
        } else {
            // Switch to light
            body.classList.add('light-theme');
            themeIcon.textContent = '☀️';
            localStorage.setItem('appTheme', 'light');
        }
    }
}
