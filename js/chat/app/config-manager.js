/**
 * Chat settings manager.
 *
 * Stores the current profiles schema only: provider + profiles[providerId].
 */
import { CHAT_DEFAULTS } from '../constants.js';
import {
    getProviderDefaults,
    getProviderIds,
    getProviderThinkingConfig,
    resolveProviderId
} from '../providers/provider-registry.js';
import { safeGetJson, safeSetJson } from '../../shared/safe-storage.js';
import { normalizeFromUi, formatForUi } from './thinking-config.js';

const SUPPORTED_PROVIDER_IDS = getProviderIds();
const PENDING_THINKING_VALUE_ATTR = 'data-pending-thinking-value';

function parseBoolean(rawValue, fallback = false) {
    if (typeof rawValue === 'boolean') return rawValue;
    if (typeof rawValue === 'string') {
        if (rawValue === 'true') return true;
        if (rawValue === 'false') return false;
    }
    return fallback;
}

function normalizeNameField(rawValue, fallback) {
    return typeof rawValue === 'string' ? rawValue.trim() : fallback;
}

function normalizeProvider(rawValue) {
    return resolveProviderId(rawValue, CHAT_DEFAULTS.provider);
}

function normalizeReasoningValue(provider, rawValue) {
    return normalizeFromUi(provider, typeof rawValue === 'string' ? rawValue : '').value;
}

function setPendingThinkingValue(field, value) {
    if (!field) return;
    const normalized = typeof value === 'string' ? value : '';
    if (typeof field.setAttribute === 'function') {
        field.setAttribute(PENDING_THINKING_VALUE_ATTR, normalized);
        return;
    }
    if (!field.dataset || typeof field.dataset !== 'object') {
        field.dataset = {};
    }
    field.dataset.pendingThinkingValue = normalized;
}

function normalizeProviderProfile(provider, rawProfile = {}, fallbackProfile = null) {
    const defaults = getProviderDefaults(provider);
    const fallback = fallbackProfile || defaults;
    const thinkingConfig = getProviderThinkingConfig(provider);
    const thinkingField = thinkingConfig?.field || 'thinkingBudget';
    const rawThinkingValue = Object.prototype.hasOwnProperty.call(rawProfile, thinkingField)
        ? rawProfile[thinkingField]
        : fallback?.[thinkingField];

    return {
        apiUrl: typeof rawProfile.apiUrl === 'string' && rawProfile.apiUrl.trim()
            ? rawProfile.apiUrl.trim()
            : fallback.apiUrl,
        apiKey: typeof rawProfile.apiKey === 'string'
            ? rawProfile.apiKey.trim()
            : (fallback.apiKey || ''),
        backupApiKey: typeof rawProfile.backupApiKey === 'string'
            ? rawProfile.backupApiKey.trim()
            : (fallback.backupApiKey || ''),
        model: typeof rawProfile.model === 'string' && rawProfile.model.trim()
            ? rawProfile.model.trim()
            : (fallback.model || ''),
        searchEnabled: parseBoolean(rawProfile.searchEnabled, fallback.searchEnabled === true),
        [thinkingField]: normalizeReasoningValue(provider, rawThinkingValue)
    };
}

function createDefaultProfiles() {
    return Object.fromEntries(
        SUPPORTED_PROVIDER_IDS.map((providerId) => [
            providerId,
            normalizeProviderProfile(providerId, getProviderDefaults(providerId))
        ])
    );
}

function cloneProfiles(profiles) {
    return JSON.parse(JSON.stringify(profiles || {}));
}

function readRawProfiles(raw) {
    if (raw && typeof raw.profiles === 'object' && raw.profiles) return raw.profiles;
    return {};
}

function getProfileReasoningValue(provider, profile) {
    const thinkingField = getProviderThinkingConfig(provider)?.field || 'thinkingBudget';
    return Object.prototype.hasOwnProperty.call(profile, thinkingField) ? profile[thinkingField] : null;
}

function toRuntimeConfig(provider, profiles, raw = {}) {
    const activeProfile = profiles[provider];
    const thinkingField = getProviderThinkingConfig(provider)?.field || 'thinkingBudget';

    return {
        provider,
        profiles,
        apiUrl: activeProfile.apiUrl,
        apiKey: activeProfile.apiKey,
        backupApiKey: activeProfile.backupApiKey,
        model: activeProfile.model,
        thinkingBudget: thinkingField === 'thinkingBudget' ? getProfileReasoningValue(provider, activeProfile) : null,
        thinkingLevel: thinkingField === 'thinkingLevel' ? getProfileReasoningValue(provider, activeProfile) : null,
        thinkingEffort: thinkingField === 'thinkingEffort' ? getProfileReasoningValue(provider, activeProfile) : null,
        searchEnabled: activeProfile.searchEnabled === true,
        systemPrompt: typeof raw.systemPrompt === 'string' ? raw.systemPrompt : CHAT_DEFAULTS.systemPrompt,
        enablePseudoStream: parseBoolean(raw.enablePseudoStream, CHAT_DEFAULTS.enablePseudoStream),
        enableDraftAutosave: parseBoolean(raw.enableDraftAutosave, CHAT_DEFAULTS.enableDraftAutosave),
        prefixWithTime: parseBoolean(raw.prefixWithTime, CHAT_DEFAULTS.prefixWithTime),
        prefixWithName: parseBoolean(raw.prefixWithName, CHAT_DEFAULTS.prefixWithName),
        userName: normalizeNameField(raw.userName, CHAT_DEFAULTS.userName)
    };
}

