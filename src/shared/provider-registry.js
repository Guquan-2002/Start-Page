const GEMINI_DEFAULTS = {
    apiUrl: 'https://generativelanguage.googleapis.com/v1beta',
    apiKey: '',
    model: 'gemini-3.5-flash'
};

const GEMINI_REASONING = {
    options: ['minimal', 'low', 'medium', 'high'],
    note: 'Gemini 3.5 Flash thinking level; Auto uses medium.'
};

const OPENAI_DEFAULTS = {
    apiUrl: 'https://api.openai.com/v1',
    apiKey: '',
    model: 'gpt-5.6'
};

const OPENAI_REASONING = {
    options: ['none', 'low', 'medium', 'high', 'xhigh', 'max'],
    note: 'GPT-5.6 reasoning effort; Auto keeps the model default.'
};

const DEEPSEEK_DEFAULTS = {
    apiUrl: 'https://api.deepseek.com',
    apiKey: '',
    model: 'deepseek-v4-pro'
};

const DEEPSEEK_REASONING = {
    options: ['disabled', 'high', 'max'],
    note: 'DeepSeek V4 thinking effort; Auto uses high and disabled turns thinking off.'
};

const ARK_DEFAULTS = {
    apiUrl: 'https://ark.cn-beijing.volces.com/api/v3',
    apiKey: '',
    model: 'doubao-seed-2-1-pro-260628'
};

const ARK_REASONING = {
    options: ['minimal', 'low', 'medium', 'high'],
    note: 'Seed 2.1 reasoning effort; Auto uses high and minimal disables thinking.'
};

const ANTHROPIC_DEFAULTS = {
    apiUrl: 'https://api.anthropic.com/v1',
    apiKey: '',
    model: 'claude-fable-5'
};

const ANTHROPIC_REASONING = {
    options: ['low', 'medium', 'high', 'xhigh', 'max'],
    note: 'Claude Fable 5 effort; thinking is always adaptive and Auto uses high.'
};

export const PROVIDERS = [
    {
        id: 'gemini',
        settingsLabel: 'Gemini',
        defaults: GEMINI_DEFAULTS,
        apiKeyPlaceholder: 'AIza...',
        reasoning: GEMINI_REASONING,
        search: {
            label: 'Web Search (Gemini)',
            note: 'Uses Google Search grounding.'
        }
    },
    {
        id: 'openai',
        settingsLabel: 'OpenAI (Chat Completions)',
        defaults: OPENAI_DEFAULTS,
        apiKeyPlaceholder: 'sk-...',
        reasoning: OPENAI_REASONING,
        search: {
            label: 'Web Search (OpenAI Chat Completions)',
            note: 'Use the OpenAI Responses provider for SDK-managed web search.',
            supported: false
        }
    },
    {
        id: 'openai_responses',
        settingsLabel: 'OpenAI (Responses)',
        defaults: OPENAI_DEFAULTS,
        apiKeyPlaceholder: 'sk-...',
        reasoning: OPENAI_REASONING,
        search: {
            label: 'Web Search (OpenAI Responses)',
            note: 'Uses the built-in web search tool.'
        }
    },
    {
        id: 'deepseek',
        settingsLabel: 'DeepSeek',
        defaults: DEEPSEEK_DEFAULTS,
        apiKeyPlaceholder: 'sk-...',
        reasoning: DEEPSEEK_REASONING,
        search: {
            label: 'Web Search (DeepSeek)',
            note: 'Not supported by the native DeepSeek provider.',
            supported: false
        }
    },
    {
        id: 'ark_responses',
        settingsLabel: 'Volcengine Ark (Responses)',
        defaults: ARK_DEFAULTS,
        apiKeyPlaceholder: 'ark-...',
        reasoning: ARK_REASONING,
        search: {
            label: 'Web Search (Ark)',
            note: 'Uses the Responses-compatible web search tool.'
        }
    },
    {
        id: 'anthropic',
        settingsLabel: 'Anthropic',
        defaults: ANTHROPIC_DEFAULTS,
        apiKeyPlaceholder: 'sk-ant-...',
        reasoning: ANTHROPIC_REASONING,
        search: {
            label: 'Web Search (Anthropic)',
            note: 'Uses Anthropic web search.'
        }
    }
];

const PROVIDER_BY_ID = new Map(PROVIDERS.map((provider) => [provider.id, provider]));

export function getProviderDefinition(providerId) {
    return PROVIDER_BY_ID.get(providerId);
}
