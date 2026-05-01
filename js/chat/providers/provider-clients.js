/**
 * Provider client registry.
 *
 * Keeps runtime client factories aligned with provider-registry ordering while
 * avoiding client imports in the pure metadata registry.
 */
import {
    CHAT_PROVIDER_IDS,
    getProviderIds
} from './provider-registry.js';
import { createGeminiProvider } from './vendors/gemini-provider.js';
import {
    createDeepSeekProvider,
    createOpenAiProvider,
    createOpenAiResponsesProvider
} from './vendors/openai-provider.js';
import { createArkProvider } from './vendors/ark-provider.js';
import { createAnthropicProvider } from './vendors/anthropic-provider.js';

const PROVIDER_CLIENT_FACTORIES = new Map([
    [CHAT_PROVIDER_IDS.gemini, createGeminiProvider],
    [CHAT_PROVIDER_IDS.openai, createOpenAiProvider],
    [CHAT_PROVIDER_IDS.openaiResponses, createOpenAiResponsesProvider],
    [CHAT_PROVIDER_IDS.deepseek, createDeepSeekProvider],
    [CHAT_PROVIDER_IDS.arkResponses, createArkProvider],
    [CHAT_PROVIDER_IDS.anthropic, createAnthropicProvider]
]);

export function createRegisteredProviderClients(options = {}) {
    return getProviderIds()
        .map((providerId) => PROVIDER_CLIENT_FACTORIES.get(providerId)?.(options))
        .filter(Boolean);
}
