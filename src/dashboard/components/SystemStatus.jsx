import { useSystemStatus } from '../hooks/useSystemStatus.js';
import './SystemStatus.css';

function formatGB(mb) {
    return (mb / 1024).toFixed(1);
}

export function SystemStatus() {
    const status = useSystemStatus();

    const cpuText = status ? `${Math.round(status.cpuPercent)}%` : '--';
    const memoryText = status
        ? `${formatGB(status.memTotalMB - status.memAvailableMB)}/${formatGB(status.memTotalMB)}G`
        : '--';

    return (
        <div id="system-status" aria-label="系统状态">
            <span className="system-status-row">CPU {cpuText}</span>
            <span className="system-status-row">内存 {memoryText}</span>
        </div>
    );
}
