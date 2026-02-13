import { splitAssistantMessageByMarker } from '../core/message-model.js';
import { ASSISTANT_SEGMENT_MARKER, ASSISTANT_SENTENCE_MARKER } from '../constants.js';

function shouldRetryStatus(statusCode) {
    return statusCode === 408 || statusCode === 429 || statusCode >= 500;
}

function normalizeApiUrl(apiUrl) {
    const trimmed = typeof apiUrl === 'string' ? apiUrl.trim().replace(/\/+$/, '') : '';
    return trimmed || null;
}

function parseGeminiText(responseData) {
    const parts = responseData?.candidates?.[0]?.content?.parts;
    if (!Array.isArray(parts)) {
        return '';
    }

    return parts
        .map((part) => (typeof part?.text === 'string' ? part.text : ''))
        .filter(Boolean)
        .join('');
}

function buildMarkerInstruction(enableMarkerSplit) {
    if (!enableMarkerSplit) {
        return '';
    }

    return [
        'Formatting rules:',
        `- When you need role-level segment boundaries, use ${ASSISTANT_SEGMENT_MARKER}.`,
        `- After each completed sentence in normal prose, append ${ASSISTANT_SENTENCE_MARKER}.`,
        '- Do not output marker tokens inside code blocks, tables, URLs, or inline code.'
    ].join('\n');
}

function buildSystemInstruction(config, enableMarkerSplit) {
    const basePrompt = typeof config?.systemPrompt === 'string'
        ? config.systemPrompt.trim()
        : '';
    const markerInstruction = buildMarkerInstruction(enableMarkerSplit);

    if (!basePrompt) {
        return markerInstruction;
    }

    if (!markerInstruction) {
        return basePrompt;
    }

    return `${basePrompt}\n\n${markerInstruction}`;
}

function buildGeminiRequestBody(contextMessages, config, {
    enableMarkerSplit = false
} = {}) {
    const body = {
        contents: contextMessages.map((message) => ({
            role: message.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: message.content }]
        }))
    };

    const systemInstruction = buildSystemInstruction(config, enableMarkerSplit);
    if (systemInstruction) {
        body.systemInstruction = {
            parts: [{ text: systemInstruction }]
        };
    }

    if (config.searchMode === 'gemini_google_search') {
        body.tools = [{ google_search: {} }];
    }

    if (Number.isFinite(config.thinkingBudget) && config.thinkingBudget > 0) {
        body.generationConfig = {
            thinkingConfig: {
                thinkingBudget: config.thinkingBudget
            }
        };
    }

    return body;
}

function buildGeminiEndpoints(baseUrl, model) {
    const encodedModel = encodeURIComponent(model);
    return {
        generate: `${baseUrl}/models/${encodedModel}:generateContent`,
        stream: `${baseUrl}/models/${encodedModel}:streamGenerateContent?alt=sse`
    };
}

async function readErrorDetails(response) {
    try {
        const errorPayload = await response.json();
        if (errorPayload?.error?.message) {
            return errorPayload.error.message;
        }

        return JSON.stringify(errorPayload);
    } catch {
        try {
            return await response.text();
        } catch {
            return 'Unknown Gemini API error';
        }
    }
}

function createAbortError() {
    if (typeof DOMException === 'function') {
        return new DOMException('The operation was aborted.', 'AbortError');
    }

    const error = new Error('The operation was aborted.');
    error.name = 'AbortError';
    return error;
}

function waitForRetryDelay(delayMs, signal) {
    if (!Number.isFinite(delayMs) || delayMs <= 0) {
        return Promise.resolve();
    }

    if (signal?.aborted) {
        return Promise.reject(createAbortError());
    }

    return new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
            if (signal) {
                signal.removeEventListener('abort', onAbort);
            }
            resolve();
        }, delayMs);

        const onAbort = () => {
            clearTimeout(timeoutId);
            if (signal) {
                signal.removeEventListener('abort', onAbort);
            }
            reject(createAbortError());
        };

        if (signal) {
            signal.addEventListener('abort', onAbort, { once: true });
        }
    });
}

