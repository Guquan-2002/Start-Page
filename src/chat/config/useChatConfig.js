import { useCallback, useMemo, useState } from 'react';

import { CHAT_STORAGE_KEY } from '../constants.js';
import { normalizeStoredConfig } from './config-normalizer.js';
import {
    getProviderDefinition,
    getProviderDefinitions,
    resolveProviderId
} from '../providers/provider-registry.js';
import { safeGetJson, safeSetJson } from '../../shared/safe-storage.js';

const PROVIDERS = getProviderDefinitions();

function normalizeStringDraft(value) {
    return typeof value === 'string' ? value : '';
}

function isProfileField(field) {
    return field === 'apiUrl'
        || field === 'apiKey'
        || field === 'model'
        || field === 'reasoning'
        || field === 'searchEnabled';
}

function buildPresentation(providerId) {
    const definition = getProviderDefinition(providerId);
    return {
        placeholders: definition.placeholders,
        reasoning: {
            label: 'Reasoning (optional)',
            ...definition.reasoning
        },
        search: definition.search
    };
}

function buildRequestConfig(sourceConfig) {
    const normalized = normalizeStoredConfig(sourceConfig);
    const provider = normalized.provider;
    const activeProfile = normalized.profiles[provider];

    return {
        provider,
        apiUrl: activeProfile.apiUrl,
        apiKey: activeProfile.apiKey,
        model: activeProfile.model,
        reasoning: activeProfile.reasoning,
        searchEnabled: activeProfile.searchEnabled,
        systemPrompt: normalizeStringDraft(sourceConfig.systemPrompt)
    };
}

export function useChatConfig({
    storage,
    storageKey = CHAT_STORAGE_KEY
} = {}) {
    const [storageTarget] = useState(() => {
        if (storage !== undefined) return storage;
        try { return globalThis.localStorage; } catch { return null; }
    });
    const [resolvedStorageKey] = useState(storageKey);
    const [config, setConfig] = useState(() => normalizeStoredConfig(
        safeGetJson(resolvedStorageKey, null, storageTarget)
    ));

    const setProvider = useCallback((providerId) => {
        setConfig((currentConfig) => {
            const nextProvider = resolveProviderId(providerId, currentConfig.provider);
            if (nextProvider === currentConfig.provider) {
                return currentConfig;
            }
            return { ...currentConfig, provider: nextProvider };
        });
    }, []);

    const updateProfile = useCallback((field, value) => {
        if (!isProfileField(field)) return;
        setConfig((currentConfig) => {
            const providerId = currentConfig.provider;
            const currentProfile = currentConfig.profiles[providerId];
            const normalizedValue = field === 'searchEnabled'
                ? value === true
                : normalizeStringDraft(value);
            if (Object.is(currentProfile[field], normalizedValue)) {
                return currentConfig;
            }
            return {
                ...currentConfig,
                profiles: {
                    ...currentConfig.profiles,
                    [providerId]: { ...currentProfile, [field]: normalizedValue }
                }
            };
        });
    }, []);

    const updateCommon = useCallback((field, value) => {
        if (field !== 'systemPrompt') return;
        setConfig((currentConfig) => {
            const normalizedValue = normalizeStringDraft(value);
            if (Object.is(currentConfig.systemPrompt, normalizedValue)) {
                return currentConfig;
            }
            return { ...currentConfig, systemPrompt: normalizedValue };
        });
    }, []);

    const saveConfig = useCallback(() => {
        const storedConfig = normalizeStoredConfig(config);
        return safeSetJson(resolvedStorageKey, storedConfig, storageTarget);
    }, [config, resolvedStorageKey, storageTarget]);

    const requestConfig = useMemo(() => buildRequestConfig(config), [config]);

    const activeProfile = config.profiles[config.provider];
    const presentation = useMemo(
        () => buildPresentation(config.provider),
        [config.provider]
    );

    return useMemo(() => ({
        config,
        activeProfile,
        providers: PROVIDERS,
        presentation,
        setProvider,
        updateProfile,
        updateCommon,
        saveConfig,
        requestConfig
    }), [
        activeProfile,
        config,
        presentation,
        requestConfig,
        saveConfig,
        setProvider,
        updateCommon,
        updateProfile
    ]);
}
