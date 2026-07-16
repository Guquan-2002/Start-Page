import {
    convertToModelMessages,
    pipeUIMessageStreamToResponse,
    streamText,
    toUIMessageStream
} from 'ai';

import { getProviderDefinition } from '../../shared/provider-registry.js';
import {
    getArkMessageMetadata,
    normalizeArkBaseUrl,
    prepareArkConversation
} from './ark-responses-adapter.js';
import { createProviderRuntime } from './provider-runtime.js';

const PROVIDER_API_PATH = '/api/provider';
const MAX_REQUEST_BYTES = 32 * 1024 * 1024;
const GENERATION_TIMEOUT = {
    stepMs: 5 * 60 * 1000,
    chunkMs: 30 * 1000
};

class ProviderApiError extends Error {
    constructor(statusCode, message) {
        super(message);
        this.name = 'ProviderApiError';
        this.statusCode = statusCode;
    }
}

function getRequestPath(request) {
    return new URL(request.url, 'http://localhost').pathname;
}

function sendApiError(response, statusCode, message, headers = {}) {
    if (response.destroyed || response.writableEnded) return;

    response.writeHead(statusCode, {
        'Cache-Control': 'no-store',
        'Content-Type': 'text/plain; charset=utf-8',
        ...headers
    });
    response.end(message);
}

async function readRequestBody(request) {
    const contentLength = Number(request.headers['content-length']);
    if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_BYTES) {
        throw new ProviderApiError(413, '请求体过大。');
    }

    const chunks = [];
    let totalBytes = 0;

    for await (const chunk of request) {
        totalBytes += chunk.byteLength;
        if (totalBytes > MAX_REQUEST_BYTES) {
            throw new ProviderApiError(413, '请求体过大。');
        }
        chunks.push(chunk);
    }

    if (chunks.length === 0) {
        throw new ProviderApiError(400, '需要 JSON 请求体。');
    }

    try {
        return JSON.parse(Buffer.concat(chunks).toString('utf8'));
    } catch {
        throw new ProviderApiError(400, '请求体必须是有效的 JSON。');
    }
}

function normalizeBaseUrl(rawApiUrl) {
    const baseURL = (rawApiUrl || '').trim().replace(/\/+$/, '');
    if (!baseURL) {
        throw new ProviderApiError(400, 'API 地址不能为空。');
    }

    let parsed;
    try {
        parsed = new URL(baseURL);
    } catch {
        throw new ProviderApiError(400, 'API 地址必须是绝对 URL。');
    }

    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
        throw new ProviderApiError(400, 'API 地址必须使用 HTTP 或 HTTPS。');
    }

    return baseURL;
}

function normalizeProviderConfig(rawProviderConfig) {
    if (
        !rawProviderConfig
        || typeof rawProviderConfig !== 'object'
        || Array.isArray(rawProviderConfig)
    ) {
        throw new ProviderApiError(400, '服务商配置不能为空。');
    }

    const provider = (rawProviderConfig.provider || '').trim().toLowerCase();
    const providerDefinition = getProviderDefinition(provider);
    if (!providerDefinition) {
        throw new ProviderApiError(400, `不支持的服务商 "${provider || '(空)'}"。`);
    }

    const apiKey = (rawProviderConfig.apiKey || '').trim();
    const model = (rawProviderConfig.model || '').trim();
    if (!apiKey) throw new ProviderApiError(400, 'API 密钥不能为空。');
    if (!model) throw new ProviderApiError(400, '模型不能为空。');
    const normalizedApiUrl = normalizeBaseUrl(rawProviderConfig.apiUrl);

    const reasoning = (rawProviderConfig.reasoning || '').trim().toLowerCase();
    if (reasoning && !providerDefinition.reasoning.options.includes(reasoning)) {
        throw new ProviderApiError(400, `服务商 ${provider} 不支持推理值 "${reasoning}"。`);
    }

    return {
        provider,
        apiUrl: provider === 'ark_responses'
            ? normalizeArkBaseUrl(normalizedApiUrl)
            : normalizedApiUrl,
        apiKey,
        model,
        reasoning,
        searchEnabled: rawProviderConfig.searchEnabled === true
            && providerDefinition.search.supported !== false,
        systemPrompt: (rawProviderConfig.systemPrompt || '').trim()
    };
}

function createDisconnectSignal(request, response) {
    const controller = new AbortController();

    const abort = () => {
        if (!controller.signal.aborted && !response.writableEnded) {
            controller.abort(new Error('客户端已断开。'));
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

export async function handleProviderApi(request, response, next) {
    if (getRequestPath(request) !== PROVIDER_API_PATH) {
        next?.();
        return false;
    }

    if (request.method !== 'POST') {
        sendApiError(response, 405, '方法不允许', { Allow: 'POST' });
        return true;
    }

    try {
        const requestBody = await readRequestBody(request);
        if (!requestBody || typeof requestBody !== 'object' || Array.isArray(requestBody)) {
            throw new ProviderApiError(400, '请求体必须是 JSON 对象。');
        }
        if (!Array.isArray(requestBody.messages) || requestBody.messages.length === 0) {
            throw new ProviderApiError(400, '消息列表不能为空。');
        }

        const providerConfig = normalizeProviderConfig(requestBody.providerConfig);
        const abortSignal = createDisconnectSignal(request, response);
        const arkConversation = providerConfig.provider === 'ark_responses'
            ? prepareArkConversation(requestBody.messages, providerConfig)
            : null;
        const providerRuntime = await createProviderRuntime(providerConfig, arkConversation);
        const modelMessages = await convertToModelMessages(
            arkConversation?.messages || requestBody.messages,
            {
                tools: providerRuntime.tools
            }
        );
        if (abortSignal.aborted) return true;

        const generation = streamText({
            model: providerRuntime.model,
            messages: modelMessages,
            system: providerRuntime.usesArkInstructions
                ? undefined
                : providerConfig.systemPrompt || undefined,
            tools: providerRuntime.tools,
            providerOptions: providerRuntime.providerOptions,
            timeout: GENERATION_TIMEOUT,
            abortSignal,
            onError: ({ error }) => {
                console.error('[provider-api]', error.message);
            }
        });

        const messageStream = toUIMessageStream({
            stream: generation.stream,
            tools: providerRuntime.tools,
            originalMessages: requestBody.messages,
            sendReasoning: true,
            sendSources: true,
            messageMetadata: ({ part }) => providerConfig.provider === 'ark_responses'
                ? getArkMessageMetadata(part, providerConfig)
                : undefined,
            onError: (error) => error.message
        });
        pipeUIMessageStreamToResponse({ response, stream: messageStream });
    } catch (error) {
        const statusCode = error instanceof ProviderApiError ? error.statusCode : 500;
        const { message } = error;
        if (statusCode >= 500) {
            console.error('[provider-api]', message);
        }
        if (!response.headersSent) {
            sendApiError(response, statusCode, message);
        } else if (!response.writableEnded && !response.destroyed) {
            response.end();
        }
    }

    return true;
}
