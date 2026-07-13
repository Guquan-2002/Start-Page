/**
 * Provider client registry + router.
 *
 * Creates provider clients from PROVIDER_ORDER, avoiding hardcoded lists.
 * Also provides the router that maps config.provider → client.
 */
import { createGeminiProvider } from './vendors/gemini-provider.js';
import {
    createDeepSeekProvider,
    createOpenAiProvider,
    createOpenAiResponsesProvider
} from './vendors/openai-provider.js';
import { createArkProvider } from './vendors/ark-provider.js';
import { createAnthropicProvider } from './vendors/anthropic-provider.js';
import { CHAT_PROVIDER_IDS, PROVIDER_ORDER } from './provider-registry.js';

const PROVIDER_FACTORIES = {
    [CHAT_PROVIDER_IDS.gemini]: createGeminiProvider,
    [CHAT_PROVIDER_IDS.openai]: createOpenAiProvider,
    [CHAT_PROVIDER_IDS.openaiResponses]: createOpenAiResponsesProvider,
    [CHAT_PROVIDER_IDS.deepseek]: createDeepSeekProvider,
    [CHAT_PROVIDER_IDS.arkResponses]: createArkProvider,
    [CHAT_PROVIDER_IDS.anthropic]: createAnthropicProvider
};

export function createRegisteredProviderClients(options = {}) {
    return PROVIDER_ORDER.map((providerId) => {
        const factory = PROVIDER_FACTORIES[providerId];
        if (!factory) {
            throw new Error(`No factory registered for provider "${providerId}".`);
        }
        return factory(options);
    });
}

/**
 * Create a provider router that dispatches generate / generateStream
 * by config.provider ID.
 */
export function createProviderRouter(providers) {
    const providersById = new Map(
        providers.map((provider) => [provider.id, provider])
    );

    function getProvider(config) {
        const provider = providersById.get(config.provider);
        if (!provider) {
            throw new Error(`Unsupported provider "${config.provider}".`);
        }
        return provider;
    }

    return {
        generate(params) {
            return getProvider(params.config).generate(params);
        },

        async *generateStream(params) {
            yield* getProvider(params.config).generateStream(params);
        }
    };
}
