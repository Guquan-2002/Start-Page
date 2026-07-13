import test from 'node:test';
import assert from 'node:assert/strict';

import { buildContextEnvelope } from '../../js/chat/core/context-window.js';

test('buildContextEnvelope prefers meta.parts over display content', () => {
    const history = [{
        id: 'u1',
        turnId: 'turn1',
        role: 'user',
        content: 'display text',
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

    const envelope = buildContextEnvelope(history, {
        systemPrompt: 'You are helpful.'
    }, {
        maxContextTokens: 200000,
        maxContextMessages: 120
    });

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
