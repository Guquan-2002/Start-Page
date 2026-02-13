export const CHAT_STORAGE_KEY = 'llm_chat_config';
export const CHAT_HISTORY_KEY = 'llm_chat_history_v2';
export const CHAT_DRAFTS_KEY = 'llm_chat_drafts_v1';
export const CHAT_SCHEMA_VERSION = 2;
export const SOURCES_MARKDOWN_MARKER = '\n\n---\n**Sources**\n';
export const ASSISTANT_SEGMENT_MARKER = '<|CHANGE_ROLE|>';
export const ASSISTANT_SENTENCE_MARKER = '<|END_SENTENCE|>';

export const CHAT_PROVIDER_IDS = Object.freeze({
    gemini: 'gemini',
    openai: 'openai',
    anthropic: 'anthropic'
});

export const CHAT_LIMITS = Object.freeze({
    maxContextTokens: 200000,
    maxContextMessages: 120,
    maxRenderedMessages: 1000,
    connectTimeoutMs: 30000,
    maxRetries: 3
});

const COMMON_CHAT_DEFAULTS = Object.freeze({
    systemPrompt: 'You are a helpful assistant.',
    searchMode: '',
    thinkingBudget: null,
    enablePseudoStream: true,
    enableDraftAutosave: true,
    prefixWithTime: false,
    prefixWithName: false,
    userName: 'User'
});

export const GEMINI_DEFAULTS = Object.freeze({
    provider: CHAT_PROVIDER_IDS.gemini,
    apiUrl: 'https://generativelanguage.googleapis.com/v1beta',
    model: 'gemini-2.5-pro',
    ...COMMON_CHAT_DEFAULTS
});

export const OPENAI_DEFAULTS = Object.freeze({
    provider: CHAT_PROVIDER_IDS.openai,
    apiUrl: 'https://api.openai.com/v1',
    model: 'gpt-4o-mini',
    ...COMMON_CHAT_DEFAULTS
});

export const ANTHROPIC_DEFAULTS = Object.freeze({
    provider: CHAT_PROVIDER_IDS.anthropic,
    apiUrl: 'https://api.anthropic.com/v1',
    model: 'claude-sonnet-4-5-20250929',
    ...COMMON_CHAT_DEFAULTS
});

export const CHAT_DEFAULTS = Object.freeze({
    ...GEMINI_DEFAULTS
});

export function getProviderDefaults(providerId) {
    if (providerId === CHAT_PROVIDER_IDS.openai) {
        return OPENAI_DEFAULTS;
    }

    if (providerId === CHAT_PROVIDER_IDS.anthropic) {
        return ANTHROPIC_DEFAULTS;
    }

    return GEMINI_DEFAULTS;
}
