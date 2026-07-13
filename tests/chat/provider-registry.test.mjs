import test from 'node:test';
import assert from 'node:assert/strict';

import {
    CHAT_PROVIDER_IDS,
    getProviderDefinitions,
    getProviderIds,
    resolveProviderEndpoint
} from '../../js/chat/providers/provider-registry.js';

test('provider registry exposes definitions in provider order', () => {
    assert.deepEqual(getProviderIds(), [
        CHAT_PROVIDER_IDS.gemini,
        CHAT_PROVIDER_IDS.openai,
        CHAT_PROVIDER_IDS.openaiResponses,
        CHAT_PROVIDER_IDS.deepseek,
        CHAT_PROVIDER_IDS.arkResponses,
        CHAT_PROVIDER_IDS.anthropic
    ]);
    assert.deepEqual(
        getProviderDefinitions().map((provider) => provider.id),
        getProviderIds()
    );
});

test('provider registry resolves provider endpoints', () => {
    assert.equal(
        resolveProviderEndpoint({
            provider: CHAT_PROVIDER_IDS.openai,
            apiUrl: 'https://api.openai.com/v1'
        }),
        'https://api.openai.com/v1/chat/completions'
    );
    assert.equal(
        resolveProviderEndpoint({
            provider: CHAT_PROVIDER_IDS.deepseek,
            apiUrl: 'https://api.deepseek.com'
        }),
        'https://api.deepseek.com/chat/completions'
    );
    assert.equal(
        resolveProviderEndpoint({
            provider: CHAT_PROVIDER_IDS.gemini,
            apiUrl: 'https://generativelanguage.googleapis.com/v1beta',
            model: 'gemini-2.5-pro'
        }, true),
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:streamGenerateContent?alt=sse'
    );
});