async function fetchWithRetry(fetchImpl, url, options, {
    maxRetries,
    maxRetryDelayMs,
    onRetryNotice
}) {
    let lastError = null;

    for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
        try {
            const response = await fetchImpl(url, options);
            if (shouldRetryStatus(response.status) && attempt < maxRetries) {
                const delayMs = Math.min(1000 * (2 ** attempt), maxRetryDelayMs);
                onRetryNotice?.(attempt + 1, maxRetries, delayMs);
                await waitForRetryDelay(delayMs, options?.signal);
                continue;
            }

            return response;
        } catch (error) {
            lastError = error;

            if (error?.name === 'AbortError') {
                throw error;
            }

            if (attempt >= maxRetries) {
                throw error;
            }

            const delayMs = Math.min(1000 * (2 ** attempt), maxRetryDelayMs);
            onRetryNotice?.(attempt + 1, maxRetries, delayMs);
            await waitForRetryDelay(delayMs, options?.signal);
        }
    }

    throw lastError || new Error('Request failed after retries');
}

function extractSseDataPayload(rawEvent) {
    const lines = rawEvent.split(/\r?\n/);
    const dataLines = [];

    for (const line of lines) {
        if (line.startsWith('data:')) {
            dataLines.push(line.slice(5).trimStart());
        }
    }

    if (dataLines.length === 0) {
        return '';
    }

    return dataLines.join('\n');
}

async function* readSseJsonEvents(response, signal) {
    const stream = response?.body;
    if (!stream || typeof stream.getReader !== 'function') {
        throw new Error('Gemini stream response body is empty.');
    }

    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
        while (true) {
            if (signal?.aborted) {
                throw createAbortError();
            }

            const { value, done } = await reader.read();
            if (done) {
                break;
            }

            buffer += decoder.decode(value, { stream: true });

            while (true) {
                const delimiterMatch = /\r?\n\r?\n/.exec(buffer);
                if (!delimiterMatch) {
                    break;
                }

                const rawEvent = buffer.slice(0, delimiterMatch.index);
                buffer = buffer.slice(delimiterMatch.index + delimiterMatch[0].length);

                const rawData = extractSseDataPayload(rawEvent);
                if (!rawData || rawData === '[DONE]') {
                    if (rawData === '[DONE]') {
                        return;
                    }
                    continue;
                }

                try {
                    yield JSON.parse(rawData);
                } catch {
                    // Ignore malformed SSE payloads.
                }
            }
        }

        buffer += decoder.decode();
        const residualData = extractSseDataPayload(buffer.trim());
        if (residualData && residualData !== '[DONE]') {
            try {
                yield JSON.parse(residualData);
            } catch {
                // Ignore malformed residual payload.
            }
        }
    } finally {
        reader.releaseLock?.();
    }
}

function resolveStreamDelta(nextText, assembledText) {
    if (!nextText) {
        return {
            deltaText: '',
            mergedText: assembledText
        };
    }

    if (!assembledText) {
        return {
            deltaText: nextText,
            mergedText: nextText
        };
    }

    if (nextText.startsWith(assembledText)) {
        return {
            deltaText: nextText.slice(assembledText.length),
            mergedText: nextText
        };
    }

    if (assembledText.startsWith(nextText) || assembledText.endsWith(nextText)) {
        return {
            deltaText: '',
            mergedText: assembledText
        };
    }

    return {
        deltaText: nextText,
        mergedText: `${assembledText}${nextText}`
    };
}

function buildApiKeys(config) {
    return [config.apiKey, config.backupApiKey]
        .map((key) => (typeof key === 'string' ? key.trim() : ''))
        .filter(Boolean);
}

