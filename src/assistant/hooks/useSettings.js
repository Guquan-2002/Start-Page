import { useEffect, useState } from 'react';

import {
    getProviderDefinition,
    PROVIDERS
} from '../../shared/provider-registry.js';

const SETTINGS_STORAGE_KEY = 'assistant_settings';
const DEFAULT_SETTINGS = {
    provider: 'gemini',
    profiles: Object.fromEntries(PROVIDERS.map(({ id, defaults }) => [
        id,
        {
            ...defaults,
            reasoning: '',
            searchEnabled: false
        }
    ])),
    systemPrompt: '你是一个有帮助的助手。'
};

function readSettings() {
    const storedSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);
    return storedSettings ? JSON.parse(storedSettings) : DEFAULT_SETTINGS;
}

export function useSettings() {
    const [settings, setSettings] = useState(readSettings);
    const activeProfile = settings.profiles[settings.provider];
    const providerDefinition = getProviderDefinition(settings.provider);

    const setProvider = (provider) => {
        setSettings((currentSettings) => ({ ...currentSettings, provider }));
    };

    const updateProfile = (field, value) => {
        setSettings((currentSettings) => ({
            ...currentSettings,
            profiles: {
                ...currentSettings.profiles,
                [currentSettings.provider]: {
                    ...currentSettings.profiles[currentSettings.provider],
                    [field]: field === 'searchEnabled' ? value : value.trim()
                }
            }
        }));
    };

    const setSystemPrompt = (systemPrompt) => {
        setSettings((currentSettings) => ({
            ...currentSettings,
            systemPrompt: systemPrompt.trim()
        }));
    };

    useEffect(() => {
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    }, [settings]);

    return {
        values: settings,
        activeProfile,
        providers: PROVIDERS,
        providerPresentation: {
            placeholders: {
                apiUrl: providerDefinition.defaults.apiUrl,
                apiKey: providerDefinition.apiKeyPlaceholder,
                model: providerDefinition.defaults.model
            },
            reasoning: {
                label: '推理（可选）',
                ...providerDefinition.reasoning
            },
            search: providerDefinition.search
        },
        setProvider,
        updateProfile,
        setSystemPrompt,
        providerConfig: {
            provider: settings.provider,
            ...activeProfile,
            systemPrompt: settings.systemPrompt.trim()
        }
    };
}