function normalizeStoredConfig(raw) {
    const provider = normalizeProvider(raw?.provider);
    const rawProfiles = readRawProfiles(raw);
    const defaultProfiles = createDefaultProfiles();
    const profiles = {};

    SUPPORTED_PROVIDER_IDS.forEach((providerId) => {
        const rawProfile = rawProfiles?.[providerId] && typeof rawProfiles[providerId] === 'object'
            ? rawProfiles[providerId]
            : {};
        profiles[providerId] = normalizeProviderProfile(providerId, rawProfile, defaultProfiles[providerId]);
    });

    return toRuntimeConfig(provider, profiles, raw || {});
}

function toStoredConfig(config) {
    return {
        provider: config.provider,
        profiles: cloneProfiles(config.profiles),
        systemPrompt: config.systemPrompt,
        enablePseudoStream: config.enablePseudoStream,
        enableDraftAutosave: config.enableDraftAutosave,
        prefixWithTime: config.prefixWithTime,
        prefixWithName: config.prefixWithName,
        userName: config.userName
    };
}

export function createConfigManager(elements, storageKey) {
    const {
        cfgProvider,
        cfgUrl,
        cfgKey,
        cfgBackupKey,
        cfgModel,
        cfgPrompt,
        cfgThinkingLevel,
        cfgSearchEnabled,
        cfgEnablePseudoStream,
        cfgEnableDraftAutosave,
        cfgPrefixWithTime,
        cfgPrefixWithName,
        cfgUserName
    } = elements;

    let activeProvider = CHAT_DEFAULTS.provider;
    let profiles = createDefaultProfiles();

    function readProviderFields(provider) {
        const normalizedThinking = normalizeFromUi(provider, cfgThinkingLevel ? cfgThinkingLevel.value : '');
        return normalizeProviderProfile(provider, {
            apiUrl: cfgUrl.value,
            apiKey: cfgKey.value,
            backupApiKey: cfgBackupKey.value,
            model: cfgModel.value,
            searchEnabled: cfgSearchEnabled ? cfgSearchEnabled.checked === true : false,
            [normalizedThinking.field]: normalizedThinking.value
        }, profiles[provider]);
    }

    function applyProviderProfile(provider, profile) {
        cfgUrl.value = profile.apiUrl;
        cfgKey.value = profile.apiKey;
        cfgBackupKey.value = profile.backupApiKey;
        cfgModel.value = profile.model;
        if (cfgThinkingLevel) {
            const thinkingValue = formatForUi(provider, profile);
            setPendingThinkingValue(cfgThinkingLevel, thinkingValue);
            cfgThinkingLevel.value = thinkingValue;
        }
        if (cfgSearchEnabled) {
            cfgSearchEnabled.checked = profile.searchEnabled === true;
        }
    }

    function switchProvider(nextProviderRaw) {
        const nextProvider = normalizeProvider(nextProviderRaw);
        if (nextProvider === activeProvider) return;
        profiles[activeProvider] = readProviderFields(activeProvider);
        activeProvider = nextProvider;
        applyProviderProfile(activeProvider, profiles[activeProvider]);
    }

    function applyConfigToForm(config) {
        profiles = cloneProfiles(config.profiles);
        activeProvider = config.provider;
        if (cfgProvider) cfgProvider.value = config.provider;
        applyProviderProfile(activeProvider, profiles[activeProvider]);
        cfgPrompt.value = config.systemPrompt;
        if (cfgEnablePseudoStream) cfgEnablePseudoStream.checked = config.enablePseudoStream;
        if (cfgEnableDraftAutosave) cfgEnableDraftAutosave.checked = config.enableDraftAutosave;
        if (cfgPrefixWithTime) cfgPrefixWithTime.checked = config.prefixWithTime;
        if (cfgPrefixWithName) cfgPrefixWithName.checked = config.prefixWithName;
        if (cfgUserName) cfgUserName.value = config.userName;
    }

    function readConfigFromForm() {
        const selectedProvider = cfgProvider ? normalizeProvider(cfgProvider.value) : activeProvider;
        if (selectedProvider !== activeProvider) switchProvider(selectedProvider);
        profiles[activeProvider] = readProviderFields(activeProvider);
        return toRuntimeConfig(activeProvider, cloneProfiles(profiles), {
            systemPrompt: cfgPrompt.value,
            enablePseudoStream: cfgEnablePseudoStream ? cfgEnablePseudoStream.checked : CHAT_DEFAULTS.enablePseudoStream,
            enableDraftAutosave: cfgEnableDraftAutosave ? cfgEnableDraftAutosave.checked : CHAT_DEFAULTS.enableDraftAutosave,
            prefixWithTime: cfgPrefixWithTime ? cfgPrefixWithTime.checked : CHAT_DEFAULTS.prefixWithTime,
            prefixWithName: cfgPrefixWithName ? cfgPrefixWithName.checked : CHAT_DEFAULTS.prefixWithName,
            userName: cfgUserName ? cfgUserName.value : CHAT_DEFAULTS.userName
        });
    }

    function loadConfig() {
        const config = normalizeStoredConfig(safeGetJson(storageKey, {}, globalThis.localStorage));
        applyConfigToForm(config);
    }

    function saveConfig() {
        const config = normalizeStoredConfig(readConfigFromForm());
        safeSetJson(storageKey, toStoredConfig(config), globalThis.localStorage);
    }

    function getConfig() {
        const config = normalizeStoredConfig(readConfigFromForm());
        return { ...config, systemPrompt: config.systemPrompt || CHAT_DEFAULTS.systemPrompt };
    }

    if (cfgProvider && typeof cfgProvider.addEventListener === 'function') {
        cfgProvider.addEventListener('change', () => switchProvider(cfgProvider.value));
    }

    return { loadConfig, saveConfig, getConfig };
}
