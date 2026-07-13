/**
 * Provider stream event contract.
 *
 * Defines the normalized event vocabulary shared between vendor providers
 * (producers) and assistant-response (consumer).  Previously each side
 * used hard-coded string literals, making the implicit contract fragile.
 *
 * Responsibility:
 * - Export event-type constants and factory functions.
 * - Keep the contract single-sourced so adding a new event type is a
 *   single change rather than scattered string updates.
 */

export const PROVIDER_EVENT_TYPES = Object.freeze({
    PING: 'ping',
    REASONING: 'reasoning',
    TEXT_DELTA: 'text-delta'
});

/**
 * Create a keep-alive / non-text event (e.g. web_search SSE events).
 * @returns {{ type: 'ping' }}
 */
export function createPingEvent() {
    return { type: PROVIDER_EVENT_TYPES.PING };
}

/**
 * Create a reasoning-start / reasoning-delta event.
 * @returns {{ type: 'reasoning' }}
 */
export function createReasoningEvent() {
    return { type: PROVIDER_EVENT_TYPES.REASONING };
}

/**
 * Create a text-delta event carrying incremental response text.
 * @param {string} text - The delta text chunk
 * @returns {{ type: 'text-delta', text: string }}
 */
export function createTextDeltaEvent(text) {
    return { type: PROVIDER_EVENT_TYPES.TEXT_DELTA, text };
}
