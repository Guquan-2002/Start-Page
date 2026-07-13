import { useEffect, useState } from 'react';

import { CONFIG, NETWORK_ENDPOINTS } from '../config.js';
import { abortActiveRequests, fetchWithTimeout } from './service-utils.js';

export function useNetworkStatus() {
    const [networkEngine, setNetworkEngine] = useState(null);

    useEffect(() => {
        let disposed = false;
        let intervalId = null;
        const activeControllers = new Set();

        const checkConnectivity = async (url) => {
            try {
                await fetchWithTimeout(url, {
                    activeControllers,
                    timeoutMs: CONFIG.NETWORK_TIMEOUT,
                    requestInit: {
                        method: 'HEAD',
                        mode: 'no-cors'
                    }
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

        const bootstrap = async () => {
            await runNetworkCheck();
            if (!disposed) {
                intervalId = window.setInterval(() => {
                    void runNetworkCheck();
                }, CONFIG.NETWORK_CHECK_INTERVAL);
            }
        };

        void bootstrap();

        return () => {
            disposed = true;
            if (intervalId !== null) {
                window.clearInterval(intervalId);
            }
            abortActiveRequests(activeControllers);
        };
    }, []);

    return {
        isGoogleAvailable: networkEngine === null ? null : networkEngine === 'google',
        networkEngine
    };
}
