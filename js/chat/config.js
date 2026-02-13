import {
    CHAT_DEFAULTS,
    CHAT_PROVIDER_IDS,
    getProviderDefaults
} from './constants.js';
import { safeGetJson, safeSetJson } from '../shared/safe-storage.js';

const SUPPORTED_PROVIDER_IDS = Object.values(CHAT_PROVIDER_IDS);
const OPENAI_REASONING_LEVELS = new Set(['none', 'minimal', 'low', 'medium', 'high', 'xhigh']);
const GEMINI_SEARCH_MODES = new Set(['', 'gemini_google_search']);
const OPENAI_SEARCH_MODES = new Set([
    '',
    'openai_web_search_low',
    'openai_web_search_medium',
    'openai_web_search_high'
]);

function parsePositiveInteger(rawValue) {
    const parsed = Number.parseInt(rawValue, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function parseBoolean(rawValue, fallback = false) {
    if (typeof rawValue === 'boolean') {
        return rawValue;
    }

    if (typeof rawValue === 'string') {
        if (rawValue === 'true') return true;
        if (rawValue === 'false') return false;
    }

    return fallback;
}

function normalizeNameField(rawValue, fallback) {
    if (typeof rawValue !== 'string') {
        return fallback;
    }

    return rawValue.trim();
}

function normalizeProvider(rawValue) {
    const provider = typeof rawValue === 'string' ? rawValue.trim().toLowerCase() : '';
    if (SUPPORTED_PROVIDER_IDS.includes(provider)) {
        return provider;
    }

    return CHAT_DEFAULTS.provider;
}

function normalizeThinkingValue(provider, rawValue) {
    if (provider === CHAT_PROVIDER_IDS.openai) {
        const normalized = typeof rawValue === 'string' ? rawValue.trim().toLowerCase() : '';
        return OPENAI_REASONING_LEVELS.has(normalized) ? normalized : null;
    }

    return parsePositiveInteger(rawValue);
}

function normalizeSearchMode(provider, rawValue) {
    const normalized = typeof rawValue === 'string' ? rawValue.trim() : '';

    if (provider === CHAT_PROVIDER_IDS.openai) {
        return OPENAI_SEARCH_MODES.has(normalized) ? normalized : '';
    }

    return GEMINI_SEARCH_MODES.has(normalized) ? normalized : '';
}

function normalizeProviderProfile(provider, rawProfile = {}, fallbackProfile = null) {
    const defaults = getProviderDefaults(provider);
    const fallback = fallbackProfile || defaults;

    return {
        apiUrl: typeof rawProfile.apiUrl === 'string' && rawProfile.apiUrl.trim()
            ? rawProfile.apiUrl.trim()
            : fallback.apiUrl,
        apiKey: typeof rawProfile.apiKey === 'string' ? rawProfile.apiKey.trim() : (fallback.apiKey || ''),
        backupApiKey: typeof rawProfile.backupApiKey === 'string' ? rawProfile.backupApiKey.trim() : (fallback.backupApiKey || ''),
        model: typeof rawProfile.model === 'string' ? rawProfile.model.trim() : (fallback.model || ''),
        thinkingBudget: normalizeThinkingValue(provider, rawProfile.thinkingBudget),
        searchMode: normalizeSearchMode(provider, rawProfile.searchMode)
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
    return Object.fromEntries(
        Object.entries(profiles).map(([providerId, profile]) => [providerId, { ...profile }])
    );
}

function readRawProfiles(raw) {
    if (raw && typeof raw.profiles === 'object' && raw.profiles) {
        return raw.profiles;
    }

    if (raw && typeof raw.providerProfiles === 'object' && raw.providerProfiles) {
        return raw.providerProfiles;
    }

    return {};
}

function normalizeStoredConfig(raw) {
    const provider = normalizeProvider(raw?.provider);
    const rawProfiles = readRawProfiles(raw);

    const legacySource = {
        apiUrl: raw?.apiUrl,
        apiKey: raw?.apiKey,
        backupApiKey: raw?.backupApiKey,
        model: raw?.model,
        thinkingBudget: raw?.thinkingBudget,
        searchMode: raw?.searchMode
    };

    const defaultProfiles = createDefaultProfiles();
    const profiles = {};

    SUPPORTED_PROVIDER_IDS.forEach((providerId) => {
        const rawProfile = rawProfiles?.[providerId] && typeof rawProfiles[providerId] === 'object'
            ? rawProfiles[providerId]
            : {};

        const source = providerId === provider
            ? { ...legacySource, ...rawProfile }
            : rawProfile;

        profiles[providerId] = normalizeProviderProfile(providerId, source, defaultProfiles[providerId]);
    });

    const activeProfile = profiles[provider];

    return {
        provider,
        profiles,
        apiUrl: activeProfile.apiUrl,
        apiKey: activeProfile.apiKey,
        backupApiKey: activeProfile.backupApiKey,
        model: activeProfile.model,
        thinkingBudget: activeProfile.thinkingBudget,
        searchMode: activeProfile.searchMode,
        systemPrompt: typeof raw?.systemPrompt === 'string' ? raw.systemPrompt : CHAT_DEFAULTS.systemPrompt,
        enablePseudoStream: parseBoolean(raw?.enablePseudoStream, CHAT_DEFAULTS.enablePseudoStream),
        enableDraftAutosave: parseBoolean(raw?.enableDraftAutosave, CHAT_DEFAULTS.enableDraftAutosave),
        prefixWithTime: parseBoolean(raw?.prefixWithTime, CHAT_DEFAULTS.prefixWithTime),
        prefixWithName: parseBoolean(raw?.prefixWithName, CHAT_DEFAULTS.prefixWithName),
        userName: normalizeNameField(raw?.userName, CHAT_DEFAULTS.userName)
    };
}

function formatThinkingValue(provider, thinkingValue) {
    if (provider === CHAT_PROVIDER_IDS.openai) {
        return typeof thinkingValue === 'string' ? thinkingValue : '';
    }

    return Number.isFinite(thinkingValue) && thinkingValue > 0 ? String(thinkingValue) : '';
}

function parseThinkingInput(provider, rawValue) {
    return normalizeThinkingValue(provider, rawValue);
}

function readSearchInput(provider, searchValue) {
    return normalizeSearchMode(provider, searchValue);
}

function dispatchChange(element) {
    if (!element || typeof element.dispatchEvent !== 'function' || typeof Event !== 'function') {
        return;
    }

    element.dispatchEvent(new Event('change', { bubbles: true }));
}

export function createConfigManager(elements, storageKey) {
    const {
        cfgProvider,
        cfgUrl,
        cfgKey,
        cfgBackupKey,
        cfgModel,
        cfgPrompt,
        cfgThinkingBudget,
        cfgSearchMode,
        cfgEnablePseudoStream,
        cfgEnableDraftAutosave,
        cfgPrefixWithTime,
        cfgPrefixWithName,
        cfgUserName
    } = elements;

    let activeProvider = CHAT_DEFAULTS.provider;
    let profiles = createDefaultProfiles();

    function readProviderFields(provider) {
        return normalizeProviderProfile(provider, {
            apiUrl: cfgUrl.value,
            apiKey: cfgKey.value,
            backupApiKey: cfgBackupKey.value,
            model: cfgModel.value,
            thinkingBudget: parseThinkingInput(provider, cfgThinkingBudget.value),
            searchMode: readSearchInput(provider, cfgSearchMode ? cfgSearchMode.value : '')
        }, profiles[provider]);
    }

    function applyProviderProfile(provider, profile, { dispatchSearchChange = true } = {}) {
        cfgUrl.value = profile.apiUrl;
        cfgKey.value = profile.apiKey;
        cfgBackupKey.value = profile.backupApiKey;
        cfgModel.value = profile.model;
        cfgThinkingBudget.value = formatThinkingValue(provider, profile.thinkingBudget);

        if (cfgSearchMode) {
            cfgSearchMode.value = profile.searchMode;
            if (dispatchSearchChange) {
                dispatchChange(cfgSearchMode);
            }
        }
    }

    function switchProvider(nextProviderRaw, { dispatchSearchChange = true } = {}) {
        const nextProvider = normalizeProvider(nextProviderRaw);
        if (nextProvider === activeProvider) {
            return;
        }

        profiles[activeProvider] = readProviderFields(activeProvider);
        activeProvider = nextProvider;
        applyProviderProfile(activeProvider, profiles[activeProvider], { dispatchSearchChange });
    }

    function applyConfigToForm(config) {
        profiles = cloneProfiles(config.profiles);
        activeProvider = config.provider;

        if (cfgProvider) {
            cfgProvider.value = config.provider;
        }

        applyProviderProfile(activeProvider, profiles[activeProvider], { dispatchSearchChange: false });
        cfgPrompt.value = config.systemPrompt;

        if (cfgEnablePseudoStream) {
            cfgEnablePseudoStream.checked = config.enablePseudoStream;
        }

        if (cfgEnableDraftAutosave) {
            cfgEnableDraftAutosave.checked = config.enableDraftAutosave;
        }

        cfgPrefixWithTime.checked = config.prefixWithTime;
        cfgPrefixWithName.checked = config.prefixWithName;
        cfgUserName.value = config.userName;

        if (cfgSearchMode) {
            dispatchChange(cfgSearchMode);
        }
    }

    function readConfigFromForm() {
        const selectedProvider = cfgProvider ? normalizeProvider(cfgProvider.value) : activeProvider;
        if (selectedProvider !== activeProvider) {
            switchProvider(selectedProvider);
        }

        profiles[activeProvider] = readProviderFields(activeProvider);
        const activeProfile = profiles[activeProvider];

        return {
            provider: activeProvider,
            profiles: cloneProfiles(profiles),
            apiUrl: activeProfile.apiUrl,
            apiKey: activeProfile.apiKey,
            backupApiKey: activeProfile.backupApiKey,
            model: activeProfile.model,
            thinkingBudget: activeProfile.thinkingBudget,
            searchMode: activeProfile.searchMode,
            systemPrompt: cfgPrompt.value,
            enablePseudoStream: cfgEnablePseudoStream ? cfgEnablePseudoStream.checked : CHAT_DEFAULTS.enablePseudoStream,
            enableDraftAutosave: cfgEnableDraftAutosave ? cfgEnableDraftAutosave.checked : CHAT_DEFAULTS.enableDraftAutosave,
            prefixWithTime: cfgPrefixWithTime.checked,
            prefixWithName: cfgPrefixWithName.checked,
            userName: cfgUserName.value
        };
    }

    function loadConfig() {
        const config = normalizeStoredConfig(
            safeGetJson(storageKey, {}, globalThis.localStorage)
        );
        applyConfigToForm(config);
    }

    function saveConfig() {
        const config = normalizeStoredConfig(readConfigFromForm());
        safeSetJson(storageKey, config, globalThis.localStorage);
    }

    function getConfig() {
        const config = normalizeStoredConfig(readConfigFromForm());
        return {
            ...config,
            systemPrompt: config.systemPrompt || CHAT_DEFAULTS.systemPrompt
        };
    }

    if (cfgProvider && typeof cfgProvider.addEventListener === 'function') {
        cfgProvider.addEventListener('change', () => {
            switchProvider(cfgProvider.value);
        });
    }

    return {
        loadConfig,
        saveConfig,
        getConfig
    };
}
