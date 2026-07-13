import test from 'node:test';
import assert from 'node:assert/strict';

import {
    createChatMessage,
    createTurnId,
    splitAssistantMessageByMarker
} from '../../js/chat/core/message-model.js';
import {
    ASSISTANT_SEGMENT_MARKER,
    ASSISTANT_SENTENCE_MARKER
} from '../../js/chat/constants.js';

test('createChatMessage keeps identifiers at the top level and only used meta fields', () => {
    const turnId = createTurnId();
    const message = createChatMessage({
        role: 'user',
        content: 'Hello',
        turnId,
        metaOptions: {
            displayContent: '【User】\nHello',
            contextContent: '【User】\nHello'
        }
    });

    assert.equal(message.role, 'user');
    assert.equal(message.turnId, turnId);
    assert.equal(message.content, 'Hello');
    assert.ok(message.id.startsWith('msg_'));
    assert.deepEqual(message.meta, {
        displayContent: '【User】\nHello',
        contextContent: '【User】\nHello'
    });
});

test('splitAssistantMessageByMarker keeps full text when marker split is disabled', () => {
    const segments = splitAssistantMessageByMarker(`one ${ASSISTANT_SEGMENT_MARKER} two`);
    assert.deepEqual(segments, [`one ${ASSISTANT_SEGMENT_MARKER} two`]);
});

test('splitAssistantMessageByMarker splits by role and sentence markers when enabled', () => {
    const segments = splitAssistantMessageByMarker(
        `one${ASSISTANT_SENTENCE_MARKER}two${ASSISTANT_SEGMENT_MARKER}three`,
        { enableMarkerSplit: true }
    );
    assert.deepEqual(segments, ['one', 'two', 'three']);
});

test('splitAssistantMessageByMarker returns trimmed segments with role marker when enabled', () => {
    const segments = splitAssistantMessageByMarker(
        `one\n${ASSISTANT_SEGMENT_MARKER}\n two `,
        { enableMarkerSplit: true }
    );
    assert.deepEqual(segments, ['one', 'two']);
});

test('createChatMessage preserves canonical meta.parts payload', () => {
    const message = createChatMessage({
        role: 'user',
        content: 'with image',
        turnId: 'turn_parts',
        metaOptions: {
            parts: [
                { type: 'text', text: 'with image' },
                {
                    type: 'image',
                    image: {
                        sourceType: 'url',
                        value: 'https://example.com/image.png'
                    }
                }
            ]
        }
    });

    assert.deepEqual(message.meta.parts, [
        { type: 'text', text: 'with image' },
        {
            type: 'image',
            image: {
                sourceType: 'url',
                value: 'https://example.com/image.png'
            }
        }
    ]);
});

test('createChatMessage rejects removed meta fields', () => {
    assert.throws(() => createChatMessage({
        role: 'assistant',
        content: 'partial answer',
        metaOptions: { interrupted: true }
    }), /unsupported fields/);
});
