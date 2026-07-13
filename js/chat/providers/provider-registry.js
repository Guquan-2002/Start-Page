/**
 * Provider registry.
 *
 * Centralizes provider metadata used by config, UI, diagnostics, and request
 * formatting. Runtime clients are created in provider-clients.js to keep this
 * registry free of network/client imports.
 */

import { asTrimmedString, normalizeApiUrl } from '../../shared/string-utils.js';
import {
    resolveAnthropicEndpoint,
    resolveGeminiEndpoint,
    resolveOpenAiChatEndpoint,
    resolveResponsesEndpoint
} from './endpoint-resolver.js';

export const CHAT_PROVIDER_IDS = Object.freeze({
    gemini: 'gemini',
    openai: 'openai',
    openaiResponses: 'openai_responses',
    deepseek: 'deepseek',
    arkResponses: 'ark_responses',
    anthropic: 'anthropic'
});

const DEFAULT_PROVIDER_ID = CHAT_PROVIDER_IDS.gemini;

const COMMON_CHAT_DEFAULTS = Object.freeze({
    systemPrompt: 'You are a helpful assistant.',
    searchEnabled: false,
    enableMarkerSplit: true,
    prefixWithTime: false,
    prefixWithName: false,
    userName: 'User'
});

function buildOpenAiChatEndpoint(config) {
    return resolveOpenAiChatEndpoint(normalizeApiUrl(config?.apiUrl));
}

function buildResponsesEndpoint(config) {
    return resolveResponsesEndpoint(normalizeApiUrl(config?.apiUrl));
}

function buildAnthropicEndpoint(config) {
    return resolveAnthropicEndpoint(normalizeApiUrl(config?.apiUrl));
}

function buildGeminiEndpoint(config, useStreaming) {
    const baseUrl = normalizeApiUrl(config?.apiUrl);
    const model = asTrimmedString(config?.model);
    return resolveGeminiEndpoint(baseUrl, model, useStreaming);
}

const OPENAI_REASONING = Object.freeze({
    field: 'thinkingBudget',
    label: 'Reasoning (optional)',
    options: Object.freeze(['none', 'minimal', 'low', 'medium', 'high', 'xhigh']),
    note: 'OpenAI: none/minimal/low/medium/high/xhigh; choose none to disable.'
});

