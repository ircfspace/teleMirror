// Settings Management
class SettingsManager {
    constructor() {
        this.versionMode = this.loadVersionMode();
        this.currentTheme = this.loadTheme();
        this.currentLanguage = this.loadLanguage();
        this.setupEventListeners();
        this.applyVersionMode();
        this.applyTheme();
        this.applyLanguage();
    }

    // Load version mode from localStorage (default: light)
    loadVersionMode() {
        const saved = localStorage.getItem('versionMode');
        return saved || 'light';
    }

    // Save version mode to localStorage
    saveVersionMode(mode) {
        localStorage.setItem('versionMode', mode);
        this.versionMode = mode;
        this.applyVersionMode();
    }

    // Load theme from localStorage (default: dark)
    loadTheme() {
        const saved = localStorage.getItem('appTheme');
        return saved || 'dark';
    }

    // Save theme to localStorage
    saveTheme(theme) {
        localStorage.setItem('appTheme', theme);
        this.currentTheme = theme;
        this.applyTheme();
    }

    // Load language from localStorage (default: en)
    loadLanguage() {
        const saved = localStorage.getItem('appLanguage');
        return saved || 'en';
    }

    // Save language to localStorage
    saveLanguage(language) {
        localStorage.setItem('appLanguage', language);
        this.currentLanguage = language;
        this.applyLanguage();
    }

    // Apply version mode to radio buttons
    applyVersionMode() {
        const radioButtons = document.querySelectorAll('input[name="versionMode"]');
        radioButtons.forEach((radio) => {
            radio.checked = radio.value === this.versionMode;
        });
    }

    // Apply theme to radio buttons and body
    applyTheme() {
        const radioButtons = document.querySelectorAll('input[name="theme"]');
        radioButtons.forEach((radio) => {
            radio.checked = radio.value === this.currentTheme;
        });

        // Apply theme to body
        if (this.currentTheme === 'light') {
            document.body.classList.add('light-theme');
        } else {
            document.body.classList.remove('light-theme');
        }
    }

    // Apply language to radio buttons
    applyLanguage() {
        const radioButtons = document.querySelectorAll('input[name="language"]');
        radioButtons.forEach((radio) => {
            radio.checked = radio.value === this.currentLanguage;
        });

        // Apply language to body (only for existing functionality)
        if (this.currentLanguage === 'fa') {
            document.body.classList.add('lang-fa');
        } else {
            document.body.classList.remove('lang-fa');
        }
    }

    // Get current version mode
    getVersionMode() {
        return this.versionMode;
    }

    // Setup event listeners
    setupEventListeners() {
        const settingsButton = document.getElementById('settingsBtnBottom');
        const settingsDialog = document.getElementById('settingsDialog');
        const settingsDialogClose = document.getElementById('settingsDialogClose');
        const restoreDefaultsBtn = document.getElementById('restoreDefaultsBtn');
        const versionModeRadios = document.querySelectorAll('input[name="versionMode"]');
        const themeRadios = document.querySelectorAll('input[name="theme"]');
        const languageRadios = document.querySelectorAll('input[name="language"]');

        // Open settings dialog
        if (settingsButton) {
            settingsButton.addEventListener('click', () => {
                this.openDialog();
            });
        }

        // Close settings dialog
        if (settingsDialogClose) {
            settingsDialogClose.addEventListener('click', () => {
                this.closeDialog();
            });
        }

        // Close dialog when clicking outside
        if (settingsDialog) {
            settingsDialog.addEventListener('click', (e) => {
                if (e.target === settingsDialog) {
                    this.closeDialog();
                }
            });
        }

        // Version mode change
        versionModeRadios.forEach((radio) => {
            radio.addEventListener('change', (e) => {
                if (e.target.checked) {
                    this.saveVersionMode(e.target.value);
                }
            });
        });

        // Theme change
        themeRadios.forEach((radio) => {
            radio.addEventListener('change', (e) => {
                if (e.target.checked) {
                    this.saveTheme(e.target.value);
                }
            });
        });

        // Language change
        languageRadios.forEach((radio) => {
            radio.addEventListener('change', (e) => {
                if (e.target.checked) {
                    this.saveLanguage(e.target.value);
                    // Apply language changes immediately
                    this.applyLanguage();
                    // Update I18n system language first
                    I18n.setLanguage(e.target.value, false);
                    // Update translations in settings dialog only
                    this.updateSettingsTranslations();
                    // Trigger language change event for other components
                    const event = new CustomEvent('languageChanged', {
                        detail: { language: e.target.value }
                    });
                    document.dispatchEvent(event);
                }
            });
        });

        // Restore defaults
        if (restoreDefaultsBtn) {
            restoreDefaultsBtn.addEventListener('click', () => {
                this.restoreDefaults();
            });
        }

        // Listen for language changes
        document.addEventListener('languageChanged', () => {
            this.updateTranslations();
        });
    }

    // Open settings dialog
    openDialog() {
        const settingsDialog = document.getElementById('settingsDialog');
        if (settingsDialog) {
            settingsDialog.classList.add('active');
            this.applyVersionMode();
        }
    }

    // Close settings dialog
    closeDialog() {
        const settingsDialog = document.getElementById('settingsDialog');
        if (settingsDialog) {
            settingsDialog.classList.remove('active');
        }
    }

    // Restore defaults
    async restoreDefaults() {
        if (!confirm(I18n.t('confirmRestoreDefaults'))) {
            return;
        }

        try {
            // Clear version mode (reset to light)
            localStorage.removeItem('versionMode');
            this.versionMode = 'light';
            this.applyVersionMode();

            localStorage.removeItem('appTheme');

            // Clear all channel cache
            const keysToRemove = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('channel_cache_')) {
                    keysToRemove.push(key);
                }
            }
            keysToRemove.forEach((key) => localStorage.removeItem(key));

            // Clear channel list
            localStorage.removeItem('telegramChannels');

            // Reload the page to apply changes
            alert(I18n.t('settingsRestored'));
            location.reload();
        } catch (error) {
            console.error('Error restoring defaults:', error);
            alert(I18n.t('error', error.message));
        }
    }

    // Update translations
    updateTranslations() {
        // Translations are automatically updated via data-i18n attributes
    }

    // Update translations in settings dialog only
    updateSettingsTranslations() {
        // Update all elements with data-i18n attributes in settings dialog
        const settingsElements = document.querySelectorAll('#settingsDialog [data-i18n]');
        settingsElements.forEach((element) => {
            const key = element.getAttribute('data-i18n');
            const translation = I18n.t(key);

            if (element.tagName === 'INPUT' && element.type === 'radio') {
                // For radio buttons, update the span inside the label
                const label = element.closest('label');
                if (label) {
                    const span = label.querySelector('span[data-i18n]');
                    if (span) {
                        span.textContent = translation;
                    }
                }
            } else if (element.tagName === 'SPAN' && element.parentElement.tagName === 'LABEL') {
                // For spans inside labels (radio button text)
                element.textContent = translation;
            } else {
                // For regular elements (h3, p, button, etc.)
                element.textContent = translation;
            }
        });
    }
}

// Initialize settings manager when DOM is ready
let settingsManager;
document.addEventListener('DOMContentLoaded', () => {
    settingsManager = new SettingsManager();
});
