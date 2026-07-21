import { createContext, useContext, useEffect, useState } from 'react';
import { startPolling } from '../../infrastructure/polling.js';
import { fetchNetworkConnectivity } from '../../infrastructure/statusApi.js';

const NETWORK_STATUS_POLL_INTERVAL_MS = 10 * 1000;
const NETWORK_STATUS_TIMEOUT_MS = 5 * 1000;
const INITIAL_NETWORK_STATUS = 'checking';

function useNetworkStatus() {
    const [networkStatus, setNetworkStatus] = useState(INITIAL_NETWORK_STATUS);

    useEffect(() => startPolling({
        poll: fetchNetworkConnectivity,
        intervalMs: NETWORK_STATUS_POLL_INTERVAL_MS,
        timeoutMs: NETWORK_STATUS_TIMEOUT_MS,
        onSuccess: setNetworkStatus,
        onError: () => setNetworkStatus('offline'),
    }), []);

    return networkStatus;
}

const NetworkStatusContext = createContext(null);

export function NetworkStatusProvider({ children }) {
    const networkStatus = useNetworkStatus();
    return (
        <NetworkStatusContext.Provider value={networkStatus}>
            {children}
        </NetworkStatusContext.Provider>
    );
}

export function useNetworkStatusState() {
    return useContext(NetworkStatusContext);
}
