/**
 * API manager diagnostics helpers.
 *
 * Responsibility:
 * - Resolve provider request endpoints for user-facing diagnostics
 * - Build consistent request error details
 * - Resolve context/debug runtime overrides
 * - Print context debug info when enabled
 */
import { buildContextPreview, normalizeMaxContextMessages } from '../../core/context-window.js';
import { resolveProviderEndpoint } from '../../providers/provider-registry.js';

const CONTEXT_DEBUG_STORAGE_KEY = 'llm_chat_context_debug';
const CONTEXT_MAX_MESSAGES_STORAGE_KEY = 'llm_chat_context_max_messages';
const CONTEXT_DEBUG_PREVIEW_CHARS = 80;

function asTrimmedString(value) {
    return typeof value === 'string' ? value.trim() : '';
}

export function resolveRequestEndpoint(config, useStreaming) {
    return resolveProviderEndpoint(config, useStreaming);
}

export function buildRequestDiagnosticDetail(config, {
    endpoint = '',
    useStreaming = false,
    timeoutMs = 30000,
    errorDetail = ''
} = {}) {
    const providerId = asTrimmedString(config?.provider) || '(unknown)';
    const searchState = config?.searchEnabled === true ? 'enabled' : 'disabled';
    const resolvedEndpoint = endpoint || resolveRequestEndpoint(config, useStreaming);
    const details = [
        `Provider=${providerId}`,
        `Endpoint=${resolvedEndpoint}`,
        `Search=${searchState}`,
        `Streaming=${useStreaming ? 'true' : 'false'}`,
        `TimeoutMs=${timeoutMs}`
    ];

    const normalizedError = asTrimmedString(errorDetail);
    if (normalizedError) {
        details.push(`Error=${normalizedError}`);
    }

    return details.join(' | ');
}

function isContextDebugEnabled() {
    if (globalThis.__CHAT_CONTEXT_DEBUG__ === true) {
        return true;
    }

    if (typeof localStorage === 'undefined') {
        return false;
    }

    try {
        return localStorage.getItem(CONTEXT_DEBUG_STORAGE_KEY) === '1';
    } catch {
        return false;
    }
}

export function resolveContextMaxMessages(defaultValue) {
    const globalOverride = normalizeMaxContextMessages(globalThis.__CHAT_CONTEXT_MAX_MESSAGES__);
    if (globalOverride) {
        return globalOverride;
    }

    if (typeof localStorage !== 'undefined') {
        try {
            const localOverride = normalizeMaxContextMessages(localStorage.getItem(CONTEXT_MAX_MESSAGES_STORAGE_KEY));
            if (localOverride) {
                return localOverride;
            }
        } catch {
            // Ignore localStorage read failures.
        }
    }

    return normalizeMaxContextMessages(defaultValue);
}

export function resolveConnectTimeoutMs(defaultTimeoutMs) {
    return Number.isFinite(defaultTimeoutMs) && defaultTimeoutMs > 0
        ? defaultTimeoutMs
        : 30000;
}

export function logContextWindowDebug(contextWindow, config) {
    if (!isContextDebugEnabled()) {
        return;
    }

    const userMessageCount = contextWindow.messages.filter((message) => message.role === 'user').length;
    const assistantMessageCount = contextWindow.messages.length - userMessageCount;

    console.info('[ChatContext]', {
        provider: config.provider,
        model: config.model,
        totalMessages: contextWindow.messages.length,
        userMessages: userMessageCount,
        assistantMessages: assistantMessageCount,
        tokenCount: contextWindow.tokenCount,
        inputBudgetTokens: contextWindow.inputBudgetTokens,
        maxContextMessages: contextWindow.maxContextMessages,
        trimmed: contextWindow.isTrimmed,
        preview: buildContextPreview(contextWindow.messages, CONTEXT_DEBUG_PREVIEW_CHARS)
    });
}
