/**
 * Chat settings manager.
 *
 * Owns the current provider profiles schema and all provider-specific form UI.
 *
 * Normalization logic is in config/config-normalizer.js (pure, no DOM);
 * this module stays focused on DOM coordination, storage I/O, and wiring.
 */
import { CHAT_DEFAULTS } from '../providers/provider-registry.js';
import {
    getProviderDefinitions,
    getProviderPlaceholders,
    getProviderSearchConfig,
    getProviderThinkingConfig,
    resolveProviderId
} from '../providers/provider-registry.js';
import { safeGetJson, safeSetJson } from '../../shared/safe-storage.js';
import { refreshCustomSelect } from '../ui/custom-select.js';
import {
    buildDefaultProfiles,
    normalizeReasoningField,
    normalizeStoredConfig,
    normalizeStoredProfile
} from '../config/config-normalizer.js';

function createOption(value, label) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = label;
    return option;
}

function replaceOptions(select, options) {
    select.replaceChildren(...options.map(({ value, label }) => createOption(value, label)));
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
        cfgThinkingLabel,
        cfgThinkingNote,
        cfgSearchEnabled,
        cfgSearchLabel,
        cfgSearchNote,
        cfgPrefixWithTime,
        cfgPrefixWithName,
        cfgUserName
    } = elements;

    let activeProvider = CHAT_DEFAULTS.provider;
    let profiles = buildDefaultProfiles();

    function populateProviderSelect() {
        replaceOptions(cfgProvider, getProviderDefinitions().map((provider) => ({
            value: provider.id,
            label: provider.settingsLabel
        })));
        cfgProvider.value = activeProvider;
        refreshCustomSelect(cfgProvider);
    }

    function renderProviderPresentation(provider) {
        const placeholders = getProviderPlaceholders(provider);
        cfgUrl.placeholder = placeholders.apiUrl;
        cfgKey.placeholder = placeholders.apiKey;
        cfgBackupKey.placeholder = placeholders.backupApiKey;
        cfgModel.placeholder = placeholders.model;

        const reasoning = getProviderThinkingConfig(provider);
        cfgThinkingLabel.textContent = reasoning.label;
        cfgThinkingNote.textContent = reasoning.note;
        replaceOptions(cfgThinkingLevel, [
            { value: '', label: 'Auto' },
            ...reasoning.options.map((value, index) => ({
                value,
                label: index === 0 ? 'Disabled' : value
            }))
        ]);

        const search = getProviderSearchConfig(provider);
        cfgSearchLabel.textContent = search.label;
        cfgSearchNote.textContent = search.note;
        cfgSearchEnabled.disabled = false;
    }

    function readProviderProfile(provider) {
        const reasoning = getProviderThinkingConfig(provider);
        return {
            apiUrl: cfgUrl.value.trim(),
            apiKey: cfgKey.value.trim(),
            backupApiKey: cfgBackupKey.value.trim(),
            model: cfgModel.value.trim(),
            searchEnabled: cfgSearchEnabled.checked,
            [reasoning.field]: normalizeReasoningField(provider, cfgThinkingLevel.value)
        };
    }

    function applyProviderProfile(provider) {
        const profile = profiles[provider];
        const reasoning = getProviderThinkingConfig(provider);
        cfgUrl.value = profile.apiUrl;
        cfgKey.value = profile.apiKey;
        cfgBackupKey.value = profile.backupApiKey;
        cfgModel.value = profile.model;
        cfgThinkingLevel.value = profile[reasoning.field] || '';
        cfgSearchEnabled.checked = profile.searchEnabled;
        refreshCustomSelect(cfgThinkingLevel);
    }

    function switchProvider(nextProviderValue) {
        const nextProvider = resolveProviderId(nextProviderValue, CHAT_DEFAULTS.provider);
        if (nextProvider === activeProvider) {
            return;
        }

        profiles[activeProvider] = readProviderProfile(activeProvider);
        activeProvider = nextProvider;
        renderProviderPresentation(activeProvider);
        applyProviderProfile(activeProvider);
    }

    function applyCommonSettings(config) {
        cfgPrompt.value = config.systemPrompt;
        cfgPrefixWithTime.checked = config.prefixWithTime;
        cfgPrefixWithName.checked = config.prefixWithName;
        cfgUserName.value = config.userName;
    }

    function readCommonSettings() {
        return {
            systemPrompt: cfgPrompt.value,
            enableMarkerSplit: true,
            prefixWithTime: cfgPrefixWithTime.checked,
            prefixWithName: cfgPrefixWithName.checked,
            userName: cfgUserName.value.trim()
        };
    }

    function captureActiveProfile() {
        profiles[activeProvider] = readProviderProfile(activeProvider);
        return profiles[activeProvider];
    }

    function loadConfig() {
        const config = normalizeStoredConfig(
            safeGetJson(storageKey, null, globalThis.localStorage)
        );
        activeProvider = config.provider;
        profiles = config.profiles;

        populateProviderSelect();
        renderProviderPresentation(activeProvider);
        applyProviderProfile(activeProvider);
        applyCommonSettings(config);
    }

    function saveConfig() {
        captureActiveProfile();
        safeSetJson(storageKey, {
            provider: activeProvider,
            profiles,
            ...readCommonSettings()
        }, globalThis.localStorage);
    }

    function getConfig() {
        const profile = captureActiveProfile();
        const reasoning = getProviderThinkingConfig(activeProvider);
        const common = readCommonSettings();
        const reasoningValue = profile[reasoning.field];

        return {
            provider: activeProvider,
            apiUrl: profile.apiUrl,
            apiKey: profile.apiKey,
            backupApiKey: profile.backupApiKey,
            model: profile.model,
            thinkingBudget: reasoning.field === 'thinkingBudget' ? reasoningValue : null,
            thinkingLevel: reasoning.field === 'thinkingLevel' ? reasoningValue : null,
            thinkingEffort: reasoning.field === 'thinkingEffort' ? reasoningValue : null,
            searchEnabled: profile.searchEnabled,
            systemPrompt: common.systemPrompt,
            enableMarkerSplit: common.enableMarkerSplit,
            prefixWithTime: common.prefixWithTime,
            prefixWithName: common.prefixWithName,
            userName: common.userName
        };
    }

    cfgProvider.addEventListener('change', () => switchProvider(cfgProvider.value));

    return { loadConfig, saveConfig, getConfig };
}
