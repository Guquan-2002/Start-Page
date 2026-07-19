import { useEffect, useState } from 'react';

const NETWORK_CHECK_INTERVAL = 10 * 1000;
const NETWORK_TIMEOUT = 2 * 1000;
const NETWORK_ENDPOINTS = {
    google: 'https://www.google.com/generate_204',
    bing: 'https://www.bing.com/generate_204'
};

export const STATUS_UI_CONFIGS = {
    checking: { statusClass: '', statusText: '检测中' },
    global: { statusClass: 'global', statusText: '国际' },
    cn: { statusClass: 'cn', statusText: '国内' },
    offline: { statusClass: 'net-fail', statusText: '断开' }
};

async function detectNetworkConnectivity() {
    const [global, cn] = await Promise.all([
        fetch(NETWORK_ENDPOINTS.google, {
            method: 'HEAD',
            mode: 'no-cors',
            signal: AbortSignal.timeout(NETWORK_TIMEOUT)
        }).then(() => true).catch(() => false),
        fetch(NETWORK_ENDPOINTS.bing, {
            method: 'HEAD',
            mode: 'no-cors',
            signal: AbortSignal.timeout(NETWORK_TIMEOUT)
        }).then(() => true).catch(() => false)
    ]);

    if (global) return 'global';
    if (cn) return 'cn';
    return 'offline';
}

export function useNetworkConnectivity() {
    const [networkConnectivity, setNetworkConnectivity] = useState(null);

    useEffect(() => {
        let disposed = false;

        const updateNetworkConnectivity = async () => {
            const status = await detectNetworkConnectivity();
            if (!disposed) setNetworkConnectivity(status);
        };

        const intervalId = window.setInterval(() => {
            void updateNetworkConnectivity();
        }, NETWORK_CHECK_INTERVAL);
        void updateNetworkConnectivity();

        return () => {
            disposed = true;
            window.clearInterval(intervalId);
        };
    }, []);

    return networkConnectivity;
}
