async function fetchJson(path, signal) {
    const response = await fetch(path, { signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
}

export async function fetchNetworkConnectivity(signal) {
    const { networkConnectivity } = await fetchJson('/api/network', signal);
    return networkConnectivity;
}

export function fetchSystemStatus(signal) {
    return fetchJson('/api/system', signal);
}

export function fetchCurrentWeather(signal) {
    return fetchJson('/api/weather', signal);
}
