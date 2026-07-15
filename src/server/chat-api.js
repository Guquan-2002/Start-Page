import {
    convertToModelMessages,
    pipeUIMessageStreamToResponse,
    streamText,
    toUIMessageStream
} from 'ai';

import { getProviderDefinition } from '../shared/chat-provider-registry.js';
import {
    getArkMessageMetadata,
    normalizeArkBaseUrl,
    prepareArkConversation
} from './ark-responses.js';
import { createProviderRuntime } from './provider-runtime.js';

const CHAT_API_PATH = '/api/chat';
const MAX_REQUEST_BYTES = 32 * 1024 * 1024;
const REQUEST_TIMEOUT = {
    stepMs: 5 * 60 * 1000,
    chunkMs: 30 * 1000
};

class ChatApiError extends Error {
    constructor(statusCode, message) {
        super(message);
        this.name = 'ChatApiError';
        this.statusCode = statusCode;
    }
}

function getRequestPath(request) {
    return new URL(request.url, 'http://localhost').pathname;
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
        size += chunk.byteLength;
        if (size > MAX_REQUEST_BYTES) {
            throw new ChatApiError(413, 'Request body is too large.');
        }
        chunks.push(chunk);
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
    const baseURL = (rawApiUrl || '').trim().replace(/\/+$/, '');
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

    const provider = (rawConfig.provider || '').trim().toLowerCase();
    const definition = getProviderDefinition(provider);
    if (!definition) {
        throw new ChatApiError(400, `Unsupported provider "${provider || '(empty)'}".`);
    }

    const apiKey = (rawConfig.apiKey || '').trim();
    const model = (rawConfig.model || '').trim();
    if (!apiKey) throw new ChatApiError(400, 'API Key is required.');
    if (!model) throw new ChatApiError(400, 'Model is required.');
    const normalizedApiUrl = normalizeBaseUrl(rawConfig.apiUrl);

    const reasoning = (rawConfig.reasoning || '').trim().toLowerCase();
    if (reasoning && !definition.reasoning.options.includes(reasoning)) {
        throw new ChatApiError(400, `Unsupported reasoning value "${reasoning}" for ${provider}.`);
    }

    return {
        provider,
        apiUrl: provider === 'ark_responses'
            ? normalizeArkBaseUrl(normalizedApiUrl)
            : normalizedApiUrl,
        apiKey,
        model,
        reasoning,
        searchEnabled: rawConfig.searchEnabled === true
            && definition.search.supported !== false,
        systemPrompt: (rawConfig.systemPrompt || '').trim()
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
        const arkConversation = config.provider === 'ark_responses'
            ? prepareArkConversation(body.messages, config)
            : null;
        const runtime = await createProviderRuntime(config, arkConversation);
        const messages = await convertToModelMessages(
            arkConversation?.messages || body.messages,
            {
                tools: runtime.tools
            }
        );
        if (abortSignal.aborted) return true;

        const result = streamText({
            model: runtime.model,
            messages,
            system: runtime.usesArkInstructions
                ? undefined
                : config.systemPrompt || undefined,
            tools: runtime.tools,
            providerOptions: runtime.providerOptions,
            timeout: REQUEST_TIMEOUT,
            abortSignal,
            onError: ({ error }) => {
                console.error('[chat-api]', error.message);
            }
        });

        const uiStream = toUIMessageStream({
            stream: result.stream,
            tools: runtime.tools,
            originalMessages: body.messages,
            sendReasoning: true,
            sendSources: true,
            messageMetadata: ({ part }) => config.provider === 'ark_responses'
                ? getArkMessageMetadata(part, config)
                : undefined,
            onError: (error) => error.message
        });
        pipeUIMessageStreamToResponse({ response, stream: uiStream });
    } catch (error) {
        const statusCode = error instanceof ChatApiError ? error.statusCode : 500;
        const { message } = error;
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
