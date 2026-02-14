import { splitAssistantMessageByMarker } from '../core/message-model.js';
import {
    ASSISTANT_SEGMENT_MARKER,
    ASSISTANT_SENTENCE_MARKER,
    CHAT_PROVIDER_IDS
} from '../constants.js';

const OPENAI_API_MODES = Object.freeze({
    chatCompletions: 'chat-completions',
    responses: 'responses'
});

function shouldRetryStatus(statusCode) {
    return statusCode === 408 || statusCode === 429 || statusCode >= 500;
}

function normalizeApiUrl(apiUrl) {
    const trimmed = typeof apiUrl === 'string' ? apiUrl.trim().replace(/\/+$/, '') : '';
    return trimmed || null;
}

function extractTextFromContent(content) {
    if (typeof content === 'string') {
        return content;
    }

    if (Array.isArray(content)) {
        return content
            .map((item) => {
                if (typeof item === 'string') {
                    return item;
                }

                if (typeof item?.text === 'string') {
                    return item.text;
                }

                if (typeof item?.content === 'string') {
                    return item.content;
                }

                return '';
            })
            .filter(Boolean)
            .join('');
    }

    return '';
}

function parseOpenAiText(responseData) {
    const choices = Array.isArray(responseData?.choices) ? responseData.choices : [];
    return choices
        .map((choice) => extractTextFromContent(choice?.message?.content))
        .filter(Boolean)
        .join('');
}

function parseOpenAiStreamDelta(responseData) {
    const choices = Array.isArray(responseData?.choices) ? responseData.choices : [];
    return choices
        .map((choice) => extractTextFromContent(choice?.delta?.content))
        .filter(Boolean)
        .join('');
}

function parseOpenAiResponseText(responseData) {
    if (typeof responseData?.output_text === 'string' && responseData.output_text) {
        return responseData.output_text;
    }

    const outputItems = Array.isArray(responseData?.output) ? responseData.output : [];
    return outputItems
        .map((item) => {
            if (typeof item?.text === 'string') {
                return item.text;
            }

            const contentItems = Array.isArray(item?.content) ? item.content : [];
            return contentItems
                .map((contentItem) => {
                    if (typeof contentItem?.text === 'string') {
                        return contentItem.text;
                    }

                    if (typeof contentItem?.content === 'string') {
                        return contentItem.content;
                    }

                    return '';
                })
                .filter(Boolean)
                .join('');
        })
        .filter(Boolean)
        .join('');
}

