/**
 * Request diagnostics formatter.
 *
 * Produces human-readable error detail strings used by assistant-response
 * when a provider request fails.  Isolated to keep the 300+ line
 * assistant-response.js focused on orchestration.
 *
 * Dependency on provider-registry for resolveProviderEndpoint is deliberate
 * and contained here — the *only* app-layer consumer that needs endpoint
 * resolution for error reporting.
 */
import { resolveProviderEndpoint } from '../providers/provider-registry.js';

/**
 * Build a diagnostic detail string for request failures.
 *
 * @param {Object} config - Provider configuration
 * @param {Object} [options]
 * @param {string} [options.endpoint] - Override endpoint (avoids registry call)
 * @param {boolean} [options.useStreaming=false] - Streaming mode
 * @param {number} [options.timeoutMs] - Connection timeout
 * @param {string} [options.errorDetail] - Error message
 * @returns {string} Pipe-delimited diagnostic string
 */
export function buildRequestDiagnosticDetail(config, {
    endpoint = '',
    useStreaming = false,
    timeoutMs,
    errorDetail = ''
} = {}) {
    const details = [
        `Provider=${config.provider}`,
        `Endpoint=${endpoint || resolveProviderEndpoint(config, useStreaming)}`,
        `Search=${config.searchEnabled ? 'enabled' : 'disabled'}`,
        `Streaming=${useStreaming ? 'true' : 'false'}`,
        `TimeoutMs=${timeoutMs}`
    ];

    if (errorDetail) {
        details.push(`Error=${errorDetail}`);
    }

    return details.join(' | ');
}
