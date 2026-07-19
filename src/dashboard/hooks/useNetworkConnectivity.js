import { useEffect, useState } from 'react';
import { detectNetworkConnectivity } from '../utils/networkConnectivity.js';

const NETWORK_CHECK_INTERVAL = 10 * 1000;

export function useNetworkConnectivity() {
    const [networkConnectivity, setNetworkConnectivity] = useState(null);

    useEffect(() => {
        const update = async () => {
            setNetworkConnectivity(await detectNetworkConnectivity());
        };

        void update();
        const intervalId = window.setInterval(update, NETWORK_CHECK_INTERVAL);

        return () => window.clearInterval(intervalId);
    }, []);

    return networkConnectivity;
}
