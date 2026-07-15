import { useEffect, useState } from 'react';

const NETWORK_CHECK_INTERVAL = 10 * 1000;
const NETWORK_TIMEOUT = 2000;
const NETWORK_ENDPOINTS = {
    google: 'https://www.google.com/generate_204',
    bing: 'https://www.bing.com/generate_204'
};

export function useNetworkStatus() {
    const [networkEngine, setNetworkEngine] = useState(null);

    useEffect(() => {
        let disposed = false;

        const checkConnectivity = async (url) => {
            try {
                await fetch(url, {
                    method: 'HEAD',
                    mode: 'no-cors',
                    signal: AbortSignal.timeout(NETWORK_TIMEOUT)
                });
                return true;
            } catch {
                return false;
            }
        };

        const runNetworkCheck = async () => {
            const googleAvailable = await checkConnectivity(NETWORK_ENDPOINTS.google);
            if (disposed) return;

            if (googleAvailable) {
                setNetworkEngine('google');
                return;
            }

            const bingAvailable = await checkConnectivity(NETWORK_ENDPOINTS.bing);
            if (!disposed) {
                setNetworkEngine(bingAvailable ? 'bing' : 'offline');
            }
        };

        const intervalId = window.setInterval(() => {
            void runNetworkCheck();
        }, NETWORK_CHECK_INTERVAL);
        void runNetworkCheck();

        return () => {
            disposed = true;
            window.clearInterval(intervalId);
        };
    }, []);

    return {
        isGoogleAvailable: networkEngine === null ? null : networkEngine === 'google',
        networkEngine
    };
}
