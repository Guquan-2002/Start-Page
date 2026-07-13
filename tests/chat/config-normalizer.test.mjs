import test from 'node:test';
import assert from 'node:assert/strict';

import {
    readBoolean,
    readString,
    normalizeStoredConfig
} from '../../js/chat/config/config-normalizer.js';

test('readBoolean returns value when boolean', () => {
    assert.equal(readBoolean(true, false), true);
    assert.equal(readBoolean(false, true), false);
});

test('readBoolean returns fallback for non-boolean', () => {
    assert.equal(readBoolean('true', false), false);
    assert.equal(readBoolean(null, true), true);
    assert.equal(readBoolean(undefined, false), false);
    assert.equal(readBoolean(1, true), true);
});

test('readString returns trimmed string', () => {
    assert.equal(readString(' hello '), 'hello');
    assert.equal(readString(''), '');
});

test('readString returns fallback for non-string', () => {
    assert.equal(readString(null, 'default'), 'default');
    assert.equal(readString(123, 'fallback'), 'fallback');
});

test('normalizeStoredConfig returns defaults for null/malformed input', () => {
    const config = normalizeStoredConfig(null);
    assert.equal(typeof config.provider, 'string');
    assert.equal(config.systemPrompt, 'You are a helpful assistant.');
    assert.equal(config.enableMarkerSplit, true);
    assert.equal(typeof config.profiles, 'object');
});

test('normalizeStoredConfig preserves known fields', () => {
    const config = normalizeStoredConfig({
        provider: 'openai',
        systemPrompt: 'Custom prompt',
        enableMarkerSplit: false,
        userName: 'Dev',
        profiles: {
            openai: {
                apiUrl: 'https://custom.api/v1',
                apiKey: 'sk-custom',
                backupApiKey: '',
                model: 'custom-model',
                searchEnabled: true,
                thinkingBudget: 'high'
            }
        }
    });

    assert.equal(config.provider, 'openai');
    assert.equal(config.systemPrompt, 'Custom prompt');
    assert.equal(config.enableMarkerSplit, false);
    assert.equal(config.userName, 'Dev');
    assert.equal(config.profiles.openai.apiUrl, 'https://custom.api/v1');
    assert.equal(config.profiles.openai.thinkingBudget, 'high');
});
