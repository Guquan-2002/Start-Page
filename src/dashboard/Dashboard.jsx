import { useEffect, useState } from 'react';
import { PageTheme } from './components/PageTheme.jsx';
import { Clock } from './components/Clock.jsx';
import { SearchEngine } from './components/SearchEngine.jsx';
import { NetworkStatus } from './components/NetworkStatus.jsx';
import { SystemStatus } from './components/SystemStatus.jsx';
import { Weather } from './components/Weather.jsx';
import './Dashboard.css';

const NETWORK_CHECK_INTERVAL = 10 * 1000;
const NETWORK_TIMEOUT = 2000;
const NETWORK_ENDPOINTS = {
    google: 'https://www.google.com/generate_204',
    bing: 'https://www.bing.com/generate_204'
};

async function checkConnectivity(url) {
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
}

async function detectNetworkEngine() {
    const [googleOk, bingOk] = await Promise.all([
        checkConnectivity(NETWORK_ENDPOINTS.google),
        checkConnectivity(NETWORK_ENDPOINTS.bing)
    ]);

    if (googleOk) return 'google';
    if (bingOk) return 'bing';
    return 'offline';
}

export function Dashboard() {
    const [networkStatus, setNetworkStatus] = useState({ engine: null, checkedAt: 0 });

    useEffect(() => {
        let disposed = false;

        const updateNetworkEngine = async () => {
            const engine = await detectNetworkEngine();
            if (!disposed) setNetworkStatus({ engine, checkedAt: Date.now() });
        };

        const intervalId = window.setInterval(() => {
            void updateNetworkEngine();
        }, NETWORK_CHECK_INTERVAL);
        void updateNetworkEngine();

        return () => {
            disposed = true;
            window.clearInterval(intervalId);
        };
    }, []);

    return (
        <>
            <PageTheme />

            <main className="dashboard">
                <Clock />
                <Weather
                    networkEngine={networkStatus.engine}
                    networkCheckedAt={networkStatus.checkedAt}
                />
                <SearchEngine networkEngine={networkStatus.engine} />
                <NetworkStatus networkEngine={networkStatus.engine} />
                <SystemStatus />
            </main>
        </>
    );
}
