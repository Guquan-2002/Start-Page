export const CHAT_STORAGE_KEY = 'llm_chat_config';
export const CHAT_HISTORY_KEY = 'llm_chat_history';

export const CHAT_LIMITS = Object.freeze({
    maxContextTokens: 200000,
    maxRenderedMessages: 1000,
    connectTimeoutMs: 30000,
    maxRetries: 3
});

export const GEMINI_DEFAULTS = Object.freeze({
    apiUrl: 'https://generativelanguage.googleapis.com/v1beta',
    systemPrompt: 'You are a helpful assistant.',
    searchMode: '',
    thinkingBudget: null
});
