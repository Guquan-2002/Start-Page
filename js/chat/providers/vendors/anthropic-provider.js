import { buildAnthropicMessagesRequest } from '../adapters/anthropic-messages.js';
import { CHAT_PROVIDER_IDS } from '../provider-registry.js';
import { CHAT_LIMITS } from '../../constants.js';
import {
    generateStreamWithKeyFallback,
    generateWithKeyFallback,
    prepareProviderRequest
} from './provider-runtime.js';
import { createReasoningEvent, createTextDeltaEvent } from '../provider-events.js';

function parseAnthropicText(responseData) {
    const blocks = Array.isArray(responseData?.content) ? responseData.content : [];
    return blocks
        .filter((block) => block?.type === 'text' && typeof block.text === 'string')
        .map((block) => block.text)
        .join('');
}

function parseAnthropicStreamDelta(responseData) {
    return responseData?.type === 'content_block_delta'
        && responseData?.delta?.type === 'text_delta'
        && typeof responseData.delta.text === 'string'
        ? responseData.delta.text
        : '';
}

function isAnthropicReasoningEvent(responseData) {
    if (responseData?.type === 'content_block_start') {
        return responseData?.content_block?.type === 'thinking';
    }

    return responseData?.type === 'content_block_delta'
        && (responseData?.delta?.type === 'thinking_delta'
            || responseData?.delta?.type === 'signature_delta');
}

function getAnthropicStreamError(responseData) {
    if (responseData?.type !== 'error') {
        return null;
    }

    return typeof responseData?.error?.message === 'string' && responseData.error.message.trim()
        ? responseData.error.message.trim()
        : `Anthropic stream error: ${JSON.stringify(responseData)}`;
}

export function createAnthropicProvider({
    fetchImpl = globalThis.fetch.bind(globalThis),
    maxRetries = 3,
    maxRetryDelayMs = CHAT_LIMITS.maxRetryDelayMs
} = {}) {
    const providerId = CHAT_PROVIDER_IDS.anthropic;

    return {
        id: providerId,

        async generate({
            config,
            localMessageEnvelope,
            signal,
            onRetryNotice,
            onFallbackKey
        }) {
            const { apiKeys, envelope } = prepareProviderRequest(
                config, localMessageEnvelope, 'Anthropic'
            );

            return generateWithKeyFallback({
                apiKeys,
                config,
                envelope,
                buildRequest: buildAnthropicMessagesRequest,
                parseResponseText: parseAnthropicText,
                fetchImpl,
                httpOptions: { signal, maxRetries, maxRetryDelayMs, onRetryNotice },
                onFallbackKey,
                failureMessage: 'Anthropic request failed.'
            });
        },

        async *generateStream({
            config,
            localMessageEnvelope,
            signal,
            onRetryNotice,
            onFallbackKey
        }) {
            const { apiKeys, envelope } = prepareProviderRequest(
                config, localMessageEnvelope, 'Anthropic'
            );

            yield* generateStreamWithKeyFallback({
                apiKeys,
                config,
                envelope,
                buildRequest: buildAnthropicMessagesRequest,
                createPayloadProcessor: () => createAnthropicStreamProcessor(),
                fetchImpl,
                httpOptions: { signal, maxRetries, maxRetryDelayMs, onRetryNotice },
                onFallbackKey
            });
        }
    };
}

function createAnthropicStreamProcessor() {
    return function processPayload(payload) {
        const streamError = getAnthropicStreamError(payload);
        if (streamError) {
            throw new Error(streamError);
        }

        const events = [];
        if (isAnthropicReasoningEvent(payload)) {
            events.push(createReasoningEvent());
        }

        const deltaText = parseAnthropicStreamDelta(payload);
        if (deltaText) {
            events.push(createTextDeltaEvent(deltaText));
        }

        return events;
    };
}
