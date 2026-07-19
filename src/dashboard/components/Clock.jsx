import { useEffect, useState } from 'react';
import './Clock.css';

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

export function Clock() {
    const [now, setNow] = useState(() => new Date());

    useEffect(() => {
        const timerId = window.setInterval(() => {
            setNow(new Date());
        }, TIME_UPDATE_INTERVAL);

        return () => window.clearInterval(timerId);
    }, []);

    const clock = formatClock(now);

    return (
        <div id="time-container" aria-label="Current time">
            <div id="time">{clock.time}</div>
            <div id="date">{clock.date}</div>
        </div>
    );
}
