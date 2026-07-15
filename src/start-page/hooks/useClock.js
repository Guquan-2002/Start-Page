import { useEffect, useState } from 'react';

const TIME_UPDATE_INTERVAL = 1000;

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

export function useClock() {
    const [now, setNow] = useState(() => new Date());

    useEffect(() => {
        const timerId = window.setInterval(() => {
            setNow(new Date());
        }, TIME_UPDATE_INTERVAL);

        return () => window.clearInterval(timerId);
    }, []);

    return formatClock(now);
}
