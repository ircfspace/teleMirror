// Server-side Internationalization
const en = require('./locales/en');
const fa = require('./locales/fa');

const translations = {
    en,
    fa
};

class ServerI18n {
    static t(key, lang, ...args) {
        const currentLang = lang || 'en';
        const text = translations[currentLang]?.[key] || translations['en'][key] || key;
        return args.length ? this.format(text, args) : text;
    }

    static format(str, args) {
        return str.replace(/{(\d+)}/g, (match, index) =>
            args[index] !== undefined ? args[index] : match
        );
    }
}

module.exports = { ServerI18n };
