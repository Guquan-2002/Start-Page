import { buildLocalMessageEnvelope } from '../core/local-message.js';
import { CHAT_PROVIDER_IDS } from '../constants.js';
import { buildOpenAiChatCompletionsRequest } from './adapters/openai-chat-completions.js';
import { buildOpenAiResponsesRequest } from './adapters/openai-responses.js';
import { buildAnthropicMessagesRequest } from './adapters/anthropic-messages.js';
import { buildGeminiGenerateContentRequest } from './adapters/gemini-generate-content.js';

const REQUEST_BUILDERS = new Map([
    [CHAT_PROVIDER_IDS.openai, buildOpenAiChatCompletionsRequest],
    [CHAT_PROVIDER_IDS.openaiResponses, buildOpenAiResponsesRequest],
    [CHAT_PROVIDER_IDS.anthropic, buildAnthropicMessagesRequest],
    [CHAT_PROVIDER_IDS.gemini, buildGeminiGenerateContentRequest]
]);

function normalizeProviderId(providerId) {
    return typeof providerId === 'string' ? providerId.trim().toLowerCase() : '';
}

export function buildProviderRequest({
    providerId,
    config,
    envelope,
    stream = false,
    apiKey
}) {
    const normalizedProviderId = normalizeProviderId(providerId || config?.provider);
    const requestBuilder = REQUEST_BUILDERS.get(normalizedProviderId);
    if (!requestBuilder) {
        throw new Error(`Unsupported provider "${providerId}".`);
    }

    const normalizedEnvelope = buildLocalMessageEnvelope(envelope, {
        fallbackSystemInstruction: typeof config?.systemPrompt === 'string' ? config.systemPrompt : ''
    });

    return requestBuilder({
        config,
        envelope: normalizedEnvelope,
        stream: stream === true,
        apiKey
    });
}
