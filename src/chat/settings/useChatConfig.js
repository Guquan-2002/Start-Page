import { useEffect, useState } from 'react';

import {
    getProviderDefinition,
    PROVIDERS
} from '../../shared/chat-provider-registry.js';

const CHAT_STORAGE_KEY = 'llm_chat_config';
const DEFAULT_CONFIG = {
    provider: 'gemini',
    profiles: Object.fromEntries(PROVIDERS.map(({ id, defaults }) => [
        id,
        {
            ...defaults,
            reasoning: '',
            searchEnabled: false
        }
    ])),
    systemPrompt: 'You are a helpful assistant.'
};

function readConfig() {
    const storedConfig = localStorage.getItem(CHAT_STORAGE_KEY);
    return storedConfig ? JSON.parse(storedConfig) : DEFAULT_CONFIG;
}

export function useChatConfig() {
    const [config, setConfig] = useState(readConfig);
    const activeProfile = config.profiles[config.provider];
    const definition = getProviderDefinition(config.provider);

    const setProvider = (provider) => {
        setConfig((current) => ({ ...current, provider }));
    };

    const updateProfile = (field, value) => {
        setConfig((current) => ({
            ...current,
            profiles: {
                ...current.profiles,
                [current.provider]: {
                    ...current.profiles[current.provider],
                    [field]: field === 'searchEnabled' ? value : value.trim()
                }
            }
        }));
    };

    const setSystemPrompt = (systemPrompt) => {
        setConfig((current) => ({ ...current, systemPrompt: systemPrompt.trim() }));
    };

    useEffect(() => {
        localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(config));
    }, [config]);

    return {
        config,
        activeProfile,
        providers: PROVIDERS,
        presentation: {
            placeholders: {
                apiUrl: definition.defaults.apiUrl,
                apiKey: definition.apiKeyPlaceholder,
                model: definition.defaults.model
            },
            reasoning: {
                label: 'Reasoning (optional)',
                ...definition.reasoning
            },
            search: definition.search
        },
        setProvider,
        updateProfile,
        setSystemPrompt,
        requestConfig: {
            provider: config.provider,
            ...activeProfile,
            systemPrompt: config.systemPrompt.trim()
        }
    };
}