function parseOpenAiResponseStreamDelta(responseData) {
    if (typeof responseData?.delta === 'string' && responseData.delta) {
        return responseData.delta;
    }

    return '';
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

function buildOpenAiChatCompletionsRequestBody(contextMessages, config, {
    enableMarkerSplit = false,
    stream = false
} = {}) {
    const systemInstruction = buildSystemInstruction(config, enableMarkerSplit);
    const messages = [];

    if (systemInstruction) {
        messages.push({
            role: 'system',
            content: systemInstruction
        });
    }

    contextMessages.forEach((message) => {
        const role = message.role === 'assistant' ? 'assistant' : 'user';
        messages.push({
            role,
            content: message.content
        });
    });

    const body = {
        model: config.model,
        messages,
        stream
    };

    if (typeof config?.thinkingBudget === 'string' && config.thinkingBudget) {
        body.reasoning_effort = config.thinkingBudget;
    }

    if (typeof config?.searchMode === 'string' && config.searchMode.startsWith('openai_web_search_')) {
        const contextSize = config.searchMode.replace('openai_web_search_', '');
        body.web_search_options = {
            search_context_size: contextSize
        };
    }

    return body;
}

function buildOpenAiResponsesRequestBody(contextMessages, config, {
    enableMarkerSplit = false,
    stream = false
} = {}) {
    const systemInstruction = buildSystemInstruction(config, enableMarkerSplit);
    const input = contextMessages.map((message) => ({
        role: message.role === 'assistant' ? 'assistant' : 'user',
        content: message.content
    }));
    const body = {
        model: config.model,
        input,
        stream
    };

    if (systemInstruction) {
        body.instructions = systemInstruction;
    }

    if (typeof config?.thinkingBudget === 'string' && config.thinkingBudget) {
        body.reasoning = {
            effort: config.thinkingBudget
        };
    }

    if (typeof config?.searchMode === 'string' && config.searchMode.startsWith('openai_web_search_')) {
        const contextSize = config.searchMode.replace('openai_web_search_', '');
        body.tools = [{
            type: 'web_search_preview',
            search_context_size: contextSize
        }];
    }

    return body;
}

function isResponsesMode(apiMode) {
    return apiMode === OPENAI_API_MODES.responses;
}

function buildOpenAiEndpoint(baseUrl, apiMode) {
    if (isResponsesMode(apiMode)) {
        return baseUrl.endsWith('/responses') ? baseUrl : `${baseUrl}/responses`;
    }

    return baseUrl.endsWith('/chat/completions') ? baseUrl : `${baseUrl}/chat/completions`;
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
            return 'Unknown OpenAI API error';
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
        throw new Error('OpenAI stream response body is empty.');
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

                if (rawData === '[DONE]') {
                    return;
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

function createOpenAiProviderByMode({
    providerId,
    apiMode,
    fetchImpl = globalThis.fetch?.bind(globalThis),
    maxRetries = 3,
    maxRetryDelayMs = 8000
} = {}) {
    if (typeof fetchImpl !== 'function') {
        throw new Error('fetch implementation is required for OpenAI provider.');
    }

    if (!providerId || typeof providerId !== 'string') {
        throw new Error('OpenAI provider id is required.');
    }

    if (apiMode !== OPENAI_API_MODES.chatCompletions && apiMode !== OPENAI_API_MODES.responses) {
        throw new Error('Unsupported OpenAI API mode.');
    }

    return {
        id: providerId,
        async generate({ config, contextMessages, signal, onRetryNotice, onFallbackKey }) {
            const baseUrl = normalizeApiUrl(config?.apiUrl);
            if (!baseUrl) {
                throw new Error('OpenAI API URL is required.');
            }

            if (!config?.model) {
                throw new Error('OpenAI model is required.');
            }

            const apiKeys = buildApiKeys(config);
            if (apiKeys.length === 0) {
                throw new Error('At least one API key is required.');
            }

            const endpoint = buildOpenAiEndpoint(baseUrl, apiMode);
            const enableMarkerSplit = config?.enablePseudoStream === true;
            const requestBody = isResponsesMode(apiMode)
                ? buildOpenAiResponsesRequestBody(contextMessages, config, {
                    enableMarkerSplit,
                    stream: false
                })
                : buildOpenAiChatCompletionsRequestBody(contextMessages, config, {
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
                        headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${apiKeys[keyIndex]}`
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
                    const assistantRawText = isResponsesMode(apiMode)
                        ? parseOpenAiResponseText(responseData)
                        : parseOpenAiText(responseData);

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

            throw lastError || new Error('OpenAI request failed.');
        },

        async *generateStream({ config, contextMessages, signal, onRetryNotice, onFallbackKey }) {
            const baseUrl = normalizeApiUrl(config?.apiUrl);
            if (!baseUrl) {
                throw new Error('OpenAI API URL is required.');
            }

            if (!config?.model) {
                throw new Error('OpenAI model is required.');
            }

            const apiKeys = buildApiKeys(config);
            if (apiKeys.length === 0) {
                throw new Error('At least one API key is required.');
            }

            const endpoint = buildOpenAiEndpoint(baseUrl, apiMode);
            const enableMarkerSplit = config?.enablePseudoStream === true;
            const requestBody = isResponsesMode(apiMode)
                ? buildOpenAiResponsesRequestBody(contextMessages, config, {
                    enableMarkerSplit,
                    stream: true
                })
                : buildOpenAiChatCompletionsRequestBody(contextMessages, config, {
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
                        headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${apiKeys[keyIndex]}`
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
                        const deltaText = isResponsesMode(apiMode)
                            ? parseOpenAiResponseStreamDelta(payload)
                            : parseOpenAiStreamDelta(payload);
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

            throw lastError || new Error('OpenAI stream request failed.');
        }
    };
}

export function createOpenAiProvider(options = {}) {
    return createOpenAiProviderByMode({
        ...options,
        providerId: CHAT_PROVIDER_IDS.openai,
        apiMode: OPENAI_API_MODES.chatCompletions
    });
}

export function createOpenAiResponsesProvider(options = {}) {
    return createOpenAiProviderByMode({
        ...options,
        providerId: CHAT_PROVIDER_IDS.openaiResponses,
        apiMode: OPENAI_API_MODES.responses
    });
}
