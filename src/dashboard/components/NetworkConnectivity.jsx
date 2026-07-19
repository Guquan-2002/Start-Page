import { STATUS_UI_CONFIGS } from '../hooks/useNetworkConnectivity.js';
import './NetworkConnectivity.css';

export function NetworkConnectivity({ networkConnectivity }) {
    const statusUi = STATUS_UI_CONFIGS[networkConnectivity ?? 'checking'];

    return (
        <div id="network-status" aria-live="polite" aria-label="Network status">
            <span id="network-indicator" className={statusUi.statusClass} />
            <span id="network-text">{statusUi.statusText}</span>
        </div>
    );
}
