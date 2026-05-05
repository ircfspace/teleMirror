// Language Manager
class LanguageManager {
    static init() {
        // Initialize I18n first
        I18n.init();

        // Update all localized UI elements
        I18n.updateAllElements();

        // Set up event listeners
        this.setupEventListeners();

        // Update UI elements
        this.updateLanguageIcon();
    }

    static setupEventListeners() {
        const langSwitch = document.getElementById('langSwitchBottom');
        if (langSwitch) {
            langSwitch.addEventListener('click', () => {
                this.toggleLanguage();
            });
        }
    }

    static toggleLanguage() {
        const newLang = I18n.getLanguage() === 'en' ? 'fa' : 'en';
        I18n.setLanguage(newLang);
        this.updateLanguageIcon();
    }

    static updateLanguageIcon() {
        const langIcon = document.querySelector('#langSwitchBottom .menu-icon');
        if (langIcon) {
            //langIcon.textContent = I18n.getLanguage() === 'en' ? '🇬🇧' : '🇮🇷';
            langIcon.textContent = '🌐';
        }

        const langButton = document.getElementById('langSwitchBottom');
        if (langButton) {
            langButton.title = I18n.getLanguage() === 'en' ? 'English' : 'فارسی';
        }
    }
}
