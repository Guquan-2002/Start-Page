import { buildGeminiGenerateContentRequest } from '../adapters/gemini-generate-content.js';
import { CHAT_PROVIDER_IDS } from '../provider-registry.js';
import { CHAT_LIMITS } from '../../constants.js';
import {
    generateStreamWithKeyFallback,
    generateWithKeyFallback,
    prepareProviderRequest
} from './provider-runtime.js';
import { createTextDeltaEvent } from '../provider-events.js';

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

function resolveStreamDelta(nextText, assembledText) {
    if (!nextText) {
        return { deltaText: '', mergedText: assembledText };
    }

    if (!assembledText) {
        return { deltaText: nextText, mergedText: nextText };
    }

    if (nextText.startsWith(assembledText)) {
        return {
            deltaText: nextText.slice(assembledText.length),
            mergedText: nextText
        };
    }

    if (assembledText.startsWith(nextText) || assembledText.endsWith(nextText)) {
        return { deltaText: '', mergedText: assembledText };
    }

    return {
        deltaText: nextText,
        mergedText: `${assembledText}${nextText}`
    };
}

export function createGeminiProvider({
    fetchImpl = globalThis.fetch.bind(globalThis),
    maxRetries = 3,
    maxRetryDelayMs = CHAT_LIMITS.maxRetryDelayMs
} = {}) {
    const providerId = CHAT_PROVIDER_IDS.gemini;

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
                config, localMessageEnvelope, 'Gemini'
            );

            return generateWithKeyFallback({
                apiKeys,
                config,
                envelope,
                buildRequest: buildGeminiGenerateContentRequest,
                parseResponseText: parseGeminiText,
                fetchImpl,
                httpOptions: { signal, maxRetries, maxRetryDelayMs, onRetryNotice },
                onFallbackKey,
                failureMessage: 'Gemini request failed.'
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
                config, localMessageEnvelope, 'Gemini'
            );

            yield* generateStreamWithKeyFallback({
                apiKeys,
                config,
                envelope,
                buildRequest: buildGeminiGenerateContentRequest,
                createPayloadProcessor: () => createGeminiStreamProcessor(),
                fetchImpl,
                httpOptions: { signal, maxRetries, maxRetryDelayMs, onRetryNotice },
                onFallbackKey
            });
        }
    };
}

function createGeminiStreamProcessor() {
    let assembledText = '';

    return function processPayload(payload) {
        const streamText = parseGeminiText(payload);
        const deltaResult = resolveStreamDelta(streamText, assembledText);
        assembledText = deltaResult.mergedText;

        if (!deltaResult.deltaText) {
            return [];
        }

        return [createTextDeltaEvent(deltaResult.deltaText)];
    };
}