export function createGeminiProvider({
    fetchImpl = globalThis.fetch?.bind(globalThis),
    maxRetries = 3,
    maxRetryDelayMs = 8000
} = {}) {
    if (typeof fetchImpl !== 'function') {
        throw new Error('fetch implementation is required for Gemini provider.');
    }

    return {
        id: 'gemini',
        async generate({ config, contextMessages, signal, onRetryNotice, onFallbackKey }) {
            const baseUrl = normalizeApiUrl(config?.apiUrl);
            if (!baseUrl) {
                throw new Error('Gemini API URL is required.');
            }

            if (!config?.model) {
                throw new Error('Gemini model is required.');
            }

            const endpoints = buildGeminiEndpoints(baseUrl, config.model);
            const apiKeys = buildApiKeys(config);

            if (!apiKeys.length) {
                throw new Error('At least one API key is required.');
            }

            const enableMarkerSplit = config?.enablePseudoStream === true;
            const requestBody = buildGeminiRequestBody(contextMessages, config, {
                enableMarkerSplit
            });
            const hasBackupKey = apiKeys.length > 1;
            let lastError = null;
            let fallbackNoticeShown = false;

            for (let keyIndex = 0; keyIndex < apiKeys.length; keyIndex += 1) {
                try {
                    const response = await fetchWithRetry(fetchImpl, endpoints.generate, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'x-goog-api-key': apiKeys[keyIndex]
                        },
                        body: JSON.stringify(requestBody),
                        signal
                    }, {
                        maxRetries,
                        maxRetryDelayMs,
                        onRetryNotice
                    });

                    if (!response.ok) {
                        const details = await readErrorDetails(response);
                        throw new Error(`HTTP ${response.status}: ${details}`);
                    }

                    const responseData = await response.json();
                    const assistantRawText = parseGeminiText(responseData);

                    return {
                        segments: splitAssistantMessageByMarker(assistantRawText, {
                            enableMarkerSplit
                        })
                    };
                } catch (error) {
                    if (error?.name === 'AbortError') {
                        throw error;
                    }

                    lastError = error;
                    if (keyIndex === 0 && hasBackupKey) {
                        if (!fallbackNoticeShown) {
                            onFallbackKey?.();
                            fallbackNoticeShown = true;
                        }
                        continue;
                    }

                    throw error;
                }
            }

            throw lastError || new Error('Gemini request failed.');
        },

        async *generateStream({ config, contextMessages, signal, onRetryNotice, onFallbackKey }) {
            const baseUrl = normalizeApiUrl(config?.apiUrl);
            if (!baseUrl) {
                throw new Error('Gemini API URL is required.');
            }

            if (!config?.model) {
                throw new Error('Gemini model is required.');
            }

            const endpoints = buildGeminiEndpoints(baseUrl, config.model);
            const apiKeys = buildApiKeys(config);

            if (!apiKeys.length) {
                throw new Error('At least one API key is required.');
            }

            const enableMarkerSplit = config?.enablePseudoStream === true;
            const requestBody = buildGeminiRequestBody(contextMessages, config, {
                enableMarkerSplit
            });
            const hasBackupKey = apiKeys.length > 1;
            let fallbackNoticeShown = false;
            let emittedAnyDelta = false;
            let lastError = null;

            for (let keyIndex = 0; keyIndex < apiKeys.length; keyIndex += 1) {
                let assembledText = '';

                try {
                    const response = await fetchWithRetry(fetchImpl, endpoints.stream, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'x-goog-api-key': apiKeys[keyIndex]
                        },
                        body: JSON.stringify(requestBody),
                        signal
                    }, {
                        maxRetries,
                        maxRetryDelayMs,
                        onRetryNotice
                    });

                    if (!response.ok) {
                        const details = await readErrorDetails(response);
                        throw new Error(`HTTP ${response.status}: ${details}`);
                    }

                    for await (const payload of readSseJsonEvents(response, signal)) {
                        const streamText = parseGeminiText(payload);
                        const deltaResult = resolveStreamDelta(streamText, assembledText);
                        assembledText = deltaResult.mergedText;

                        if (!deltaResult.deltaText) {
                            continue;
                        }

                        emittedAnyDelta = true;
                        yield {
                            type: 'text-delta',
                            text: deltaResult.deltaText
                        };
                    }

                    yield { type: 'done' };
                    return;
                } catch (error) {
                    if (error?.name === 'AbortError') {
                        throw error;
                    }

                    lastError = error;
                    const canTryBackup = keyIndex === 0 && hasBackupKey && !emittedAnyDelta;
                    if (canTryBackup) {
                        if (!fallbackNoticeShown) {
                            onFallbackKey?.();
                            fallbackNoticeShown = true;
                            yield { type: 'fallback-key' };
                        }
                        continue;
                    }

                    throw error;
                }
            }

            throw lastError || new Error('Gemini stream request failed.');
        }
    };
}
