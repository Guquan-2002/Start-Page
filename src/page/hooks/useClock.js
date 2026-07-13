import { useEffect, useState } from 'react';

import { CONFIG } from '../config.js';

function formatClock(now) {
    return {
        time: now.toLocaleTimeString('zh-CN', { hour12: false }),
        date: `${now.toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        })} ${now.toLocaleDateString('zh-CN', { weekday: 'long' })}`
    };
}

export function useClock(interval = CONFIG.TIME_UPDATE_INTERVAL) {
    const [now, setNow] = useState(() => new Date());

    useEffect(() => {
        const timerId = window.setInterval(() => {
            setNow(new Date());
        }, interval);

        return () => window.clearInterval(timerId);
    }, [interval]);

    return formatClock(now);
}