export const PROVIDER_REGISTRY = Object.freeze({
    [CHAT_PROVIDER_IDS.gemini]: Object.freeze({
        id: CHAT_PROVIDER_IDS.gemini,
        label: 'Gemini',
        settingsLabel: 'Gemini',
        defaults: Object.freeze({
            provider: CHAT_PROVIDER_IDS.gemini,
            apiUrl: 'https://generativelanguage.googleapis.com/v1beta',
            model: 'gemini-3-pro-preview',
            ...COMMON_CHAT_DEFAULTS
        }),
        placeholders: Object.freeze({
            apiUrl: 'https://generativelanguage.googleapis.com/v1beta',
            apiKey: 'AIza...',
            backupApiKey: 'AIza...',
            model: 'gemini-2.5-pro'
        }),
        reasoning: Object.freeze({
            field: 'thinkingLevel',
            label: 'Reasoning (optional)',
            options: Object.freeze(['off', 'low', 'medium', 'high']),
            note: 'Gemini: off/low/medium/high; off disables.'
        }),
        search: Object.freeze({
            label: 'Web Search (Gemini)',
            note: 'Gemini uses Google Search grounding.'
        }),
        resolveEndpoint: buildGeminiEndpoint
    }),
    [CHAT_PROVIDER_IDS.openai]: Object.freeze({
        id: CHAT_PROVIDER_IDS.openai,
        label: 'OpenAI Chat Completions',
        settingsLabel: 'OpenAI (Chat Completions)',
        defaults: Object.freeze({
            provider: CHAT_PROVIDER_IDS.openai,
            apiUrl: 'https://api.openai.com/v1',
            model: 'gpt-5',
            ...COMMON_CHAT_DEFAULTS
        }),
        placeholders: Object.freeze({
            apiUrl: 'https://api.openai.com/v1',
            apiKey: 'sk-...',
            backupApiKey: 'sk-...',
            model: 'gpt-4o-mini'
        }),
        reasoning: OPENAI_REASONING,
        search: Object.freeze({
            label: 'Web Search (OpenAI Completions)',
            note: 'OpenAI Chat Completions uses basic web_search_options.'
        }),
        resolveEndpoint: buildOpenAiChatEndpoint
    }),
    [CHAT_PROVIDER_IDS.openaiResponses]: Object.freeze({
        id: CHAT_PROVIDER_IDS.openaiResponses,
        label: 'OpenAI Responses',
        settingsLabel: 'OpenAI (Responses)',
        defaults: Object.freeze({
            provider: CHAT_PROVIDER_IDS.openaiResponses,
            apiUrl: 'https://api.openai.com/v1',
            model: 'gpt-5',
            ...COMMON_CHAT_DEFAULTS
        }),
        placeholders: Object.freeze({
            apiUrl: 'https://api.openai.com/v1',
            apiKey: 'sk-...',
            backupApiKey: 'sk-...',
            model: 'gpt-4o-mini'
        }),
        reasoning: OPENAI_REASONING,
        search: Object.freeze({
            label: 'Web Search (OpenAI Responses)',
            note: 'OpenAI Responses uses the basic web_search tool.'
        }),
        resolveEndpoint: buildResponsesEndpoint
    }),
    [CHAT_PROVIDER_IDS.deepseek]: Object.freeze({
        id: CHAT_PROVIDER_IDS.deepseek,
        label: 'DeepSeek',
        settingsLabel: 'DeepSeek',
        defaults: Object.freeze({
            provider: CHAT_PROVIDER_IDS.deepseek,
            apiUrl: 'https://api.deepseek.com',
            model: 'deepseek-v4-flash',
            ...COMMON_CHAT_DEFAULTS
        }),
        placeholders: Object.freeze({
            apiUrl: 'https://api.deepseek.com',
            apiKey: 'sk-...',
            backupApiKey: 'sk-...',
            model: 'deepseek-v4-flash'
        }),
        reasoning: Object.freeze({
            field: 'thinkingBudget',
            label: 'Reasoning (optional)',
            options: Object.freeze(['disabled', 'high', 'max']),
            note: 'DeepSeek: disabled/high/max; Auto keeps the model default.'
        }),
        search: Object.freeze({
            label: 'Web Search (DeepSeek)',
            note: 'DeepSeek Chat Completions uses basic web_search_options.'
        }),
        resolveEndpoint: buildOpenAiChatEndpoint
    }),
    [CHAT_PROVIDER_IDS.arkResponses]: Object.freeze({
        id: CHAT_PROVIDER_IDS.arkResponses,
        label: 'Volcengine Ark Responses',
        settingsLabel: 'Volcengine Ark (Responses)',
        defaults: Object.freeze({
            provider: CHAT_PROVIDER_IDS.arkResponses,
            apiUrl: 'https://ark.cn-beijing.volces.com/api/v3/responses',
            model: 'doubao-seed-2-0-pro-260215',
            ...COMMON_CHAT_DEFAULTS
        }),
        placeholders: Object.freeze({
            apiUrl: 'https://ark.cn-beijing.volces.com/api/v3/responses',
            apiKey: 'ark-...',
            backupApiKey: 'ark-...',
            model: 'doubao-seed-2-0-pro-260215'
        }),
        reasoning: Object.freeze({
            field: 'thinkingBudget',
            label: 'Reasoning (optional)',
            options: Object.freeze(['none', 'minimal', 'low', 'medium', 'high']),
            note: 'Ark: minimal/low/medium/high; choose Disabled to turn off.'
        }),
        search: Object.freeze({
            label: 'Web Search (Ark)',
            note: 'Ark uses the built-in web_search tool.'
        }),
        resolveEndpoint: buildResponsesEndpoint
    }),
    [CHAT_PROVIDER_IDS.anthropic]: Object.freeze({
        id: CHAT_PROVIDER_IDS.anthropic,
        label: 'Anthropic',
        settingsLabel: 'Anthropic',
        defaults: Object.freeze({
            provider: CHAT_PROVIDER_IDS.anthropic,
            apiUrl: 'https://api.anthropic.com/v1',
            model: 'claude-sonnet-4-5-20250929',
            ...COMMON_CHAT_DEFAULTS
        }),
        placeholders: Object.freeze({
            apiUrl: 'https://api.anthropic.com/v1',
            apiKey: 'sk-ant-...',
            backupApiKey: 'sk-ant-...',
            model: 'claude-sonnet-4-5-20250929'
        }),
        reasoning: Object.freeze({
            field: 'thinkingEffort',
            label: 'Reasoning (optional)',
            options: Object.freeze(['none', 'low', 'medium', 'high']),
            note: 'Anthropic: none/low/medium/high; none disables adaptive thinking.'
        }),
        search: Object.freeze({
            label: 'Web Search (Anthropic)',
            note: 'Anthropic uses the built-in web_search tool.'
        }),
        resolveEndpoint: buildAnthropicEndpoint
    })
});

