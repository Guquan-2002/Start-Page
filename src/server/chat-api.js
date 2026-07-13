import {
    convertToModelMessages,
    pipeUIMessageStreamToResponse,
    streamText,
    toUIMessageStream
} from 'ai';

import {
    CHAT_PROVIDER_IDS as PROVIDERS,
    getProviderDefinition,
    getProviderIds
} from '../chat/providers/provider-registry.js';
import { asTrimmedString } from '../shared/string-utils.js';

const CHAT_API_PATH = '/api/chat';
const MAX_REQUEST_BYTES = 32 * 1024 * 1024;
const MAX_RETRIES = 3;
const REQUEST_TIMEOUT = {
    stepMs: 5 * 60 * 1000,
    chunkMs: 30 * 1000
};

const SUPPORTED_PROVIDERS = new Set(getProviderIds());
const DISABLED_REASONING_VALUES = new Set(['disabled', 'off', 'none']);

class ChatApiError extends Error {
    constructor(statusCode, message) {
        super(message);
        this.name = 'ChatApiError';
        this.statusCode = statusCode;
    }
}

function getRequestPath(request) {
    try {
        return new URL(request.url || '/', 'http://localhost').pathname;
    } catch {
        return '';
    }
}

function sendError(response, statusCode, message, headers = {}) {
    if (response.destroyed || response.writableEnded) return;

    response.writeHead(statusCode, {
        'Cache-Control': 'no-store',
        'Content-Type': 'text/plain; charset=utf-8',
        ...headers
    });
    response.end(message);
}

async function readJsonBody(request) {
    const declaredSize = Number(request.headers['content-length']);
    if (Number.isFinite(declaredSize) && declaredSize > MAX_REQUEST_BYTES) {
        throw new ChatApiError(413, 'Request body is too large.');
    }

    const chunks = [];
    let size = 0;

    for await (const chunk of request) {
        const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        size += buffer.byteLength;
        if (size > MAX_REQUEST_BYTES) {
            throw new ChatApiError(413, 'Request body is too large.');
        }
        chunks.push(buffer);
    }

    if (chunks.length === 0) {
        throw new ChatApiError(400, 'A JSON request body is required.');
    }

    try {
        return JSON.parse(Buffer.concat(chunks).toString('utf8'));
    } catch {
        throw new ChatApiError(400, 'Request body must be valid JSON.');
    }
}

function normalizeBaseUrl(rawApiUrl) {
    const baseURL = asTrimmedString(rawApiUrl).replace(/\/+$/, '');
    if (!baseURL) {
        throw new ChatApiError(400, 'API URL is required.');
    }

    let parsed;
    try {
        parsed = new URL(baseURL);
    } catch {
        throw new ChatApiError(400, 'API URL must be an absolute URL.');
    }

    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
        throw new ChatApiError(400, 'API URL must use HTTP or HTTPS.');
    }

    return baseURL;
}

function normalizeConfig(rawConfig) {
    if (!rawConfig || typeof rawConfig !== 'object' || Array.isArray(rawConfig)) {
        throw new ChatApiError(400, 'Chat config is required.');
    }

    const provider = asTrimmedString(rawConfig.provider).toLowerCase();
    if (!SUPPORTED_PROVIDERS.has(provider)) {
        throw new ChatApiError(400, `Unsupported provider "${provider || '(empty)'}".`);
    }
    const definition = getProviderDefinition(provider);

    const apiKey = asTrimmedString(rawConfig.apiKey);
    const model = asTrimmedString(rawConfig.model);
    if (!apiKey) throw new ChatApiError(400, 'API Key is required.');
    if (!model) throw new ChatApiError(400, 'Model is required.');

    const reasoning = asTrimmedString(rawConfig.reasoning).toLowerCase();
    if (
        reasoning
        && !DISABLED_REASONING_VALUES.has(reasoning)
        && !definition.reasoning.options.includes(reasoning)
    ) {
        throw new ChatApiError(400, `Unsupported reasoning value "${reasoning}" for ${provider}.`);
    }

    return {
        provider,
        apiUrl: normalizeBaseUrl(rawConfig.apiUrl),
        apiKey,
        model,
        reasoning,
        searchEnabled: rawConfig.searchEnabled === true
            && definition.search.supported !== false,
        systemPrompt: asTrimmedString(rawConfig.systemPrompt)
    };
}

function isReasoningDisabled(reasoning) {
    return DISABLED_REASONING_VALUES.has(reasoning);
}

function buildProviderOptions(config) {
    const { provider, reasoning } = config;
    if (!reasoning) return undefined;

    if (provider === PROVIDERS.openai || provider === PROVIDERS.openaiResponses) {
        return {
            openai: {
                reasoningEffort: isReasoningDisabled(reasoning) ? 'none' : reasoning
            }
        };
    }

    if (provider === PROVIDERS.deepseek) {
        if (isReasoningDisabled(reasoning)) {
            return { deepseek: { thinking: { type: 'disabled' } } };
        }
        return {
            deepseek: {
                thinking: { type: 'enabled' },
                reasoningEffort: reasoning
            }
        };
    }

    if (provider === PROVIDERS.anthropic) {
        if (isReasoningDisabled(reasoning)) {
            return { anthropic: { thinking: { type: 'disabled' } } };
        }
        return {
            anthropic: {
                thinking: { type: 'adaptive', display: 'summarized' },
                effort: reasoning
            }
        };
    }

    if (provider === PROVIDERS.gemini) {
        if (isReasoningDisabled(reasoning)) {
            return {
                google: {
                    thinkingConfig: { thinkingBudget: 0, includeThoughts: false }
                }
            };
        }
        return {
            google: {
                thinkingConfig: { thinkingLevel: reasoning, includeThoughts: true }
            }
        };
    }

    return undefined;
}

