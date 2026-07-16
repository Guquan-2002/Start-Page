const GEMINI_DEFAULTS = {
    apiUrl: 'https://generativelanguage.googleapis.com/v1beta',
    apiKey: '',
    model: 'gemini-3.5-flash'
};

const GEMINI_REASONING = {
    options: ['minimal', 'low', 'medium', 'high'],
    note: 'Gemini 3.5 Flash 思考级别；自动使用中等。'
};

const OPENAI_DEFAULTS = {
    apiUrl: 'https://api.openai.com/v1',
    apiKey: '',
    model: 'gpt-5.6'
};

const OPENAI_REASONING = {
    options: ['none', 'low', 'medium', 'high', 'xhigh', 'max'],
    note: 'GPT-5.6 推理力度；自动保持模型默认。'
};

const DEEPSEEK_DEFAULTS = {
    apiUrl: 'https://api.deepseek.com',
    apiKey: '',
    model: 'deepseek-v4-pro'
};

const DEEPSEEK_REASONING = {
    options: ['disabled', 'high', 'max'],
    note: 'DeepSeek V4 思考力度；自动使用高，禁用则关闭思考。'
};

const ARK_DEFAULTS = {
    apiUrl: 'https://ark.cn-beijing.volces.com/api/v3',
    apiKey: '',
    model: 'doubao-seed-2-1-pro-260628'
};

const ARK_REASONING = {
    options: ['minimal', 'low', 'medium', 'high'],
    note: 'Seed 2.1 推理力度；自动使用高，最小则禁用思考。'
};

const ANTHROPIC_DEFAULTS = {
    apiUrl: 'https://api.anthropic.com/v1',
    apiKey: '',
    model: 'claude-fable-5'
};

const ANTHROPIC_REASONING = {
    options: ['low', 'medium', 'high', 'xhigh', 'max'],
    note: 'Claude Fable 5 力度；思考始终自适应，自动使用高。'
};

export const PROVIDERS = [
    {
        id: 'gemini',
        settingsLabel: 'Gemini',
        defaults: GEMINI_DEFAULTS,
        apiKeyPlaceholder: 'AIza...',
        reasoning: GEMINI_REASONING,
        search: {
            label: '网络搜索（Gemini）',
            note: '使用 Google 搜索接地。'
        }
    },
    {
        id: 'openai',
        settingsLabel: 'OpenAI (Chat)',
        defaults: OPENAI_DEFAULTS,
        apiKeyPlaceholder: 'sk-...',
        reasoning: OPENAI_REASONING,
        search: {
            label: '网络搜索（OpenAI Chat）',
            note: '请使用 OpenAI Responses 服务商以使用 SDK 管理的网络搜索。',
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
            label: '网络搜索（OpenAI Responses）',
            note: '使用内置网络搜索工具。'
        }
    },
    {
        id: 'deepseek',
        settingsLabel: 'DeepSeek',
        defaults: DEEPSEEK_DEFAULTS,
        apiKeyPlaceholder: 'sk-...',
        reasoning: DEEPSEEK_REASONING,
        search: {
            label: '网络搜索（DeepSeek）',
            note: '原生 DeepSeek 服务商不支持。',
            supported: false
        }
    },
    {
        id: 'ark_responses',
        settingsLabel: '火山引擎 Ark (Responses)',
        defaults: ARK_DEFAULTS,
        apiKeyPlaceholder: 'ark-...',
        reasoning: ARK_REASONING,
        search: {
            label: '网络搜索（Ark）',
            note: '使用 Responses 兼容的网络搜索工具。'
        }
    },
    {
        id: 'anthropic',
        settingsLabel: 'Anthropic',
        defaults: ANTHROPIC_DEFAULTS,
        apiKeyPlaceholder: 'sk-ant-...',
        reasoning: ANTHROPIC_REASONING,
        search: {
            label: '网络搜索（Anthropic）',
            note: '使用 Anthropic 网络搜索。'
        }
    }
];

const PROVIDER_BY_ID = new Map(PROVIDERS.map((provider) => [provider.id, provider]));

export function getProviderDefinition(providerId) {
    return PROVIDER_BY_ID.get(providerId);
}
