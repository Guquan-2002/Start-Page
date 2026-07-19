import { useEffect, useState } from 'react';
import './SystemStatus.css';

const SYSTEM_CHECK_INTERVAL = 1 * 1000;

function formatMemoryGB(mb) {
    return (mb / 1024).toFixed(1);
}

export function SystemStatus() {
    const [status, setStatus] = useState(null);

    useEffect(() => {
        let disposed = false;

        const updateSystemStatus = async () => {
            try {
                const response = await fetch('/api/system');
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                const data = await response.json();
                if (!disposed) setStatus(data);
            } catch (error) {
                // 读取失败时保留上次成功的数值
                console.error('读取系统状态失败:', error);
            }
        };

        void updateSystemStatus();
        const intervalId = window.setInterval(() => {
            void updateSystemStatus();
        }, SYSTEM_CHECK_INTERVAL);

        return () => {
            disposed = true;
            window.clearInterval(intervalId);
        };
    }, []);

    const cpuText = status ? `${Math.round(status.cpuPercent)}%` : '--';
    const memoryText = status
        ? `${formatMemoryGB(status.memTotalMB - status.memAvailableMB)}/${formatMemoryGB(status.memTotalMB)}G`
        : '--';

    return (
        <div id="system-status" aria-label="系统状态">
            <span className="system-status-row">CPU {cpuText}</span>
            <span className="system-status-row">内存 {memoryText}</span>
        </div>
    );
}
