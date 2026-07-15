import { createArkFetch } from './ark-responses.js';

function buildProviderOptions(config) {
    const { provider, reasoning } = config;
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

export async function createProviderRuntime(config, arkConversation) {
    const providerOptions = buildProviderOptions(config);

    if (
        config.provider === 'openai'
        || config.provider === 'openai_responses'
        || config.provider === 'ark_responses'
    ) {
        const { createOpenAI } = await import('@ai-sdk/openai');
        const isArk = config.provider === 'ark_responses';
        const provider = createOpenAI({
            apiKey: config.apiKey,
            baseURL: config.apiUrl,
            name: isArk ? 'ark' : 'openai',
            fetch: isArk
                ? createArkFetch({ config, fallbackInput: arkConversation.fallbackInput })
                : undefined
        });

        if (config.provider === 'openai') {
            return {
                model: provider.chat(config.model),
                providerOptions
            };
        }

        return {
            model: provider.responses(config.model),
            providerOptions: isArk
                ? {
                    openai: {
                        store: true,
                        previousResponseId: arkConversation.previousResponseId
                    }
                }
                : providerOptions,
            tools: config.searchEnabled
                ? { web_search: provider.tools.webSearch({}) }
                : undefined,
            usesArkInstructions: isArk
        };
    }

    if (config.provider === 'anthropic') {
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

    if (config.provider === 'gemini') {
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
        providerOptions
    };
}
