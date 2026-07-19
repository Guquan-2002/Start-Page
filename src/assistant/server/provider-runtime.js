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

async function createOpenAIChatRuntime(providerConfig) {
    const providerOptions = buildProviderOptions(providerConfig);
    const { createOpenAI } = await import('@ai-sdk/openai');
    const sdkProvider = createOpenAI({
        apiKey: providerConfig.apiKey,
        baseURL: providerConfig.apiUrl
    });

    return {
        model: sdkProvider.chat(providerConfig.model),
        providerOptions
    };
}

async function createOpenAIResponsesRuntime(providerConfig) {
    const providerOptions = buildProviderOptions(providerConfig);
    const { createOpenAI } = await import('@ai-sdk/openai');
    const sdkProvider = createOpenAI({
        apiKey: providerConfig.apiKey,
        baseURL: providerConfig.apiUrl
    });

    return {
        model: sdkProvider.responses(providerConfig.model),
        providerOptions,
        tools: providerConfig.searchEnabled
            ? { web_search: sdkProvider.tools.webSearch({}) }
            : undefined,
        usesArkInstructions: false
    };
}

async function createArkResponsesRuntime(providerConfig, arkConversation) {
    const { createOpenAI } = await import('@ai-sdk/openai');
    const sdkProvider = createOpenAI({
        apiKey: providerConfig.apiKey,
        baseURL: providerConfig.apiUrl,
        name: 'ark',
        fetch: createArkFetch({
            providerConfig,
            fallbackInput: arkConversation.fallbackInput
        })
    });

    return {
        model: sdkProvider.responses(providerConfig.model),
        providerOptions: {
            openai: {
                store: true,
                previousResponseId: arkConversation.previousResponseId
            }
        },
        tools: providerConfig.searchEnabled
            ? { web_search: sdkProvider.tools.webSearch({}) }
            : undefined,
        usesArkInstructions: true
    };
}

async function createAnthropicRuntime(providerConfig) {
    const providerOptions = buildProviderOptions(providerConfig);
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

async function createGeminiRuntime(providerConfig) {
    const providerOptions = buildProviderOptions(providerConfig);
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

async function createDeepSeekRuntime(providerConfig) {
    const providerOptions = buildProviderOptions(providerConfig);
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

const PROVIDER_RUNTIME_FACTORIES = new Map([
    ['gemini', createGeminiRuntime],
    ['openai', createOpenAIChatRuntime],
    ['openai_responses', createOpenAIResponsesRuntime],
    ['deepseek', createDeepSeekRuntime],
    ['ark_responses', createArkResponsesRuntime],
    ['anthropic', createAnthropicRuntime]
]);

export async function createProviderRuntime(providerConfig, arkConversation) {
    const runtimeFactory = PROVIDER_RUNTIME_FACTORIES.get(providerConfig.provider);

    if (!runtimeFactory) {
        throw new Error(`未注册的服务商 "${providerConfig.provider}"。`);
    }

    return runtimeFactory(providerConfig, arkConversation);
}
