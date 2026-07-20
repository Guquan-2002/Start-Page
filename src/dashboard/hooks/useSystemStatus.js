import { useEffect, useState } from 'react';

const SYSTEM_CHECK_INTERVAL = 1 * 1000;

export function useSystemStatus() {
    const [status, setStatus] = useState(null);

    useEffect(() => {
        const controller = new AbortController();
        let timeoutId;

        const update = async () => {
            try {
                const response = await fetch('/api/system', { signal: controller.signal });
                if (!response.ok) throw new Error(`HTTP ${response.status}`);

                const data = await response.json();
                if (!controller.signal.aborted) {
                    setStatus(data);
                }
            } catch {
                if (!controller.signal.aborted) {
                    setStatus(null);
                }
            } finally {
                if (!controller.signal.aborted) {
                    timeoutId = window.setTimeout(update, SYSTEM_CHECK_INTERVAL);
                }
            }
        };

        void update();

        return () => {
            controller.abort();
            window.clearTimeout(timeoutId);
        };
    }, []);

    return status;
}
