import { PageTheme } from './components/PageTheme.jsx';
import { Clock } from './components/Clock.jsx';
import { SearchEngine } from './components/SearchEngine.jsx';
import { NetworkConnectivity } from './components/NetworkConnectivity.jsx';
import { SystemStatus } from './components/SystemStatus.jsx';
import { Weather } from './components/Weather.jsx';
import { useNetworkConnectivity } from './hooks/useNetworkConnectivity.js';
import './Dashboard.css';

export function Dashboard() {
    const networkConnectivity = useNetworkConnectivity();

    return (
        <>
            <PageTheme />

            <main className="dashboard">
                <Clock />
                <Weather networkConnectivity={networkConnectivity} />
                <SearchEngine networkConnectivity={networkConnectivity} />
                <NetworkConnectivity networkConnectivity={networkConnectivity} />
                <SystemStatus />
            </main>
        </>
    );
}
