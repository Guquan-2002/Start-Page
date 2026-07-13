import { buildDeepSeekChatCompletionsRequest } from '../adapters/deepseek-chat-completions.js';
import { buildOpenAiChatCompletionsRequest } from '../adapters/openai-chat-completions.js';
import { buildOpenAiResponsesRequest } from '../adapters/openai-responses.js';
import {
    isResponsesReasoningEvent,
    parseResponsesStreamDelta,
    parseResponsesText
} from '../adapters/responses-common.js';
import { CHAT_PROVIDER_IDS } from '../provider-registry.js';
import { CHAT_LIMITS } from '../../constants.js';
import {
    generateStreamWithKeyFallback,
    generateWithKeyFallback,
    prepareProviderRequest
} from './provider-runtime.js';
import { createPingEvent, createReasoningEvent, createTextDeltaEvent } from '../provider-events.js';

function extractChatContentText(content) {
    if (typeof content === 'string') {
        return content;
    }

    if (!Array.isArray(content)) {
        return '';
    }

    return content
        .filter((part) => part?.type === 'text' && typeof part.text === 'string')
        .map((part) => part.text)
        .join('');
}

function parseChatCompletionsText(responseData) {
    const choices = Array.isArray(responseData?.choices) ? responseData.choices : [];
    return choices
        .map((choice) => extractChatContentText(choice?.message?.content))
        .join('');
}

function parseChatCompletionsDelta(responseData) {
    const choices = Array.isArray(responseData?.choices) ? responseData.choices : [];
    return choices
        .map((choice) => extractChatContentText(choice?.delta?.content))
        .join('');
}

function isDeepSeekReasoningEvent(responseData) {
    const choices = Array.isArray(responseData?.choices) ? responseData.choices : [];
    return choices.some((choice) => (
        typeof choice?.delta?.reasoning_content === 'string'
        && choice.delta.reasoning_content.length > 0
    ));
}

export function createOpenAiCompatibleProvider({
    providerId,
    buildRequest,
    responsesApi = false,
    isReasoningEvent = () => false,
    fetchImpl = globalThis.fetch.bind(globalThis),
    maxRetries = 3,
    maxRetryDelayMs = CHAT_LIMITS.maxRetryDelayMs
}) {
    const parseFn = responsesApi ? parseResponsesText : parseChatCompletionsText;

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
                config, localMessageEnvelope, providerId
            );

            return generateWithKeyFallback({
                apiKeys,
                config,
                envelope,
                buildRequest,
                parseResponseText: parseFn,
                fetchImpl,
                httpOptions: { signal, maxRetries, maxRetryDelayMs, onRetryNotice },
                onFallbackKey,
                failureMessage: 'Request failed.'
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
                config, localMessageEnvelope, providerId
            );

            yield* generateStreamWithKeyFallback({
                apiKeys,
                config,
                envelope,
                buildRequest,
                createPayloadProcessor: () => createOpenAiCompatibleStreamProcessor({
                    responsesApi,
                    isReasoningEvent
                }),
                fetchImpl,
                httpOptions: { signal, maxRetries, maxRetryDelayMs, onRetryNotice },
                onFallbackKey,
                onInitialConnect: () => [createPingEvent()]
            });
        }
    };
}

function createOpenAiCompatibleStreamProcessor({
    responsesApi,
    isReasoningEvent
}) {
    return function processPayload(payload) {
        const events = [];

        const reasoning = responsesApi
            ? isResponsesReasoningEvent(payload)
            : isReasoningEvent(payload);
        if (reasoning) {
            events.push(createReasoningEvent());
        }

        const deltaText = responsesApi
            ? parseResponsesStreamDelta(payload)
            : parseChatCompletionsDelta(payload);
        if (deltaText) {
            events.push(createTextDeltaEvent(deltaText));
        } else {
            events.push(createPingEvent());
        }

        return events;
    };
}

export function createOpenAiProvider(options = {}) {
    return createOpenAiCompatibleProvider({
        ...options,
        providerId: CHAT_PROVIDER_IDS.openai,
        buildRequest: buildOpenAiChatCompletionsRequest
    });
}

export function createOpenAiResponsesProvider(options = {}) {
    return createOpenAiCompatibleProvider({
        ...options,
        providerId: CHAT_PROVIDER_IDS.openaiResponses,
        buildRequest: buildOpenAiResponsesRequest,
        responsesApi: true
    });
}

export function createDeepSeekProvider(options = {}) {
    return createOpenAiCompatibleProvider({
        ...options,
        providerId: CHAT_PROVIDER_IDS.deepseek,
        buildRequest: buildDeepSeekChatCompletionsRequest,
        isReasoningEvent: isDeepSeekReasoningEvent
    });
}
