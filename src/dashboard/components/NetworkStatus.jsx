import './NetworkStatus.css';

const STATUS_UI_CONFIGS = {
    checking: {
        statusClass: '',
        statusText: '检测中'
    },
    google: {
        statusClass: 'google-ok',
        statusText: '国际'
    },
    bing: {
        statusClass: 'bing-ok',
        statusText: '国内'
    },
    offline: {
        statusClass: 'net-fail',
        statusText: '断开'
    }
};

export function NetworkStatus({ networkEngine }) {
    const statusUi = STATUS_UI_CONFIGS[networkEngine ?? 'checking'];

    return (
        <div id="network-status" aria-live="polite" aria-label="Network status">
            <span id="network-indicator" className={statusUi.statusClass} />
            <span id="network-text">{statusUi.statusText}</span>
        </div>
    );
}
