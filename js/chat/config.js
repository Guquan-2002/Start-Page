import { GEMINI_DEFAULTS } from './constants.js';

function parsePositiveInteger(rawValue) {
    const parsed = Number.parseInt(rawValue, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function normalizeStoredConfig(raw) {
    return {
        apiUrl: typeof raw.apiUrl === 'string' && raw.apiUrl.trim() ? raw.apiUrl.trim() : GEMINI_DEFAULTS.apiUrl,
        apiKey: typeof raw.apiKey === 'string' ? raw.apiKey.trim() : '',
        backupApiKey: typeof raw.backupApiKey === 'string' ? raw.backupApiKey.trim() : '',
        model: typeof raw.model === 'string' ? raw.model.trim() : '',
        systemPrompt: typeof raw.systemPrompt === 'string' ? raw.systemPrompt : GEMINI_DEFAULTS.systemPrompt,
        thinkingBudget: parsePositiveInteger(raw.thinkingBudget),
        searchMode: typeof raw.searchMode === 'string' ? raw.searchMode : GEMINI_DEFAULTS.searchMode
    };
}

export function createConfigManager(elements, storageKey) {
    const {
        cfgUrl,
        cfgKey,
        cfgBackupKey,
        cfgModel,
        cfgPrompt,
        cfgThinkingBudget,
        cfgSearchMode
    } = elements;

    function applyConfigToForm(config) {
        cfgUrl.value = config.apiUrl;
        cfgKey.value = config.apiKey;
        cfgBackupKey.value = config.backupApiKey;
        cfgModel.value = config.model;
        cfgPrompt.value = config.systemPrompt;
        cfgThinkingBudget.value = config.thinkingBudget ?? '';

        if (cfgSearchMode) {
            cfgSearchMode.value = config.searchMode;
        }
    }

    function readConfigFromForm() {
        return normalizeStoredConfig({
            apiUrl: cfgUrl.value,
            apiKey: cfgKey.value,
            backupApiKey: cfgBackupKey.value,
            model: cfgModel.value,
            systemPrompt: cfgPrompt.value,
            thinkingBudget: cfgThinkingBudget.value,
            searchMode: cfgSearchMode ? cfgSearchMode.value : GEMINI_DEFAULTS.searchMode
        });
    }

    function loadConfig() {
        try {
            const rawConfig = JSON.parse(localStorage.getItem(storageKey) || '{}');
            applyConfigToForm(normalizeStoredConfig(rawConfig));
        } catch {
            applyConfigToForm(normalizeStoredConfig({}));
        }
    }

    function saveConfig() {
        const config = readConfigFromForm();
        localStorage.setItem(storageKey, JSON.stringify(config));
    }

    function getConfig() {
        const config = readConfigFromForm();
        return {
            ...config,
            systemPrompt: config.systemPrompt || GEMINI_DEFAULTS.systemPrompt
        };
    }

    return {
        loadConfig,
        saveConfig,
        getConfig
    };
}
