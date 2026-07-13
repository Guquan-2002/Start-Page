import test from 'node:test';
import assert from 'node:assert/strict';

import { createConfigManager } from '../../js/chat/app/config-manager.js';

function createMemoryStorage() {
    const map = new Map();

    return {
        getItem(key) {
            return map.has(key) ? map.get(key) : null;
        },
        setItem(key, value) {
            map.set(key, String(value));
        },
        removeItem(key) {
            map.delete(key);
        }
    };
}

function createField(initialValue = '') {
    const listeners = new Map();
    let currentValue = String(initialValue);

    return {
        get value() {
            return currentValue;
        },
        set value(nextValue) {
            currentValue = String(nextValue ?? '');
        },
        checked: false,
        disabled: false,
        placeholder: '',
        textContent: '',
        addEventListener(eventName, handler) {
            const handlers = listeners.get(eventName) || [];
            handlers.push(handler);
            listeners.set(eventName, handlers);
        },
        dispatchEvent(event) {
            const handlers = listeners.get(event?.type) || [];
            handlers.forEach((handler) => handler(event));
        }
    };
}

function createSelect(initialValue = '') {
    const select = createField(initialValue);
    let options = [];
    let rebuildCount = 0;

    Object.defineProperties(select, {
        options: {
            get() {
                return options;
            }
        },
        selectedOptions: {
            get() {
                const selected = options.find((option) => option.value === select.value);
                return selected ? [selected] : [];
            }
        },
        customSelectRebuildCount: {
            get() {
                return rebuildCount;
            }
        }
    });

    select.replaceChildren = (...nextOptions) => {
        options = nextOptions;
        if (!options.some((option) => option.value === select.value)) {
            select.value = options[0]?.value || '';
        }
    };
    select._customSelectApi = {
        rebuildOptions() {
            rebuildCount += 1;
        }
    };

    return select;
}

globalThis.document = {
    createElement(tagName) {
        assert.equal(tagName, 'option');
        return { value: '', textContent: '', disabled: false };
    }
};

function createElements() {
    return {
        cfgProvider: createSelect('gemini'),
        cfgUrl: createField(''),
        cfgKey: createField(''),
        cfgBackupKey: createField(''),
        cfgModel: createField(''),
        cfgPrompt: createField(''),
        cfgThinkingLevel: createSelect(''),
        cfgThinkingLabel: createField(''),
        cfgThinkingNote: createField(''),
        cfgSearchEnabled: { checked: false },
        cfgSearchLabel: createField(''),
        cfgSearchNote: createField(''),
        cfgEnableStreaming: { checked: true },
        cfgPrefixWithTime: { checked: false },
        cfgPrefixWithName: { checked: false },
        cfgUserName: createField('User')
    };
}

