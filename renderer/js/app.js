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

            console.log(
                'Converting to Persian date:',
                date.getFullYear(),
                date.getMonth() + 1,
                date.getDate()
            );

            const today = new Date();
            const todayYear = today.getFullYear();
            const todayMonth = today.getMonth() + 1;
            const todayDay = today.getDate();

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
                'فروردین',
                'اردیبهشت',
                'خرداد',
                'تیر',
                'مرداد',
                'شهریور',
                'مهر',
                'آبان',
                'آذر',
                'دی',
                'بهمن',
                'اسفند'
            ];

            // Format based on recency using Persian dates
            if (
                persianYear === todayPersianYear &&
                persianMonth === todayPersianMonth &&
                persianDay === todayPersianDay
            ) {
                return 'امروز';
            } else if (
                persianYear === todayPersianYear &&
                persianMonth === todayPersianMonth &&
                persianDay === todayPersianDay - 1
            ) {
                return 'دیروز';
            } else if (persianYear === todayPersianYear && persianMonth === todayPersianMonth) {
                return `${persianDay} ${persianMonths[persianMonth - 1]}`;
            } else if (persianYear === todayPersianYear) {
                return `${persianDay} ${persianMonths[persianMonth - 1]}`;
            } else {
                return `${persianDay} ${persianMonths[persianMonth - 1]} ${persianYear}`;
            }
        } catch (error) {
            console.error('Persian date formatting error:', error, 'for date:', dateString);
            return dateString; // Fallback to original date
        }
    }
}
