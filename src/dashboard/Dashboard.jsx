import { useEffect, useState } from 'react';
import { PageTheme } from './components/PageTheme.jsx';
import { Clock } from './components/Clock.jsx';
import { SearchEngine } from './components/SearchEngine.jsx';
import { Weather } from './components/Weather.jsx';
import './Dashboard.css';

const NETWORK_CHECK_INTERVAL = 10 * 1000;

export function Dashboard() {
    const [networkEngine, setNetworkEngine] = useState(null);

    useEffect(() => {
        let disposed = false;

        const updateNetworkEngine = async () => {
            const response = await fetch('/api/network');
            const data = await response.json();
            if (!disposed) setNetworkEngine(data.networkEngine);
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
                <Weather networkEngine={networkEngine} />
                <SearchEngine networkEngine={networkEngine} />
            </main>
        </>
    );
}
