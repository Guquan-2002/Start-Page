import { splitAssistantMessageByMarker } from '../core/message-model.js';
import { ASSISTANT_SEGMENT_MARKER, ASSISTANT_SENTENCE_MARKER } from '../constants.js';

const ANTHROPIC_API_VERSION = '2023-06-01';
const DEFAULT_MAX_TOKENS = 4096;
const MIN_THINKING_BUDGET_TOKENS = 1024;

function shouldRetryStatus(statusCode) {
    return statusCode === 408 || statusCode === 429 || statusCode >= 500;
}

function normalizeApiUrl(apiUrl) {
    const trimmed = typeof apiUrl === 'string' ? apiUrl.trim().replace(/\/+$/, '') : '';
    return trimmed || null;
}

function parseAnthropicText(responseData) {
    const blocks = Array.isArray(responseData?.content) ? responseData.content : [];
    return blocks
        .map((block) => (
            block?.type === 'text' && typeof block?.text === 'string'
                ? block.text
                : ''
        ))
        .filter(Boolean)
        .join('');
}

function parseAnthropicStreamDelta(responseData) {
    if (responseData?.type !== 'content_block_delta') {
        return '';
    }

    if (responseData?.delta?.type !== 'text_delta') {
        return '';
    }

    return typeof responseData?.delta?.text === 'string'
        ? responseData.delta.text
        : '';
}

function normalizeThinkingBudget(rawValue) {
    const parsed = Number.parseInt(rawValue, 10);
    if (!Number.isFinite(parsed) || parsed < MIN_THINKING_BUDGET_TOKENS) {
        return null;
    }

    return parsed;
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

function asAnthropicMessage(message) {
    return {
        role: message.role === 'assistant' ? 'assistant' : 'user',
        content: message.content
    };
}

function injectSystemInstructionIntoMessages(messages, systemInstruction) {
    if (!systemInstruction) {
        return messages;
    }

    const systemEnvelope = `<system>\n${systemInstruction}\n</system>`;
    if (messages.length === 0) {
        return [{
            role: 'user',
            content: systemEnvelope
        }];
    }

    const firstMessage = messages[0];
    if (firstMessage.role === 'user') {
        return [{
            ...firstMessage,
            content: `${systemEnvelope}\n\n${firstMessage.content}`
        }, ...messages.slice(1)];
    }

    return [{
        role: 'user',
        content: systemEnvelope
    }, ...messages];
}

function resolveMaxTokens(config, thinkingBudget) {
    if (thinkingBudget) {
        return Math.max(DEFAULT_MAX_TOKENS, thinkingBudget + 1024);
    }

    const parsed = Number.parseInt(config?.maxTokens, 10);
    if (Number.isFinite(parsed) && parsed > 0) {
        return parsed;
    }

    return DEFAULT_MAX_TOKENS;
}

function buildAnthropicRequestBody(contextMessages, config, {
    enableMarkerSplit = false,
    stream = false
} = {}) {
    const thinkingBudget = normalizeThinkingBudget(config?.thinkingBudget);
    const systemInstruction = buildSystemInstruction(config, enableMarkerSplit);
    const baseMessages = contextMessages.map(asAnthropicMessage);
    const messages = injectSystemInstructionIntoMessages(baseMessages, systemInstruction);

    const body = {
        model: config.model,
        max_tokens: resolveMaxTokens(config, thinkingBudget),
        stream,
        messages
    };

    if (thinkingBudget) {
        body.thinking = {
            type: 'enabled',
            budget_tokens: thinkingBudget
        };
    }

    if (config?.searchMode === 'anthropic_web_search') {
        body.tools = [{
            type: 'web_search_20250305',
            name: 'web_search'
        }];
    }

    return body;
}

async function readErrorDetails(response) {
    try {
        const errorPayload = await response.json();
        if (typeof errorPayload?.error?.message === 'string' && errorPayload.error.message) {
            return errorPayload.error.message;
        }

        return JSON.stringify(errorPayload);
    } catch {
        try {
            return await response.text();
        } catch {
            return 'Unknown Anthropic API error';
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
        throw new Error('Anthropic stream response body is empty.');
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
                if (!rawData) {
                    continue;
                }

                try {
                    yield JSON.parse(rawData);
                } catch {
                    // Ignore malformed payload.
                }
            }
        }
    } finally {
        reader.releaseLock?.();
    }
}

function buildApiKeys(config) {
    return [config.apiKey, config.backupApiKey]
        .map((key) => (typeof key === 'string' ? key.trim() : ''))
        .filter(Boolean);
}

function buildHeaders(apiKey) {
    return {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': ANTHROPIC_API_VERSION
    };
}

export function createAnthropicProvider({
    fetchImpl = globalThis.fetch?.bind(globalThis),
    maxRetries = 3,
    maxRetryDelayMs = 8000
} = {}) {
    if (typeof fetchImpl !== 'function') {
        throw new Error('fetch implementation is required for Anthropic provider.');
    }

    return {
        id: 'anthropic',
        async generate({ config, contextMessages, signal, onRetryNotice, onFallbackKey }) {
            const baseUrl = normalizeApiUrl(config?.apiUrl);
            if (!baseUrl) {
                throw new Error('Anthropic API URL is required.');
            }

            if (!config?.model) {
                throw new Error('Anthropic model is required.');
            }

            const apiKeys = buildApiKeys(config);
            if (apiKeys.length === 0) {
                throw new Error('At least one API key is required.');
            }

            const endpoint = `${baseUrl}/messages`;
            const enableMarkerSplit = config?.enablePseudoStream === true;
            const requestBody = buildAnthropicRequestBody(contextMessages, config, {
                enableMarkerSplit,
                stream: false
            });
            const hasBackupKey = apiKeys.length > 1;
            let lastError = null;
            let fallbackNoticeShown = false;

            for (let keyIndex = 0; keyIndex < apiKeys.length; keyIndex += 1) {
                try {
                    const response = await fetchWithRetry(fetchImpl, endpoint, {
                        method: 'POST',
                        headers: buildHeaders(apiKeys[keyIndex]),
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
                    const assistantRawText = parseAnthropicText(responseData);

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

            throw lastError || new Error('Anthropic request failed.');
        },

        async *generateStream({ config, contextMessages, signal, onRetryNotice, onFallbackKey }) {
            const baseUrl = normalizeApiUrl(config?.apiUrl);
            if (!baseUrl) {
                throw new Error('Anthropic API URL is required.');
            }

            if (!config?.model) {
                throw new Error('Anthropic model is required.');
            }

            const apiKeys = buildApiKeys(config);
            if (apiKeys.length === 0) {
                throw new Error('At least one API key is required.');
            }

            const endpoint = `${baseUrl}/messages`;
            const enableMarkerSplit = config?.enablePseudoStream === true;
            const requestBody = buildAnthropicRequestBody(contextMessages, config, {
                enableMarkerSplit,
                stream: true
            });
            const hasBackupKey = apiKeys.length > 1;
            let fallbackNoticeShown = false;
            let emittedAnyDelta = false;
            let lastError = null;

            for (let keyIndex = 0; keyIndex < apiKeys.length; keyIndex += 1) {
                try {
                    const response = await fetchWithRetry(fetchImpl, endpoint, {
                        method: 'POST',
                        headers: buildHeaders(apiKeys[keyIndex]),
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
                        const deltaText = parseAnthropicStreamDelta(payload);
                        if (!deltaText) {
                            continue;
                        }

                        emittedAnyDelta = true;
                        yield {
                            type: 'text-delta',
                            text: deltaText
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

            throw lastError || new Error('Anthropic stream request failed.');
        }
    };
}