function makeArkFetch(config) {
    return async (input, init = {}) => {
        if (typeof init.body !== 'string') return fetch(input, init);
        try {
            const body = JSON.parse(init.body);
            if (isReasoningDisabled(config.reasoning)) {
                const { reasoning: _, ...rest } = body;
                return fetch(input, { ...init, body: JSON.stringify({ ...rest, thinking: { type: 'disabled' } }) });
            }
            return fetch(input, { ...init, body: JSON.stringify({ ...body, thinking: { type: 'enabled' }, reasoning: { ...(body.reasoning || {}), effort: config.reasoning } }) });
        } catch {
            return fetch(input, init);
        }
    };
}

async function createProviderRuntime(config) {
    const providerOptions = buildProviderOptions(config);

    if (
        config.provider === PROVIDERS.openai
        || config.provider === PROVIDERS.openaiResponses
        || config.provider === PROVIDERS.arkResponses
    ) {
        const { createOpenAI } = await import('@ai-sdk/openai');
        const isArk = config.provider === PROVIDERS.arkResponses;
        const provider = createOpenAI({
            apiKey: config.apiKey,
            baseURL: config.apiUrl,
            name: isArk ? 'ark' : 'openai',
            fetch: isArk && config.reasoning
                ? makeArkFetch(config)
                : undefined
        });

        if (config.provider === PROVIDERS.openai) {
            return {
                model: provider.chat(config.model),
                providerOptions,
                tools: undefined
            };
        }

        return {
            model: provider.responses(config.model),
            providerOptions: isArk ? undefined : providerOptions,
            tools: config.searchEnabled
                ? { web_search: provider.tools.webSearch({}) }
                : undefined
        };
    }

    if (config.provider === PROVIDERS.anthropic) {
        const { createAnthropic } = await import('@ai-sdk/anthropic');
        const provider = createAnthropic({
            apiKey: config.apiKey,
            baseURL: config.apiUrl
        });
        return {
            model: provider(config.model),
            providerOptions,
            tools: config.searchEnabled
                ? { web_search: provider.tools.webSearch_20250305({}) }
                : undefined
        };
    }

    if (config.provider === PROVIDERS.gemini) {
        const { createGoogle } = await import('@ai-sdk/google');
        const provider = createGoogle({
            apiKey: config.apiKey,
            baseURL: config.apiUrl
        });
        return {
            model: provider(config.model),
            providerOptions,
            tools: config.searchEnabled
                ? { google_search: provider.tools.googleSearch({}) }
                : undefined
        };
    }

    const { createDeepSeek } = await import('@ai-sdk/deepseek');
    const provider = createDeepSeek({
        apiKey: config.apiKey,
        baseURL: config.apiUrl
    });
    return {
        model: provider(config.model),
        providerOptions,
        tools: undefined
    };
}

function createDisconnectSignal(request, response) {
    const controller = new AbortController();

    const abort = () => {
        if (!controller.signal.aborted && !response.writableEnded) {
            controller.abort(new Error('Client disconnected.'));
        }
    };
    const cleanup = () => {
        request.off('aborted', abort);
        response.off('close', handleClose);
        response.off('finish', cleanup);
    };
    const handleClose = () => {
        abort();
        cleanup();
    };

    request.once('aborted', abort);
    response.once('close', handleClose);
    response.once('finish', cleanup);

    if (request.aborted || response.destroyed) {
        handleClose();
    }

    return controller.signal;
}

function getErrorMessage(error) {
    return error instanceof Error && error.message
        ? error.message
        : 'Chat request failed.';
}

/**
 * Shared Node/Connect handler for POST /api/chat.
 * Returns true when the request belongs to this API, otherwise calls next.
 */
export async function handleChatApi(request, response, next) {
    if (getRequestPath(request) !== CHAT_API_PATH) {
        next?.();
        return false;
    }

    if (request.method !== 'POST') {
        sendError(response, 405, 'Method Not Allowed', { Allow: 'POST' });
        return true;
    }

    try {
        const body = await readJsonBody(request);
        if (!body || typeof body !== 'object' || Array.isArray(body)) {
            throw new ChatApiError(400, 'Request body must be a JSON object.');
        }
        if (!Array.isArray(body.messages) || body.messages.length === 0) {
            throw new ChatApiError(400, 'messages must be a non-empty array.');
        }

        const config = normalizeConfig(body.config);
        const abortSignal = createDisconnectSignal(request, response);
        const runtime = await createProviderRuntime(config);
        const messages = await convertToModelMessages(body.messages, {
            tools: runtime.tools,
            ignoreIncompleteToolCalls: true
        });
        if (abortSignal.aborted) return true;

        const result = streamText({
            model: runtime.model,
            messages,
            system: config.systemPrompt || undefined,
            tools: runtime.tools,
            providerOptions: runtime.providerOptions,
            maxRetries: MAX_RETRIES,
            timeout: REQUEST_TIMEOUT,
            abortSignal,
            onError: ({ error }) => {
                console.error('[chat-api]', getErrorMessage(error));
            }
        });

        const uiStream = toUIMessageStream({
            stream: result.stream,
            tools: runtime.tools,
            originalMessages: body.messages,
            sendReasoning: true,
            sendSources: true,
            onError: (error) => getErrorMessage(error)
        });
        pipeUIMessageStreamToResponse({ response, stream: uiStream });
    } catch (error) {
        const statusCode = error instanceof ChatApiError ? error.statusCode : 500;
        const message = getErrorMessage(error);
        if (statusCode >= 500) {
            console.error('[chat-api]', message);
        }
        if (!response.headersSent) {
            sendError(response, statusCode, message);
        } else if (!response.writableEnded && !response.destroyed) {
            response.end();
        }
    }

    return true;
}
