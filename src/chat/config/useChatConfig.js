import { useCallback, useMemo, useState } from 'react';

import { CHAT_STORAGE_KEY } from '../constants.js';
import {
    getProviderDefinition,
    getProviderDefinitions,
    getProviderDefaults,
    getProviderIds,
    resolveProviderId,
    CHAT_DEFAULTS
} from '../providers/provider-registry.js';
import { safeGetJson, safeSetJson } from '../../shared/safe-storage.js';
import { asTrimmedString } from '../../shared/string-utils.js';

const PROVIDERS = getProviderDefinitions();
const SUPPORTED_PROVIDER_IDS = getProviderIds();

function readBoolean(value, fallback) {
    return typeof value === 'boolean' ? value : fallback;
}

function normalizeReasoning(provider, rawValue) {
    const reasoning = getProviderDefinition(provider)?.reasoning;
    if (!reasoning) return '';
    const normalized = asTrimmedString(rawValue).toLowerCase();
    return reasoning.options.includes(normalized) ? normalized : '';
}

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

const DEFAULT_PROFILES = Object.fromEntries(
    SUPPORTED_PROVIDER_IDS.map((provider) => {
        const defaults = getProviderDefaults(provider);
        return [provider, normalizeStoredProfile(provider, defaults, defaults)];
    })
);

function normalizeStoredConfig(raw) {
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

export function useChatConfig({ storage, storageKey = CHAT_STORAGE_KEY } = {}) {
    const [storageTarget] = useState(() => {
        if (storage !== undefined) return storage;
        try { return globalThis.localStorage; } catch { return null; }
    });
    const [resolvedStorageKey] = useState(storageKey);
    const [config, setConfig] = useState(() => normalizeStoredConfig(
        safeGetJson(resolvedStorageKey, null, storageTarget)
    ));

    const setProvider = useCallback((providerId) => {
        setConfig((current) => {
            const nextProvider = resolveProviderId(providerId, current.provider);
            if (nextProvider === current.provider) return current;
            return { ...current, provider: nextProvider };
        });
    }, []);

    const updateProfile = useCallback((field, value) => {
        if (!isProfileField(field)) return;
        setConfig((current) => {
            const providerId = current.provider;
            const currentProfile = current.profiles[providerId];
            const normalizedValue = field === 'searchEnabled'
                ? value === true
                : asTrimmedString(value);
            if (Object.is(currentProfile[field], normalizedValue)) return current;
            return {
                ...current,
                profiles: {
                    ...current.profiles,
                    [providerId]: { ...currentProfile, [field]: normalizedValue }
                }
            };
        });
    }, []);

    const updateCommon = useCallback((field, value) => {
        if (field !== 'systemPrompt') return;
        setConfig((current) => {
            const normalizedValue = asTrimmedString(value);
            if (Object.is(current.systemPrompt, normalizedValue)) return current;
            return { ...current, systemPrompt: normalizedValue };
        });
    }, []);

    const saveConfig = useCallback(() => {
        return safeSetJson(resolvedStorageKey, config, storageTarget);
    }, [config, resolvedStorageKey, storageTarget]);

    const activeProfile = config.profiles[config.provider];

    const requestConfig = useMemo(() => {
        const provider = resolveProviderId(config.provider, CHAT_DEFAULTS.provider);
        const profile = config.profiles[provider] || {};
        return {
            provider,
            apiUrl: profile.apiUrl || '',
            apiKey: profile.apiKey || '',
            model: profile.model || '',
            reasoning: profile.reasoning || '',
            searchEnabled: profile.searchEnabled === true,
            systemPrompt: asTrimmedString(config.systemPrompt)
        };
    }, [config]);

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
