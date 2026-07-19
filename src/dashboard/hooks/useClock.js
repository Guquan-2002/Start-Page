import { useEffect, useState } from 'react';
import { formatClock } from '../utils/clock.js';

const TIME_UPDATE_INTERVAL = 1000;

export function useClock() {
    const [now, setNow] = useState(() => new Date());

    useEffect(() => {
        const update = () => {
            setNow(new Date());
        };

        void update();
        const intervalId = window.setInterval(update, TIME_UPDATE_INTERVAL);

        return () => window.clearInterval(intervalId);
    }, []);

    return formatClock(now);
}
