import { useNetworkStatusState } from '../../application/status/networkStatus.jsx';
import { useSystemStatusState } from '../../application/status/systemStatus.jsx';
import './StatusCapsule.css';

const MEBIBYTES_PER_GIBIBYTE = 1024;

const NETWORK_STATUS_VIEWS = {
    checking: { modifier: 'checking', text: '检测中' },
    global: { modifier: 'global', text: '国际' },
    domestic: { modifier: 'domestic', text: '国内' },
    offline: { modifier: 'offline', text: '断开' },
};

export function StatusCapsule() {
    const networkStatus = useNetworkStatusState();
    const systemStatus = useSystemStatusState();

    const networkView = NETWORK_STATUS_VIEWS[networkStatus];
    const cpuText = systemStatus ? `${Math.round(systemStatus.cpuPercent)}%` : '--';
    const memoryText = systemStatus
        ? `${((systemStatus.memTotalMB - systemStatus.memAvailableMB) / MEBIBYTES_PER_GIBIBYTE).toFixed(1)}/${(systemStatus.memTotalMB / MEBIBYTES_PER_GIBIBYTE).toFixed(1)} GiB`
        : '--';

    return (
        <div
            className="status-capsule glass-surface"
            aria-live="polite"
            aria-label="网络与系统状态"
        >
            <span className={`status-capsule__dot status-capsule__dot--${networkView.modifier}`} />
            <span>{networkView.text}</span>
            <span className="status-capsule__separator" aria-hidden="true" />
            <span className="status-capsule__metric status-capsule__metric--cpu">
                <span className="status-capsule__label">CPU</span>
                <span className="status-capsule__value">{cpuText}</span>
            </span>
            <span className="status-capsule__separator" aria-hidden="true" />
            <span className="status-capsule__metric status-capsule__metric--memory">
                <span className="status-capsule__label">内存</span>
                <span className="status-capsule__value">{memoryText}</span>
            </span>
        </div>
    );
}
