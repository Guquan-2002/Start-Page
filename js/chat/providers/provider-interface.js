/**
 * @typedef {Object} ProviderGenerateParams
 * @property {Object} config
 * @property {Array<{role: string, content?: string, parts?: Array<Object>}>} contextMessages
 * @property {{systemInstruction?: string, messages?: Array<Object>}} [localMessageEnvelope]
 * @property {AbortSignal} signal
 * @property {(attempt: number, maxRetries: number, delayMs: number) => void} [onRetryNotice]
 * @property {() => void} [onFallbackKey]
 */

/**
 * @typedef {{type: 'text-delta', text: string} | {type: 'fallback-key'} | {type: 'done'}} ProviderStreamEvent
 */

/**
 * @typedef {Object} ChatProvider
 * @property {string} id
 * @property {(params: ProviderGenerateParams) => Promise<{segments: string[]}>} generate
 * @property {(params: ProviderGenerateParams) => AsyncGenerator<ProviderStreamEvent, void, void>} [generateStream]
 */

/**
 * @param {ChatProvider} provider
 * @returns {ChatProvider}
 */
export function assertProvider(provider) {
    if (!provider || typeof provider !== 'object') {
        throw new Error('Chat provider must be an object.');
    }

    if (typeof provider.id !== 'string' || !provider.id.trim()) {
        throw new Error('Chat provider must expose a non-empty id.');
    }

    if (typeof provider.generate !== 'function') {
        throw new Error('Chat provider must expose generate(params).');
    }

    if ('generateStream' in provider && typeof provider.generateStream !== 'function') {
        throw new Error('Chat provider generateStream must be a function when provided.');
    }

    return provider;
}
