import { useEffect, useState } from 'react';

const SYSTEM_CHECK_INTERVAL = 1 * 1000;

export function useSystemStatus() {
    const [status, setStatus] = useState(null);

    useEffect(() => {
        const update = async () => {
            const response = await fetch('/api/system');
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            setStatus(data);
        };

        void update();
        const intervalId = window.setInterval(update, SYSTEM_CHECK_INTERVAL);

        return () => window.clearInterval(intervalId);
    }, []);

    return status;
}