export const PROVIDER_ORDER = Object.freeze([
    CHAT_PROVIDER_IDS.gemini,
    CHAT_PROVIDER_IDS.openai,
    CHAT_PROVIDER_IDS.openaiResponses,
    CHAT_PROVIDER_IDS.deepseek,
    CHAT_PROVIDER_IDS.arkResponses,
    CHAT_PROVIDER_IDS.anthropic
]);

export const CHAT_DEFAULTS = PROVIDER_REGISTRY[CHAT_PROVIDER_IDS.gemini].defaults;

export function normalizeProviderId(value) {
    return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

export function isSupportedProviderId(value) {
    return Object.prototype.hasOwnProperty.call(PROVIDER_REGISTRY, normalizeProviderId(value));
}

export function resolveProviderId(value, fallbackProviderId = DEFAULT_PROVIDER_ID) {
    const normalized = normalizeProviderId(value);
    return isSupportedProviderId(normalized) ? normalized : fallbackProviderId;
}

export function getProviderIds() {
    return [...PROVIDER_ORDER];
}

export function getProviderDefinitions() {
    return PROVIDER_ORDER.map((providerId) => PROVIDER_REGISTRY[providerId]);
}

export function getProviderDefinition(providerId) {
    return PROVIDER_REGISTRY[normalizeProviderId(providerId)] || null;
}

export function getProviderDefaults(providerId) {
    const definition = getProviderDefinition(resolveProviderId(providerId));
    return { ...definition.defaults };
}

export function getProviderLabel(providerId) {
    return getProviderDefinition(providerId)?.label || 'provider';
}

export function getProviderPlaceholders(providerId) {
    return getProviderDefinition(resolveProviderId(providerId))?.placeholders || {};
}

export function getProviderThinkingConfig(providerId) {
    return getProviderDefinition(resolveProviderId(providerId))?.reasoning || null;
}

export function getProviderSearchConfig(providerId) {
    return getProviderDefinition(resolveProviderId(providerId))?.search || null;
}

export function resolveProviderEndpoint(config, useStreaming = false) {
    const providerId = normalizeProviderId(config?.provider);
    const definition = getProviderDefinition(providerId);
    if (typeof definition?.resolveEndpoint !== 'function') {
        return normalizeApiUrl(config?.apiUrl) || '(unknown endpoint)';
    }

    return definition.resolveEndpoint(config, useStreaming);
}
