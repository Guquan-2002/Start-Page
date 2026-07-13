import test from 'node:test';
import assert from 'node:assert/strict';

import {
    getLocalMessageText,
    normalizeLocalPart,
    normalizeLocalParts,
    parseImageDataUrl
} from '../../js/chat/core/local-message.js';

test('normalizeLocalParts keeps text+image parts and normalizes image detail', () => {
    const normalized = normalizeLocalParts([
        { type: 'text', text: 'look at this' },
        {
            type: 'image',
            image: {
                sourceType: 'url',
                value: 'https://example.com/cat.png',
                detail: 'HIGH'
            }
        }
    ]);

    assert.deepEqual(normalized[0], {
        type: 'text',
        text: 'look at this'
    });
    assert.deepEqual(normalized[1], {
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