test('config manager keeps provider profiles and search toggles when switching', () => {
    const storage = createMemoryStorage();
    globalThis.localStorage = storage;

    const elements = createElements();
    const manager = createConfigManager(elements, 'llm_chat_config');
    manager.loadConfig();

    assert.deepEqual(
        elements.cfgProvider.options.map((option) => option.value),
        ['gemini', 'openai', 'openai_responses', 'deepseek', 'ark_responses', 'anthropic']
    );

    elements.cfgProvider.value = 'gemini';
    elements.cfgUrl.value = 'https://generativelanguage.googleapis.com/v1beta';
    elements.cfgKey.value = 'gem-key';
    elements.cfgModel.value = 'gemini-3-pro-preview';
    elements.cfgThinkingLevel.value = 'high';
    elements.cfgSearchEnabled.checked = true;

    elements.cfgProvider.value = 'openai';
    elements.cfgProvider.dispatchEvent(new Event('change'));

    assert.equal(elements.cfgUrl.value, 'https://api.openai.com/v1');
    assert.equal(elements.cfgModel.value, 'gpt-5');
    assert.equal(elements.cfgSearchEnabled.checked, false);

    elements.cfgUrl.value = 'https://api.openai.com/v1';
    elements.cfgKey.value = 'openai-key';
    elements.cfgModel.value = 'gpt-5';
    elements.cfgThinkingLevel.value = 'medium';
    elements.cfgSearchEnabled.checked = true;

    elements.cfgProvider.value = 'openai_responses';
    elements.cfgProvider.dispatchEvent(new Event('change'));

    assert.equal(elements.cfgUrl.value, 'https://api.openai.com/v1');
    assert.equal(elements.cfgModel.value, 'gpt-5');
    assert.equal(elements.cfgSearchEnabled.checked, false);

    elements.cfgUrl.value = 'https://api.openai.com/v1';
    elements.cfgKey.value = 'openai-responses-key';
    elements.cfgModel.value = 'gpt-5';
    elements.cfgThinkingLevel.value = 'high';
    elements.cfgSearchEnabled.checked = true;

    elements.cfgProvider.value = 'deepseek';
    elements.cfgProvider.dispatchEvent(new Event('change'));

    assert.equal(elements.cfgUrl.value, 'https://api.deepseek.com');
    assert.equal(elements.cfgModel.value, 'deepseek-v4-flash');
    assert.equal(elements.cfgSearchEnabled.checked, false);

    elements.cfgUrl.value = 'https://api.deepseek.com';
    elements.cfgKey.value = 'deepseek-key';
    elements.cfgModel.value = 'deepseek-v4-pro';
    elements.cfgThinkingLevel.value = 'max';
    elements.cfgSearchEnabled.checked = false;

    elements.cfgProvider.value = 'ark_responses';
    elements.cfgProvider.dispatchEvent(new Event('change'));

    assert.equal(elements.cfgUrl.value, 'https://ark.cn-beijing.volces.com/api/v3/responses');
    assert.equal(elements.cfgModel.value, 'doubao-seed-2-0-pro-260215');
    assert.equal(elements.cfgSearchEnabled.checked, false);

    elements.cfgUrl.value = 'https://ark.cn-beijing.volces.com/api/v3/responses';
    elements.cfgKey.value = 'ark-key';
    elements.cfgModel.value = 'doubao-seed-2-0-pro-260215';
    elements.cfgThinkingLevel.value = 'medium';
    elements.cfgSearchEnabled.checked = false;

    elements.cfgProvider.value = 'anthropic';
    elements.cfgProvider.dispatchEvent(new Event('change'));

    assert.equal(elements.cfgUrl.value, 'https://api.anthropic.com/v1');
    assert.equal(elements.cfgModel.value, 'claude-sonnet-4-5-20250929');
    assert.equal(elements.cfgSearchEnabled.checked, false);

    elements.cfgUrl.value = 'https://api.anthropic.com/v1';
    elements.cfgKey.value = 'anthropic-key';
    elements.cfgModel.value = 'claude-sonnet-4-5-20250929';
    elements.cfgThinkingLevel.value = 'none';
    elements.cfgSearchEnabled.checked = true;

    elements.cfgProvider.value = 'gemini';
    elements.cfgProvider.dispatchEvent(new Event('change'));

    assert.equal(elements.cfgKey.value, 'gem-key');
    assert.equal(elements.cfgModel.value, 'gemini-3-pro-preview');
    assert.equal(elements.cfgThinkingLevel.value, 'high');
    assert.equal(elements.cfgSearchEnabled.checked, true);

    elements.cfgProvider.value = 'openai';
    elements.cfgProvider.dispatchEvent(new Event('change'));

    assert.equal(elements.cfgKey.value, 'openai-key');
    assert.equal(elements.cfgModel.value, 'gpt-5');
    assert.equal(elements.cfgThinkingLevel.value, 'medium');
    assert.equal(elements.cfgSearchEnabled.checked, true);

    elements.cfgProvider.value = 'openai_responses';
    elements.cfgProvider.dispatchEvent(new Event('change'));

    assert.equal(elements.cfgKey.value, 'openai-responses-key');
    assert.equal(elements.cfgModel.value, 'gpt-5');
    assert.equal(elements.cfgThinkingLevel.value, 'high');
    assert.equal(elements.cfgSearchEnabled.checked, true);

    elements.cfgProvider.value = 'deepseek';
    elements.cfgProvider.dispatchEvent(new Event('change'));

    assert.equal(elements.cfgKey.value, 'deepseek-key');
    assert.equal(elements.cfgModel.value, 'deepseek-v4-pro');
    assert.equal(elements.cfgThinkingLevel.value, 'max');
    assert.equal(elements.cfgSearchEnabled.checked, false);

    elements.cfgProvider.value = 'ark_responses';
    elements.cfgProvider.dispatchEvent(new Event('change'));

    assert.equal(elements.cfgKey.value, 'ark-key');
    assert.equal(elements.cfgModel.value, 'doubao-seed-2-0-pro-260215');
    assert.equal(elements.cfgThinkingLevel.value, 'medium');
    assert.equal(elements.cfgSearchEnabled.checked, false);

    elements.cfgProvider.value = 'anthropic';
    elements.cfgProvider.dispatchEvent(new Event('change'));

    assert.equal(elements.cfgKey.value, 'anthropic-key');
    assert.equal(elements.cfgModel.value, 'claude-sonnet-4-5-20250929');
    assert.equal(elements.cfgThinkingLevel.value, 'none');
    assert.equal(elements.cfgSearchEnabled.checked, true);

    manager.saveConfig();
    const saved = JSON.parse(storage.getItem('llm_chat_config'));
    assert.equal(saved.provider, 'anthropic');
    assert.equal(saved.apiUrl, undefined);
    assert.equal(saved.profiles.gemini.model, 'gemini-3-pro-preview');
    assert.equal(saved.profiles.gemini.thinkingLevel, 'high');
    assert.equal(saved.profiles.gemini.searchEnabled, true);
    assert.equal(saved.profiles.openai.model, 'gpt-5');
    assert.equal(saved.profiles.openai.thinkingBudget, 'medium');
    assert.equal(saved.profiles.openai.searchEnabled, true);
    assert.equal(saved.profiles.openai_responses.model, 'gpt-5');
    assert.equal(saved.profiles.openai_responses.thinkingBudget, 'high');
    assert.equal(saved.profiles.openai_responses.searchEnabled, true);
    assert.equal(saved.profiles.deepseek.model, 'deepseek-v4-pro');
    assert.equal(saved.profiles.deepseek.thinkingBudget, 'max');
    assert.equal(saved.profiles.deepseek.searchEnabled, false);
    assert.equal(saved.profiles.ark_responses.model, 'doubao-seed-2-0-pro-260215');
    assert.equal(saved.profiles.ark_responses.thinkingBudget, 'medium');
    assert.equal(saved.profiles.ark_responses.searchEnabled, false);
    assert.equal(saved.profiles.anthropic.model, 'claude-sonnet-4-5-20250929');
    assert.equal(saved.profiles.anthropic.thinkingEffort, 'none');
    assert.equal(saved.profiles.anthropic.searchEnabled, true);
});

