export async function fetchWithTimeout(url, {
    activeControllers,
    requestInit = {},
    timeoutMs
}) {
    const controller = new AbortController();
    activeControllers.add(controller);
    const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

    try {
        return await globalThis.fetch(url, {
            ...requestInit,
            signal: controller.signal
        });
    } finally {
        window.clearTimeout(timeoutId);
        activeControllers.delete(controller);
    }
}

export function abortActiveRequests(activeControllers) {
    activeControllers.forEach((controller) => controller.abort());
    activeControllers.clear();
}
