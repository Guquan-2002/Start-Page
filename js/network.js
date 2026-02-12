import { NETWORK_ENDPOINTS, SEARCH_ENGINES, CONFIG } from './config.js';
import { elements, checkConnectivity } from './utils.js';

let currentEngine = null;

export function setSearchEngine(engine) {
    if (currentEngine === engine) return;
    currentEngine = engine;
    const config = SEARCH_ENGINES[engine];
    elements.networkIndicator.className = config.statusClass;
    elements.networkText.textContent = config.statusText;
    elements.searchForm.action = config.action;
    elements.searchInput.placeholder = config.placeholder;
    elements.searchInput.disabled = (engine === 'offline');
}

export async function runNetworkCheck() {
    const isGoogleAvailable = await checkConnectivity(NETWORK_ENDPOINTS.google, CONFIG.NETWORK_TIMEOUT);

    if (isGoogleAvailable) {
        setSearchEngine('google');
    } else if (await checkConnectivity(NETWORK_ENDPOINTS.bing, CONFIG.NETWORK_TIMEOUT)) {
        setSearchEngine('bing');
    } else {
        setSearchEngine('offline');
    }

    return isGoogleAvailable;
}

export function startNetworkMonitor(interval) {
    setInterval(runNetworkCheck, interval);
}
