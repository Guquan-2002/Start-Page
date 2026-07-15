const NETWORK_STATUS_API_PATH = '/api/network';
const NETWORK_TIMEOUT = 2000;
const NETWORK_ENDPOINTS = {
    google: 'https://www.google.com/generate_204',
    bing: 'https://www.bing.com/generate_204'
};

function getRequestPath(request) {
    return new URL(request.url, 'http://localhost').pathname;
}

async function checkConnectivity(url) {
    try {
        await fetch(url, {
            method: 'HEAD',
            signal: AbortSignal.timeout(NETWORK_TIMEOUT)
        });
        return true;
    } catch {
        return false;
    }
}

async function detectNetworkEngine() {
    if (await checkConnectivity(NETWORK_ENDPOINTS.google)) return 'google';
    if (await checkConnectivity(NETWORK_ENDPOINTS.bing)) return 'bing';
    return 'offline';
}

export async function handleNetworkStatusApi(request, response, next) {
    if (getRequestPath(request) !== NETWORK_STATUS_API_PATH) {
        next?.();
        return false;
    }

    if (request.method !== 'GET') {
        response.writeHead(405, {
            Allow: 'GET',
            'Content-Type': 'text/plain; charset=utf-8'
        });
        response.end('Method Not Allowed');
        return true;
    }

    const networkEngine = await detectNetworkEngine();
    response.writeHead(200, {
        'Cache-Control': 'no-store',
        'Content-Type': 'application/json; charset=utf-8'
    });
    response.end(JSON.stringify({ networkEngine }));
    return true;
}
