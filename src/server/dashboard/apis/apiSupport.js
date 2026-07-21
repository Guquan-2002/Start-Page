export function createCachedLoader(load, ttlMs) {
    let cachedValue = null;
    let cacheExpiresAt = 0;
    let pendingLoad = null;

    return function loadCachedValue() {
        if (cachedValue !== null && Date.now() < cacheExpiresAt) {
            return cachedValue;
        }

        if (pendingLoad === null) {
            pendingLoad = load()
                .then((value) => {
                    cachedValue = value;
                    cacheExpiresAt = Date.now() + ttlMs;
                    return value;
                })
                .finally(() => {
                    pendingLoad = null;
                });
        }

        return pendingLoad;
    };
}

export function sendJson(response, statusCode, payload) {
    response.writeHead(statusCode, {
        'Cache-Control': 'no-store',
        'Content-Type': 'application/json; charset=utf-8',
    });
    response.end(JSON.stringify(payload));
}
