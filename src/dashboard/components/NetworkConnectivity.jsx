import './NetworkConnectivity.css';

const STATUS_UI_CONFIGS = {
    checking: { statusClass: '', statusText: '检测中' },
    global: { statusClass: 'network-indicator--global', statusText: '国际' },
    cn: { statusClass: 'network-indicator--domestic', statusText: '国内' },
    offline: { statusClass: 'network-indicator--offline', statusText: '断开' }
};

export function NetworkConnectivity({ networkConnectivity }) {
    const statusUi = STATUS_UI_CONFIGS[networkConnectivity ?? 'checking'];

    return (
        <div id="network-status" aria-live="polite" aria-label="Network status">
            <span id="network-indicator" className={statusUi.statusClass} />
            <span id="network-text">{statusUi.statusText}</span>
        </div>
    );
}
