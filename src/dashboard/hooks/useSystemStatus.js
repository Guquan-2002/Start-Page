import { useEffect, useState } from 'react';

const SYSTEM_CHECK_INTERVAL = 1 * 1000;

export function useSystemStatus() {
    const [status, setStatus] = useState(null);

    useEffect(() => {
        const updateSystemStatus = async () => {
            try {
                const response = await fetch('/api/system');
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                const data = await response.json();
                setStatus(data);
            } catch (error) {
                console.error('读取系统状态失败:', error);
            }
        };

        void updateSystemStatus();
        const intervalId = window.setInterval(() => {
            void updateSystemStatus();
        }, SYSTEM_CHECK_INTERVAL);

        return () => window.clearInterval(intervalId);
    }, []);

    return status;
}
