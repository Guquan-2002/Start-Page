import { useSystemStatus } from '../hooks/useSystemStatus.js';
import './SystemStatus.css';


export function SystemStatus() {
    const status = useSystemStatus();

    const cpuText = status ? `${Math.round(status.cpuPercent)} %` : '--';
    const memoryText = status
        ? `${((status.memTotalMB - status.memAvailableMB) / 1024).toFixed(1)} / ${(status.memTotalMB / 1024).toFixed(1)} GiB`
        : '--';

    return (
        <div id="system-status" aria-label="系统状态">
            <span className="system-status-row">
                <span>CPU</span>
                <span className="system-status-value">{cpuText}</span>
            </span>
            <span className="system-status-row">
                <span>内存</span>
                <span className="system-status-value">{memoryText}</span>
            </span>
        </div>
    );
}
