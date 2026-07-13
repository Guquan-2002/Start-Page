import { useEffect } from 'react';

import { CONFIG } from '../config.js';

const TIME_THEME_CLASSES = [
    'morning',
    'day',
    'evening',
    'night'
];

function getTimeTheme(hour) {
    if (hour >= 6 && hour < 8) return 'morning';
    if (hour >= 8 && hour < 16) return 'day';
    if (hour >= 16 && hour < 18) return 'evening';
    return 'night';
}

export function useTimeTheme(interval = CONFIG.THEME_CHECK_INTERVAL) {
    useEffect(() => {
        const body = document.body;
        const previousThemeClasses = TIME_THEME_CLASSES.filter((className) => (
            body.classList.contains(className)
        ));

        const updateTheme = () => {
            body.classList.remove(...TIME_THEME_CLASSES);
            body.classList.add(getTimeTheme(new Date().getHours()));
        };

        updateTheme();
        const timerId = window.setInterval(updateTheme, interval);

        return () => {
            window.clearInterval(timerId);
            body.classList.remove(...TIME_THEME_CLASSES);
            body.classList.add(...previousThemeClasses);
        };
    }, [interval]);
}
