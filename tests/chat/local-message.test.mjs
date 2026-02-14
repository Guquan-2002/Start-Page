import test from 'node:test';
import assert from 'node:assert/strict';

import {
    buildLocalMessageEnvelope,
    getLocalMessageText,
    normalizeLocalMessage,
    normalizeLocalPart,
    parseImageDataUrl
} from '../../js/chat/core/local-message.js';

test('normalizeLocalMessage converts legacy text content into text part', () => {
    const normalized = normalizeLocalMessage({
        role: 'user',
        content: 'hello world'
    });

    assert.deepEqual(normalized, {
        role: 'user',
        parts: [{
            type: 'text',
            text: 'hello world'
        }]
    });
});

test('normalizeLocalMessage keeps text+image parts and normalizes image detail', () => {
    const normalized = normalizeLocalMessage({
        role: 'assistant',
        turnId: 'turn_1',
        parts: [
            { type: 'text', text: 'look at this' },
            {
                type: 'image',
                image: {
                    sourceType: 'url',
                    value: 'https://example.com/cat.png',
                    detail: 'HIGH'
                }
            }
        ]
    });

    assert.equal(normalized.role, 'assistant');
    assert.equal(normalized.turnId, 'turn_1');
    assert.deepEqual(normalized.parts[0], {
        type: 'text',
        text: 'look at this'
    });
    assert.deepEqual(normalized.parts[1], {
        type: 'image',
        image: {
            sourceType: 'url',
            value: 'https://example.com/cat.png',
            detail: 'high'
        }
    });
});

test('normalizeLocalPart rejects invalid base64 image without mimeType', () => {
    const normalized = normalizeLocalPart({
        type: 'image',
        image: {
            sourceType: 'base64',
            value: 'AAAABBBB'
        }
    });

    assert.equal(normalized, null);
});

test('data_url image source is parsed and mime type extracted', () => {
    const dataUrl = 'data:image/png;base64,aGVsbG8=';
    const normalized = normalizeLocalPart({
        type: 'image',
        image: {
            sourceType: 'data_url',
            value: dataUrl
        }
    });

    assert.deepEqual(normalized, {
        type: 'image',
        image: {
            sourceType: 'data_url',
            value: dataUrl,
            mimeType: 'image/png'
        }
    });
    assert.deepEqual(parseImageDataUrl(dataUrl), {
        mimeType: 'image/png',
        data: 'aGVsbG8='
    });
});

test('buildLocalMessageEnvelope normalizes legacy array and applies fallback system instruction', () => {
    const envelope = buildLocalMessageEnvelope([
        { role: 'user', content: 'hello' },
        { role: 'assistant', content: 'world' }
    ], {
        fallbackSystemInstruction: 'You are a helpful assistant.'
    });

    assert.equal(envelope.systemInstruction, 'You are a helpful assistant.');
    assert.equal(envelope.messages.length, 2);
    assert.equal(getLocalMessageText(envelope.messages[0]), 'hello');
    assert.equal(getLocalMessageText(envelope.messages[1]), 'world');
});

test('getLocalMessageText returns placeholder for image-only message', () => {
    const message = {
        role: 'user',
        parts: [{
            type: 'image',
            image: {
                sourceType: 'url',
                value: 'https://example.com/cat.png'
            }
        }]
    };

    assert.equal(getLocalMessageText(message), '');
    assert.equal(getLocalMessageText(message, { imagePlaceholder: '[image]' }), '[image]');
});
