import test from 'node:test';
import assert from 'node:assert/strict';

import { createConfigManager } from '../../js/chat/config.js';

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

    return {
        value: initialValue,
        checked: false,
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

function createElements() {
    return {
        cfgProvider: createField('gemini'),
        cfgUrl: createField(''),
        cfgKey: createField(''),
        cfgBackupKey: createField(''),
        cfgModel: createField(''),
        cfgPrompt: createField(''),
        cfgThinkingBudget: createField(''),
        cfgSearchMode: createField(''),
        cfgEnablePseudoStream: { checked: true },
        cfgEnableDraftAutosave: { checked: true },
        cfgPrefixWithTime: { checked: false },
        cfgPrefixWithName: { checked: false },
        cfgUserName: createField('User')
    };
}

test('config manager keeps provider specific credentials and models when switching', () => {
    const storage = createMemoryStorage();
    globalThis.localStorage = storage;

    const elements = createElements();
    const manager = createConfigManager(elements, 'llm_chat_config');
    manager.loadConfig();

    elements.cfgProvider.value = 'gemini';
    elements.cfgUrl.value = 'https://generativelanguage.googleapis.com/v1beta';
    elements.cfgKey.value = 'gem-key';
    elements.cfgModel.value = 'gemini-2.5-pro';
    elements.cfgThinkingBudget.value = '2048';
    elements.cfgSearchMode.value = 'gemini_google_search';
    elements.cfgProvider.dispatchEvent(new Event('change'));

    elements.cfgProvider.value = 'openai';
    elements.cfgProvider.dispatchEvent(new Event('change'));

    assert.equal(elements.cfgUrl.value, 'https://api.openai.com/v1');
    assert.equal(elements.cfgModel.value, 'gpt-4o-mini');

    elements.cfgUrl.value = 'https://api.openai.com/v1';
    elements.cfgKey.value = 'openai-key';
    elements.cfgModel.value = 'gpt-4o-mini';
    elements.cfgThinkingBudget.value = 'medium';
    elements.cfgSearchMode.value = 'openai_web_search_high';

    elements.cfgProvider.value = 'gemini';
    elements.cfgProvider.dispatchEvent(new Event('change'));

    assert.equal(elements.cfgKey.value, 'gem-key');
    assert.equal(elements.cfgModel.value, 'gemini-2.5-pro');
    assert.equal(elements.cfgThinkingBudget.value, '2048');
    assert.equal(elements.cfgSearchMode.value, 'gemini_google_search');

    elements.cfgProvider.value = 'openai';
    elements.cfgProvider.dispatchEvent(new Event('change'));

    assert.equal(elements.cfgKey.value, 'openai-key');
    assert.equal(elements.cfgModel.value, 'gpt-4o-mini');
    assert.equal(elements.cfgThinkingBudget.value, 'medium');
    assert.equal(elements.cfgSearchMode.value, 'openai_web_search_high');

    manager.saveConfig();
    const saved = JSON.parse(storage.getItem('llm_chat_config'));
    assert.equal(saved.provider, 'openai');
    assert.equal(saved.profiles.gemini.model, 'gemini-2.5-pro');
    assert.equal(saved.profiles.openai.model, 'gpt-4o-mini');
    assert.equal(saved.profiles.openai.thinkingBudget, 'medium');
    assert.equal(saved.profiles.openai.searchMode, 'openai_web_search_high');
});