test('config manager requires provider profiles and uses defaults when absent', () => {
    const storage = createMemoryStorage();
    globalThis.localStorage = storage;
    storage.setItem('llm_chat_config', JSON.stringify({
        provider: 'openai',
        apiUrl: 'https://unsupported.example/api',
        apiKey: 'unsupported-key',
        model: 'unsupported-model'
    }));

    const elements = createElements();
    const manager = createConfigManager(elements, 'llm_chat_config');
    manager.loadConfig();

    assert.equal(elements.cfgProvider.value, 'gemini');
    assert.equal(elements.cfgUrl.value, 'https://generativelanguage.googleapis.com/v1beta');
    assert.equal(elements.cfgKey.value, '');
    assert.equal(elements.cfgModel.value, 'gemini-3-pro-preview');
    assert.equal(elements.cfgSearchEnabled.checked, false);
});

test('config manager keeps an intentionally blank canonical profile field', () => {
    const storage = createMemoryStorage();
    globalThis.localStorage = storage;

    const elements = createElements();
    const manager = createConfigManager(elements, 'llm_chat_config');
    manager.loadConfig();
    elements.cfgModel.value = '';

    assert.equal(manager.getConfig().model, '');
    manager.saveConfig();

    const reloadedElements = createElements();
    const reloadedManager = createConfigManager(reloadedElements, 'llm_chat_config');
    reloadedManager.loadConfig();
    assert.equal(reloadedElements.cfgModel.value, '');
});

test('config manager builds provider presentation before applying the stored profile', () => {
    const storage = createMemoryStorage();
    globalThis.localStorage = storage;
    storage.setItem('llm_chat_config', JSON.stringify({
        provider: 'openai',
        profiles: {
            openai: {
                apiUrl: 'https://api.openai.com/v1',
                model: 'gpt-5',
                thinkingBudget: 'minimal'
            }
        }
    }));

    const elements = createElements();
    const manager = createConfigManager(elements, 'llm_chat_config');
    manager.loadConfig();

    assert.equal(elements.cfgProvider.value, 'openai');
    assert.deepEqual(
        elements.cfgThinkingLevel.options.map((option) => option.value),
        ['', 'none', 'minimal', 'low', 'medium', 'high', 'xhigh']
    );
    assert.equal(elements.cfgThinkingLevel.value, 'minimal');
    assert.equal(elements.cfgThinkingLabel.textContent, 'Reasoning (optional)');
    assert.equal(elements.cfgThinkingNote.textContent.includes('xhigh'), true);
    assert.equal(elements.cfgSearchLabel.textContent, 'Web Search (OpenAI Completions)');
    assert.equal(elements.cfgUrl.placeholder, 'https://api.openai.com/v1');
    assert.equal(elements.cfgThinkingLevel.customSelectRebuildCount > 0, true);
});
