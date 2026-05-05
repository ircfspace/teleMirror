// Internationalization System
const translations = {
    en: enTranslations,
    fa: faTranslations
};

class I18n {
    static currentLang = 'en';

    static init() {
        const savedLang = localStorage.getItem('appLanguage') || 'en';
        this.setLanguage(savedLang, false);
    }

    static setLanguage(lang, updateUI = true) {
        this.currentLang = lang;
        localStorage.setItem('appLanguage', lang);
        document.documentElement.lang = lang;

        if (lang === 'fa') {
            document.body.classList.add('lang-fa');
            document.body.classList.remove('lang-en');
        } else {
            document.body.classList.add('lang-en');
            document.body.classList.remove('lang-fa');
        }

        if (updateUI) {
            this.updateAllElements();
            // Trigger custom event for other components
            document.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang } }));
        }
    }

    static t(key, ...args) {
        const text = translations[this.currentLang]?.[key] || translations['en'][key] || key;
        return args.length ? this.format(text, args) : text;
    }

    static format(str, args) {
        return str.replace(/{(\d+)}/g, (match, index) =>
            args[index] !== undefined ? args[index] : match
        );
    }

    static updateAllElements() {
        // Update elements with data-i18n attribute
        document.querySelectorAll('[data-i18n]').forEach((el) => {
            const key = el.getAttribute('data-i18n');
            if (el.hasAttribute('placeholder')) {
                el.placeholder = this.t(key);
            } else if (el.hasAttribute('title')) {
                el.title = this.t(key);
            } else {
                el.textContent = this.t(key);
            }
        });

        // Update elements with data-i18n-html attribute
        document.querySelectorAll('[data-i18n-html]').forEach((el) => {
            const key = el.getAttribute('data-i18n-html');
            el.innerHTML = this.t(key);
        });
    }

    static getLanguage() {
        return this.currentLang;
    }

    static isRTL() {
        return this.currentLang === 'fa';
    }
}
