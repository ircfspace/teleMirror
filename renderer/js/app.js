// Persian Calendar Converter
class PersianCalendar {
    static gregorianToPersian(gy, gm, gd) {
        const g_d = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
        let jy, jm, jd;

        if (gy > 1600) {
            jy = 979;
            gy -= 1600;
        } else {
            jy = 0;
            gy -= 621;
        }

        if (gm > 2) {
            let gy2 = gy + 1;
            let gm2 = gm - 3;
        } else {
            let gy2 = gy;
            let gm2 = gm + 9;
        }

        let days =
            365 * gy +
            Math.floor((gy + 3) / 4) -
            Math.floor((gy + 99) / 100) +
            Math.floor((gy + 399) / 400);
        days += g_d[gm - 1] + gd;

        if (gm > 2) {
            days++;
        }

        jy += Math.floor((33 * days) / 12053);
        days = days % 12053;
        jy += Math.floor((4 * days) / 1461);
        days = days % 1461;

        if (days > 365) {
            jy += Math.floor((days - 1) / 365);
            days = (days - 1) % 365;
        }

        if (days < 186) {
            jm = Math.floor(1 + days / 31);
            jd = 1 + (days % 31);
        } else {
            jm = Math.floor(7 + (days - 186) / 30);
            jd = 1 + ((days - 186) % 30);
        }

        return [jy, jm, jd];
    }

    static formatDate(dateString) {
        if (!dateString) return '';

        try {
            // Create date object
            const date = new Date(dateString);

            // Check if date is valid
            if (isNaN(date.getTime())) {
                console.log('Invalid date:', dateString);
                return dateString;
            }

            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            const time = `${hours}:${minutes}`;

            const today = new Date();
            const todayYear = today.getFullYear();
            const todayMonth = today.getMonth() + 1;
            const todayDay = today.getDate();

            // Use English/Gregorian format when language is English
            if (typeof I18n !== 'undefined' && I18n.getLanguage() === 'en') {
                const isToday =
                    date.getFullYear() === today.getFullYear() &&
                    date.getMonth() === today.getMonth() &&
                    date.getDate() === today.getDate();
                const isYesterday =
                    date.getFullYear() === today.getFullYear() &&
                    date.getMonth() === today.getMonth() &&
                    date.getDate() === today.getDate() - 1;

                if (isToday) {
                    return `${I18n.t('today')} - ${time}`;
                } else if (isYesterday) {
                    return `${I18n.t('yesterday')} - ${time}`;
                } else {
                    const dateStr = date.toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
                    });
                    return `${dateStr} - ${time}`;
                }
            }

            // Convert to Persian calendar
            const [persianYear, persianMonth, persianDay] = this.gregorianToPersian(
                date.getFullYear(),
                date.getMonth() + 1,
                date.getDate()
            );
            const [todayPersianYear, todayPersianMonth, todayPersianDay] = this.gregorianToPersian(
                todayYear,
                todayMonth,
                todayDay
            );

            const persianMonths = [
                I18n.t('january'),
                I18n.t('february'),
                I18n.t('march'),
                I18n.t('april'),
                I18n.t('may'),
                I18n.t('june'),
                I18n.t('july'),
                I18n.t('august'),
                I18n.t('september'),
                I18n.t('october'),
                I18n.t('november'),
                I18n.t('december')
            ];

            // Format based on recency using Persian dates
            if (
                persianYear === todayPersianYear &&
                persianMonth === todayPersianMonth &&
                persianDay === todayPersianDay
            ) {
                return `${I18n.t('today')} - ${time}`;
            } else if (
                persianYear === todayPersianYear &&
                persianMonth === todayPersianMonth &&
                persianDay === todayPersianDay - 1
            ) {
                return `${I18n.t('yesterday')} - ${time}`;
            } else if (persianYear === todayPersianYear && persianMonth === todayPersianMonth) {
                return `${persianDay} ${persianMonths[persianMonth - 1]} - ${time}`;
            } else if (persianYear === todayPersianYear) {
                return `${persianDay} ${persianMonths[persianMonth - 1]} - ${time}`;
            } else {
                return `${persianDay} ${persianMonths[persianMonth - 1]} ${persianYear} - ${time}`;
            }
        } catch (error) {
            console.error('Persian date formatting error:', error, 'for date:', dateString);
            return dateString; // Fallback to original date
        }
    }
}
