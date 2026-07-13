function shouldRetryStatus(status) {
    return status === 408 || status === 429 || status >= 500;
}

function createAbortError() {
    return new DOMException('The operation was aborted.', 'AbortError');
}

function waitForRetry(delayMs, signal) {
    if (signal?.aborted) {
        return Promise.reject(createAbortError());
    }

    return new Promise((resolve, reject) => {
        let timeoutId;
        const onAbort = () => {
            clearTimeout(timeoutId);
            reject(createAbortError());
        };

        signal?.addEventListener('abort', onAbort, { once: true });
        timeoutId = setTimeout(() => {
            signal?.removeEventListener('abort', onAbort);
            resolve();
        }, delayMs);
    });
}

function getSseData(rawEvent) {
    return rawEvent
        .split(/\r?\n/)
        .filter((line) => line.startsWith('data:'))
        .map((line) => line.slice(5).trimStart())
        .join('\n');
}

export function getApiKeys(config) {
    return [config.apiKey, config.backupApiKey]
        .map((key) => (typeof key === 'string' ? key.trim() : ''))
        .filter(Boolean);
}

export async function readErrorDetail(response) {
    const text = await response.text();
    if (!text) {
        return response.statusText || 'Unknown API error';
    }

    try {
        const payload = JSON.parse(text);
        return typeof payload?.error?.message === 'string' && payload.error.message
            ? payload.error.message
            : JSON.stringify(payload);
    } catch {
        return text;
    }
}

export async function postJsonWithRetry(fetchImpl, request, {
    signal,
    maxRetries,
    maxRetryDelayMs,
    onRetryNotice
}) {
    for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
        let response;

        try {
            response = await fetchImpl(request.endpoint, {
                method: 'POST',
                headers: request.headers,
                body: JSON.stringify(request.body),
                signal
            });
        } catch (error) {
            if (error?.name === 'AbortError' || attempt === maxRetries) {
                throw error;
            }

            const delayMs = Math.min(1000 * (2 ** attempt), maxRetryDelayMs);
            onRetryNotice?.(attempt + 1, maxRetries, delayMs);
            await waitForRetry(delayMs, signal);
            continue;
        }

        if (shouldRetryStatus(response.status) && attempt < maxRetries) {
            const delayMs = Math.min(1000 * (2 ** attempt), maxRetryDelayMs);
            onRetryNotice?.(attempt + 1, maxRetries, delayMs);
            await waitForRetry(delayMs, signal);
            continue;
        }

        if (!response.ok) {
            const error = new Error(`HTTP ${response.status}: ${await readErrorDetail(response)}`);
            error.status = response.status;
            throw error;
        }

        return response;
    }

    throw new Error('Request failed after retries.');
}

export async function* readSseJsonEvents(response, signal) {
    if (!response.body) {
        throw new Error('Stream response body is empty.');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    const parseEvent = (rawEvent) => {
        const data = getSseData(rawEvent);
        if (!data) {
            return null;
        }
        if (data === '[DONE]') {
            return false;
        }
        return JSON.parse(data);
    };

    try {
        while (true) {
            if (signal?.aborted) {
                throw createAbortError();
            }

            const { value, done } = await reader.read();
            if (signal?.aborted) {
                throw createAbortError();
            }
            if (done) {
                break;
            }

            buffer += decoder.decode(value, { stream: true });

            while (true) {
                const delimiter = /\r?\n\r?\n/.exec(buffer);
                if (!delimiter) {
                    break;
                }

                const rawEvent = buffer.slice(0, delimiter.index);
                buffer = buffer.slice(delimiter.index + delimiter[0].length);
                const payload = parseEvent(rawEvent);
                if (payload === false) {
                    return;
                }
                if (payload) {
                    yield payload;
                }
            }
        }

        buffer += decoder.decode();
        if (buffer.trim()) {
            const payload = parseEvent(buffer);
            if (payload && payload !== false) {
                yield payload;
            }
        }
    } finally {
        reader.releaseLock();
    }
}
