import test from 'node:test';
import assert from 'node:assert/strict';

import { createRegisteredProviderClients } from '../../js/chat/providers/provider-clients.js';
import { CHAT_PROVIDER_IDS } from '../../js/chat/providers/provider-registry.js';
import { createProviderRouter } from '../../js/chat/providers/provider-clients.js';

function createProvider(id) {
    return {
        id,
        async generate() {
            return { segments: [id] };
        },
        async *generateStream() {
            yield { type: 'text-delta', text: id };
        }
    };
}

test('provider router dispatches generate and generateStream by exact provider id', async () => {
    const router = createProviderRouter([
        createProvider('gemini'),
        createProvider('openai')
    ]);

    assert.deepEqual(
        await router.generate({ config: { provider: 'openai' } }),
        { segments: ['openai'] }
    );

    const events = [];
    for await (const event of router.generateStream({ config: { provider: 'gemini' } })) {
        events.push(event);
    }
    assert.deepEqual(events, [{ type: 'text-delta', text: 'gemini' }]);
});

test('provider router rejects unknown provider ids instead of falling back', () => {
    const router = createProviderRouter([createProvider('gemini')]);

    assert.throws(
        () => router.generate({ config: { provider: 'unknown' } }),
        /Unsupported provider "unknown"/
    );
});

test('registered provider clients include all six providers in display order', () => {
    const clients = createRegisteredProviderClients({ fetchImpl: async () => null });
    assert.deepEqual(clients.map((client) => client.id), [
        CHAT_PROVIDER_IDS.gemini,
        CHAT_PROVIDER_IDS.openai,
        CHAT_PROVIDER_IDS.openaiResponses,
        CHAT_PROVIDER_IDS.deepseek,
        CHAT_PROVIDER_IDS.arkResponses,
        CHAT_PROVIDER_IDS.anthropic
    ]);
});
