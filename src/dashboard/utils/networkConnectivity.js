const NETWORK_TIMEOUT = 2 * 1000;
const NETWORK_ENDPOINTS = {
    google: 'https://www.google.com/generate_204',
    bing: 'https://www.bing.com/generate_204'
};

async function checkEndpoint(url) {
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

export async function detectNetworkConnectivity() {
    const [global, cn] = await Promise.all([
        checkEndpoint(NETWORK_ENDPOINTS.google),
        checkEndpoint(NETWORK_ENDPOINTS.bing)
    ]);

    if (global) return 'global';
    if (cn) return 'cn';
    return 'offline';
}
