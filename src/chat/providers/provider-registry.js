const PROVIDER_DATA = [
    {
        id: 'gemini',
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
        id: 'openai',
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
        id: 'openai_responses',
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
        id: 'deepseek',
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
        id: 'ark_responses',
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
        id: 'anthropic',
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
];

const PROVIDER_BY_ID = new Map(PROVIDER_DATA.map((p) => [p.id, p]));

export const CHAT_DEFAULTS = {
    provider: 'gemini',
    systemPrompt: 'You are a helpful assistant.'
};

export function resolveProviderId(value, fallback = CHAT_DEFAULTS.provider) {
    const id = typeof value === 'string' ? value.trim().toLowerCase() : '';
    return PROVIDER_BY_ID.has(id) ? id : fallback;
}

export function getProviderIds() {
    return PROVIDER_DATA.map(({ id }) => id);
}

export function getProviderDefinitions() {
    return PROVIDER_DATA;
}

export function getProviderDefinition(providerId) {
    return PROVIDER_BY_ID.get(providerId) || null;
}

export function getProviderDefaults(providerId) {
    const definition = getProviderDefinition(providerId);
    return {
        ...definition?.defaults,
        reasoning: '',
        searchEnabled: false
    };
}
