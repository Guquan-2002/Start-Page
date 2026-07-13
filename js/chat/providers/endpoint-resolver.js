/**
 * Shared endpoint resolver — single source of truth for provider API endpoints.
 *
 * Responsibility:
 * - Build REST endpoint URLs from a pre-normalized baseUrl (no config dep).
 * - Used by both provider-registry (diagnostics) and adapters (actual requests),
 *   eliminating the dual-implementation duplication previously maintained.
 *
 * Note for Gemini: the model parameter is required because Gemini endpoints
 * embed the model name in the path. All other providers append a fixed suffix.
 */

/**
 * Append a path suffix to a base URL, avoiding double-appending when the
 * suffix is already present.
 *
 * @param {string} baseUrl - Pre-normalized base URL
 * @param {string} suffix - Path suffix to append
 * @returns {string} Full endpoint URL
 */
function appendPath(baseUrl, suffix) {
    if (!baseUrl) {
        return '(missing apiUrl)';
    }

    return baseUrl.endsWith(suffix) ? baseUrl : `${baseUrl}${suffix}`;
}

/**
 * Build OpenAI Chat Completions endpoint.
 * @param {string} baseUrl - Pre-normalized base URL
 * @returns {string}
 */
export function resolveOpenAiChatEndpoint(baseUrl) {
    return appendPath(baseUrl, '/chat/completions');
}

/**
 * Build Responses API endpoint (shared by OpenAI Responses and Ark).
 * @param {string} baseUrl - Pre-normalized base URL
 * @returns {string}
 */
export function resolveResponsesEndpoint(baseUrl) {
    return appendPath(baseUrl, '/responses');
}

/**
 * Build Anthropic Messages endpoint.
 * @param {string} baseUrl - Pre-normalized base URL
 * @returns {string}
 */
export function resolveAnthropicEndpoint(baseUrl) {
    return appendPath(baseUrl, '/messages');
}

/**
 * Build Gemini GenerateContent endpoint.
 * The model name is embedded in the URL path.
 *
 * @param {string} baseUrl - Pre-normalized base URL
 * @param {string} model - Model identifier
 * @param {boolean} stream - Whether to build a streaming endpoint
 * @returns {string}
 */
export function resolveGeminiEndpoint(baseUrl, model, stream) {
    if (!baseUrl || !model) {
        return baseUrl || '(missing apiUrl)';
    }

    const suffix = stream
        ? ':streamGenerateContent?alt=sse'
        : ':generateContent';

    return `${baseUrl}/models/${encodeURIComponent(model)}${suffix}`;
}
