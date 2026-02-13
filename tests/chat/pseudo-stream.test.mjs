import test from 'node:test';
import assert from 'node:assert/strict';

import { buildPseudoStreamChunks, runPseudoStream } from '../../js/chat/core/pseudo-stream.js';

test('buildPseudoStreamChunks keeps chunk order and full content', () => {
    const text = '第一句。第二句，第三句！';
    const chunks = buildPseudoStreamChunks(text);

    assert.ok(chunks.length > 1);
    assert.equal(chunks.join(''), text);
});

test('buildPseudoStreamChunks prefers punctuation boundaries', () => {
    const text = 'hello,world and more';
    const chunks = buildPseudoStreamChunks(text);

    assert.ok(chunks[0].endsWith(','));
});

test('runPseudoStream keeps partial content when interrupted', async () => {
    const controller = new AbortController();

    const result = await runPseudoStream({
        text: 'streaming response sample',
        signal: controller.signal,
        baseDelayMs: 1,
        onProgress: () => {
            controller.abort();
        }
    });

    assert.equal(result.interrupted, true);
    assert.ok(result.renderedText.length > 0);
    assert.ok(result.renderedText.length < 'streaming response sample'.length);
});
