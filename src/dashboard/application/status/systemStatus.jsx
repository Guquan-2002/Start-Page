import { createContext, useContext, useEffect, useState } from 'react';
import { startPolling } from '../../infrastructure/polling.js';
import { fetchSystemStatus } from '../../infrastructure/statusApi.js';

const SYSTEM_STATUS_POLL_INTERVAL_MS = 10 * 1000;
const SYSTEM_STATUS_TIMEOUT_MS = 5 * 1000;

function useSystemStatus() {
    const [systemStatus, setSystemStatus] = useState(null);

    useEffect(() => startPolling({
        poll: fetchSystemStatus,
        intervalMs: SYSTEM_STATUS_POLL_INTERVAL_MS,
        timeoutMs: SYSTEM_STATUS_TIMEOUT_MS,
        onSuccess: setSystemStatus,
        onError: () => setSystemStatus(null),
    }), []);

    return systemStatus;
}

const SystemStatusContext = createContext(null);

export function SystemStatusProvider({ children }) {
    const systemStatus = useSystemStatus();
    return (
        <SystemStatusContext.Provider value={systemStatus}>
            {children}
        </SystemStatusContext.Provider>
    );
}

export function useSystemStatusState() {
    return useContext(SystemStatusContext);
}
