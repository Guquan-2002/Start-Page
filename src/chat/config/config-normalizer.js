/**
 * Config schema & normalization — pure functions with zero DOM/storage deps.
 *
 * Shared by the React configuration hook and provider request flow so stored
 * settings always enter the application in one canonical shape.
 */
import { CHAT_DEFAULTS } from '../providers/provider-registry.js';
import {
    getProviderDefinition,
    getProviderDefaults,
    getProviderIds,
    resolveProviderId
} from '../providers/provider-registry.js';
import { asTrimmedString } from '../../shared/string-utils.js';

const SUPPORTED_PROVIDER_IDS = getProviderIds();

/**
 * Coerce a value to boolean with a fallback.
 * @param {*} value
 * @param {boolean} fallback
 * @returns {boolean}
 */
function readBoolean(value, fallback) {
    return typeof value === 'boolean' ? value : fallback;
}

/**
 * Normalize a reasoning field value for a given provider.
 * @param {string} provider
 * @param {*} rawValue
 * @returns {string|null}
 */
function normalizeReasoning(provider, rawValue) {
    const reasoning = getProviderDefinition(provider)?.reasoning;
    if (!reasoning) return '';
    const normalized = asTrimmedString(rawValue).toLowerCase();
    return reasoning.options.includes(normalized) ? normalized : '';
}

/**
 * Normalize a single provider's stored profile.
 * @param {string} provider
 * @param {Object} rawProfile
 * @param {Object} defaults
 * @returns {Object}
 */
function normalizeStoredProfile(provider, rawProfile, defaults) {
    const profile = rawProfile && typeof rawProfile === 'object' ? rawProfile : {};
    const searchSupported = getProviderDefinition(provider)?.search?.supported !== false;
    return {
        apiUrl: asTrimmedString(profile.apiUrl, defaults.apiUrl),
        apiKey: asTrimmedString(profile.apiKey, defaults.apiKey),
        model: asTrimmedString(profile.model, defaults.model),
        searchEnabled: searchSupported
            && readBoolean(profile.searchEnabled, defaults.searchEnabled === true),
        reasoning: normalizeReasoning(provider, profile.reasoning)
    };
}

const DEFAULT_PROFILES = Object.freeze(Object.fromEntries(
    SUPPORTED_PROVIDER_IDS.map((provider) => {
        const defaults = getProviderDefaults(provider);
        return [provider, normalizeStoredProfile(provider, defaults, defaults)];
    })
));

/**
 * Normalize raw stored config into canonical shape.
 * @param {*} raw - Raw config from storage (may be null/malformed)
 * @returns {Object} Normalized config
 */
export function normalizeStoredConfig(raw) {
    if (!raw || typeof raw !== 'object' || !raw.profiles || typeof raw.profiles !== 'object') {
        return {
            provider: CHAT_DEFAULTS.provider,
            profiles: DEFAULT_PROFILES,
            systemPrompt: CHAT_DEFAULTS.systemPrompt
        };
    }

    const profiles = {};
    SUPPORTED_PROVIDER_IDS.forEach((provider) => {
        profiles[provider] = normalizeStoredProfile(
            provider,
            raw.profiles[provider],
            DEFAULT_PROFILES[provider]
        );
    });

    return {
        provider: resolveProviderId(raw.provider, CHAT_DEFAULTS.provider),
        profiles,
        systemPrompt: asTrimmedString(raw.systemPrompt, CHAT_DEFAULTS.systemPrompt)
    };
}
