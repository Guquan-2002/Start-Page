export const CHAT_PROVIDER_IDS = Object.freeze({
    gemini: 'gemini',
    openai: 'openai',
    openaiResponses: 'openai_responses',
    deepseek: 'deepseek',
    arkResponses: 'ark_responses',
    anthropic: 'anthropic'
});

const PROVIDERS = Object.freeze([
    {
        id: CHAT_PROVIDER_IDS.gemini,
        settingsLabel: 'Gemini',
        defaults: {
            apiUrl: 'https://generativelanguage.googleapis.com/v1beta',
            apiKey: '',
            model: 'gemini-3-pro-preview'
        },
        placeholders: {
            apiUrl: 'https://generativelanguage.googleapis.com/v1beta',
            apiKey: 'AIza...',
            model: 'gemini-3-pro-preview'
        },
        reasoning: {
            options: ['minimal', 'low', 'medium', 'high'],
            note: 'Gemini thinking level; Auto keeps the model default.'
        },
        search: {
            label: 'Web Search (Gemini)',
            note: 'Uses Google Search grounding.'
        }
    },
    {
        id: CHAT_PROVIDER_IDS.openai,
        settingsLabel: 'OpenAI (Chat Completions)',
        defaults: {
            apiUrl: 'https://api.openai.com/v1',
            apiKey: '',
            model: 'gpt-5'
        },
        placeholders: {
            apiUrl: 'https://api.openai.com/v1',
            apiKey: 'sk-...',
            model: 'gpt-5'
        },
        reasoning: {
            options: ['none', 'minimal', 'low', 'medium', 'high', 'xhigh'],
            note: 'OpenAI reasoning effort; none disables it.'
        },
        search: {
            label: 'Web Search (OpenAI Chat Completions)',
            note: 'Use the OpenAI Responses provider for SDK-managed web search.',
            supported: false
        }
    },
    {
        id: CHAT_PROVIDER_IDS.openaiResponses,
        settingsLabel: 'OpenAI (Responses)',
        defaults: {
            apiUrl: 'https://api.openai.com/v1',
            apiKey: '',
            model: 'gpt-5'
        },
        placeholders: {
            apiUrl: 'https://api.openai.com/v1',
            apiKey: 'sk-...',
            model: 'gpt-5'
        },
        reasoning: {
            options: ['none', 'minimal', 'low', 'medium', 'high', 'xhigh'],
            note: 'OpenAI reasoning effort; none disables it.'
        },
        search: {
            label: 'Web Search (OpenAI Responses)',
            note: 'Uses the built-in web search tool.'
        }
    },
    {
        id: CHAT_PROVIDER_IDS.deepseek,
        settingsLabel: 'DeepSeek',
        defaults: {
            apiUrl: 'https://api.deepseek.com',
            apiKey: '',
            model: 'deepseek-chat'
        },
        placeholders: {
            apiUrl: 'https://api.deepseek.com',
            apiKey: 'sk-...',
            model: 'deepseek-chat'
        },
        reasoning: {
            options: ['disabled', 'low', 'medium', 'high', 'xhigh', 'max'],
            note: 'DeepSeek reasoning effort; disabled turns thinking off.'
        },
        search: {
            label: 'Web Search (DeepSeek)',
            note: 'Not supported by the native DeepSeek provider.',
            supported: false
        }
    },
    {
        id: CHAT_PROVIDER_IDS.arkResponses,
        settingsLabel: 'Volcengine Ark (Responses)',
        defaults: {
            apiUrl: 'https://ark.cn-beijing.volces.com/api/v3',
            apiKey: '',
            model: 'doubao-seed-2-0-pro-260215'
        },
        placeholders: {
            apiUrl: 'https://ark.cn-beijing.volces.com/api/v3',
            apiKey: 'ark-...',
            model: 'doubao-seed-2-0-pro-260215'
        },
        reasoning: {
            options: ['none', 'minimal', 'low', 'medium', 'high'],
            note: 'Ark reasoning effort; none disables it.'
        },
        search: {
            label: 'Web Search (Ark)',
            note: 'Uses the Responses-compatible web search tool.'
        }
    },
    {
        id: CHAT_PROVIDER_IDS.anthropic,
        settingsLabel: 'Anthropic',
        defaults: {
            apiUrl: 'https://api.anthropic.com/v1',
            apiKey: '',
            model: 'claude-sonnet-4-6'
        },
        placeholders: {
            apiUrl: 'https://api.anthropic.com/v1',
            apiKey: 'sk-ant-...',
            model: 'claude-sonnet-4-6'
        },
        reasoning: {
            options: ['none', 'low', 'medium', 'high', 'xhigh', 'max'],
            note: 'Anthropic adaptive thinking effort; none disables it.'
        },
        search: {
            label: 'Web Search (Anthropic)',
            note: 'Uses Anthropic web search.'
        }
    }
].map((provider) => Object.freeze(provider)));

const PROVIDER_BY_ID = new Map(PROVIDERS.map((provider) => [provider.id, provider]));

export const CHAT_DEFAULTS = Object.freeze({
    provider: CHAT_PROVIDER_IDS.gemini,
    systemPrompt: 'You are a helpful assistant.'
});

export function resolveProviderId(value, fallback = CHAT_DEFAULTS.provider) {
    const providerId = typeof value === 'string' ? value.trim().toLowerCase() : '';
    return PROVIDER_BY_ID.has(providerId) ? providerId : fallback;
}

export function getProviderIds() {
    return PROVIDERS.map(({ id }) => id);
}

export function getProviderDefinitions() {
    return [...PROVIDERS];
}

export function getProviderDefinition(providerId) {
    return PROVIDER_BY_ID.get(resolveProviderId(providerId)) || null;
}

export function getProviderDefaults(providerId) {
    const definition = getProviderDefinition(providerId);
    return {
        ...definition?.defaults,
        reasoning: '',
        searchEnabled: false
    };
}
