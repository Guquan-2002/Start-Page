import './NetworkConnectivity.css';

const STATUS_UI_CONFIGS = {
    checking: { statusClass: '', statusText: '检测中' },
    global: { statusClass: 'global', statusText: '国际' },
    cn: { statusClass: 'cn', statusText: '国内' },
    offline: { statusClass: 'net-fail', statusText: '断开' }
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
