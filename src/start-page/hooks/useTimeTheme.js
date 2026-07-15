import { useEffect, useState } from 'react';

const TIME_THEME_CLASSES = [
    'morning',
    'day',
    'evening',
    'night'
];
const THEME_CHECK_INTERVAL = 60 * 1000;

function getTimeTheme(hour) {
    if (hour >= 6 && hour < 8) return 'morning';
    if (hour >= 8 && hour < 16) return 'day';
    if (hour >= 16 && hour < 18) return 'evening';
    return 'night';
}

export function useTimeTheme() {
    const [theme, setTheme] = useState(() => getTimeTheme(new Date().getHours()));

    useEffect(() => {
        const body = document.body;

        const updateTheme = () => {
            const nextTheme = getTimeTheme(new Date().getHours());
            body.classList.remove(...TIME_THEME_CLASSES);
            body.classList.add(nextTheme);
            setTheme(nextTheme);
        };

        updateTheme();
        const timerId = window.setInterval(updateTheme, THEME_CHECK_INTERVAL);

        return () => {
            window.clearInterval(timerId);
            body.classList.remove(...TIME_THEME_CLASSES);
        };
    }, []);

    return theme;
}
