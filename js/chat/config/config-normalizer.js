/**
 * Config schema & normalization — pure functions with zero DOM/storage deps.
 *
 * Extracted from config-manager.js so normalization logic can be tested
 * independently and the config-manager stays focused on DOM coordination.
 */
import { CHAT_DEFAULTS } from '../providers/provider-registry.js';
import {
    getProviderDefaults,
    getProviderIds,
    getProviderThinkingConfig,
    resolveProviderId
} from '../providers/provider-registry.js';

const SUPPORTED_PROVIDER_IDS = getProviderIds();

/**
 * Coerce a value to boolean with a fallback.
 * @param {*} value
 * @param {boolean} fallback
 * @returns {boolean}
 */
export function readBoolean(value, fallback) {
    return typeof value === 'boolean' ? value : fallback;
}

/**
 * Coerce a value to trimmed string with a fallback.
 * @param {*} value
 * @param {string} [fallback='']
 * @returns {string}
 */
export function readString(value, fallback = '') {
    return typeof value === 'string' ? value.trim() : fallback;
}

/**
 * Normalize a reasoning field value for a given provider.
 * @param {string} provider
 * @param {*} rawValue
 * @returns {string|null}
 */
export function normalizeReasoningField(provider, rawValue) {
    const reasoning = getProviderThinkingConfig(provider);
    if (!reasoning) return null;
    const normalized = readString(rawValue).toLowerCase();
    return reasoning.options.includes(normalized) ? normalized : null;
}

/**
 * Normalize a single provider's stored profile.
 * @param {string} provider
 * @param {Object} rawProfile
 * @param {Object} defaults
 * @returns {Object}
 */
export function normalizeStoredProfile(provider, rawProfile, defaults) {
    const profile = rawProfile && typeof rawProfile === 'object' ? rawProfile : {};
    const reasoning = getProviderThinkingConfig(provider);
    return {
        apiUrl: readString(profile.apiUrl, defaults.apiUrl),
        apiKey: readString(profile.apiKey, defaults.apiKey),
        backupApiKey: readString(profile.backupApiKey, defaults.backupApiKey),
        model: readString(profile.model, defaults.model),
        searchEnabled: readBoolean(profile.searchEnabled, defaults.searchEnabled === true),
        [reasoning.field]: normalizeReasoningField(provider, profile[reasoning.field])
    };
}

/**
 * Build default profiles for all supported providers.
 * @returns {Object}
 */
export function buildDefaultProfiles() {
    return Object.fromEntries(SUPPORTED_PROVIDER_IDS.map((provider) => {
        const defaults = getProviderDefaults(provider);
        return [provider, normalizeStoredProfile(provider, defaults, defaults)];
    }));
}

/**
 * Normalize raw stored config into canonical shape.
 * @param {*} raw - Raw config from storage (may be null/malformed)
 * @returns {Object} Normalized config
 */
export function normalizeStoredConfig(raw) {
    const defaultProfiles = buildDefaultProfiles();

    if (!raw || typeof raw !== 'object' || !raw.profiles || typeof raw.profiles !== 'object') {
        return {
            provider: CHAT_DEFAULTS.provider,
            profiles: defaultProfiles,
            systemPrompt: CHAT_DEFAULTS.systemPrompt,
            enableMarkerSplit: CHAT_DEFAULTS.enableMarkerSplit,
            prefixWithTime: CHAT_DEFAULTS.prefixWithTime,
            prefixWithName: CHAT_DEFAULTS.prefixWithName,
            userName: CHAT_DEFAULTS.userName
        };
    }

    const profiles = {};
    SUPPORTED_PROVIDER_IDS.forEach((provider) => {
        profiles[provider] = normalizeStoredProfile(
            provider,
            raw.profiles[provider],
            defaultProfiles[provider]
        );
    });

    return {
        provider: resolveProviderId(raw.provider, CHAT_DEFAULTS.provider),
        profiles,
        systemPrompt: readString(raw.systemPrompt, CHAT_DEFAULTS.systemPrompt),
        enableMarkerSplit: readBoolean(raw.enableMarkerSplit, CHAT_DEFAULTS.enableMarkerSplit),
        prefixWithTime: readBoolean(raw.prefixWithTime, CHAT_DEFAULTS.prefixWithTime),
        prefixWithName: readBoolean(raw.prefixWithName, CHAT_DEFAULTS.prefixWithName),
        userName: readString(raw.userName, CHAT_DEFAULTS.userName)
    };
}
