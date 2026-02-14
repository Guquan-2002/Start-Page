import test from 'node:test';
import assert from 'node:assert/strict';

import { buildContextWindow, buildLocalMessageEnvelope } from '../../js/chat/core/context-window.js';

function createMessage(role, content, turnId) {
    return {
        id: `${turnId}_${role}`,
        turnId,
        role,
        content,
        meta: {
            messageId: `${turnId}_${role}`,
            turnId,
            createdAt: Date.now(),
            tokenEstimate: 10
        }
    };
}

test('buildContextWindow trims by maxContextMessages keeping newest messages', () => {
    const history = [
        createMessage('user', 'm1', 'turn1'),
        createMessage('assistant', 'a1', 'turn1'),
        createMessage('user', 'm2', 'turn2'),
        createMessage('assistant', 'a2', 'turn2'),
        createMessage('user', 'm3', 'turn3')
    ];

    const contextWindow = buildContextWindow(history, 200000, 3);

    assert.equal(contextWindow.messages.length, 3);
    assert.deepEqual(
        contextWindow.messages.map((message) => message.content),
        ['m2', 'a2', 'm3']
    );
    assert.equal(contextWindow.isTrimmed, true);
});

test('buildContextWindow truncates an oversized newest message', () => {
    const hugeMessage = createMessage('user', 'x'.repeat(12000), 'turn_big');
    const contextWindow = buildContextWindow([hugeMessage], 1200, 120);

    assert.equal(contextWindow.messages.length, 1);
    assert.equal(contextWindow.isTrimmed, true);
    assert.ok(contextWindow.messages[0].content.length < hugeMessage.content.length);
    assert.ok(contextWindow.tokenCount <= contextWindow.inputBudgetTokens);
});

test('buildContextWindow excludes empty/invalid history rows', () => {
    const history = [
        createMessage('user', 'hello', 'turn1'),
        { role: 'assistant', content: '   ', turnId: 'turn1', id: 'a', meta: {} },
        { role: 'system', content: 'ignored', turnId: 'turn2', id: 's', meta: {} }
    ];

    const contextWindow = buildContextWindow(history, 200000, 120);
    assert.deepEqual(contextWindow.messages.map((message) => message.content), ['hello']);
});

test('buildLocalMessageEnvelope prefers meta.parts over legacy content', () => {
    const history = [{
        id: 'u1',
        turnId: 'turn1',
        role: 'user',
        content: 'legacy text',
        meta: {
            parts: [
                { type: 'text', text: 'modern text' },
                {
                    type: 'image',
                    image: {
                        sourceType: 'url',
                        value: 'https://example.com/cat.png'
                    }
                }
            ]
        }
    }];

    const envelope = buildLocalMessageEnvelope(history, {
        systemPrompt: 'You are helpful.'
    }, {
        maxContextTokens: 200000,
        maxContextMessages: 120
    });

    assert.equal(envelope.systemInstruction, 'You are helpful.');
    assert.equal(envelope.messages.length, 1);
    assert.deepEqual(envelope.messages[0].parts[0], {
        type: 'text',
        text: 'modern text'
    });
    assert.deepEqual(envelope.messages[0].parts[1], {
        type: 'image',
        image: {
            sourceType: 'url',
            value: 'https://example.com/cat.png'
        }
    });
});
