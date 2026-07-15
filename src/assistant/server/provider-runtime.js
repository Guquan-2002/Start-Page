import { createArkFetch } from './ark-responses-adapter.js';

function buildProviderOptions(providerConfig) {
    const { provider, reasoning } = providerConfig;
    if (!reasoning) return undefined;

    if (provider === 'openai' || provider === 'openai_responses') {
        return {
            openai: {
                reasoningEffort: reasoning
            }
        };
    }

    if (provider === 'deepseek') {
        if (reasoning === 'disabled') {
            return { deepseek: { thinking: { type: 'disabled' } } };
        }
        return {
            deepseek: {
                thinking: { type: 'enabled' },
                reasoningEffort: reasoning
            }
        };
    }

    if (provider === 'anthropic') {
        return {
            anthropic: {
                thinking: { type: 'adaptive', display: 'summarized' },
                effort: reasoning
            }
        };
    }

    if (provider === 'gemini') {
        return {
            google: {
                thinkingConfig: { thinkingLevel: reasoning, includeThoughts: true }
            }
        };
    }

    return undefined;
}

export async function createProviderRuntime(providerConfig, arkConversation) {
    const providerOptions = buildProviderOptions(providerConfig);

    if (
        providerConfig.provider === 'openai'
        || providerConfig.provider === 'openai_responses'
        || providerConfig.provider === 'ark_responses'
    ) {
        const { createOpenAI } = await import('@ai-sdk/openai');
        const usesArkAdapter = providerConfig.provider === 'ark_responses';
        const sdkProvider = createOpenAI({
            apiKey: providerConfig.apiKey,
            baseURL: providerConfig.apiUrl,
            name: usesArkAdapter ? 'ark' : 'openai',
            fetch: usesArkAdapter
                ? createArkFetch({
                    providerConfig,
                    fallbackInput: arkConversation.fallbackInput
                })
                : undefined
        });

        if (providerConfig.provider === 'openai') {
            return {
                model: sdkProvider.chat(providerConfig.model),
                providerOptions
            };
        }

        return {
            model: sdkProvider.responses(providerConfig.model),
            providerOptions: usesArkAdapter
                ? {
                    openai: {
                        store: true,
                        previousResponseId: arkConversation.previousResponseId
                    }
                }
                : providerOptions,
            tools: providerConfig.searchEnabled
                ? { web_search: sdkProvider.tools.webSearch({}) }
                : undefined,
            usesArkInstructions: usesArkAdapter
        };
    }

    if (providerConfig.provider === 'anthropic') {
        const { createAnthropic } = await import('@ai-sdk/anthropic');
        const sdkProvider = createAnthropic({
            apiKey: providerConfig.apiKey,
            baseURL: providerConfig.apiUrl
        });
        return {
            model: sdkProvider(providerConfig.model),
            providerOptions,
            tools: providerConfig.searchEnabled
                ? { web_search: sdkProvider.tools.webSearch_20250305({}) }
                : undefined
        };
    }

    if (providerConfig.provider === 'gemini') {
        const { createGoogle } = await import('@ai-sdk/google');
        const sdkProvider = createGoogle({
            apiKey: providerConfig.apiKey,
            baseURL: providerConfig.apiUrl
        });
        return {
            model: sdkProvider(providerConfig.model),
            providerOptions,
            tools: providerConfig.searchEnabled
                ? { google_search: sdkProvider.tools.googleSearch({}) }
                : undefined
        };
    }

    const { createDeepSeek } = await import('@ai-sdk/deepseek');
    const sdkProvider = createDeepSeek({
        apiKey: providerConfig.apiKey,
        baseURL: providerConfig.apiUrl
    });
    return {
        model: sdkProvider(providerConfig.model),
        providerOptions
    };
}
