import test from 'node:test';
import assert from 'node:assert/strict';

import {
    getApiKeys,
    postJsonWithRetry,
    readErrorDetail,
    readSseJsonEvents
} from '../../js/chat/providers/http.js';

function createRequest() {
    return {
        endpoint: 'https://example.com/chat',
        headers: { Authorization: 'Bearer key' },
        body: { message: 'hello' }
    };
}

async function collect(stream) {
    const events = [];
    for await (const event of stream) {
        events.push(event);
    }
    return events;
}

test('getApiKeys returns trimmed primary and backup keys', () => {
    assert.deepEqual(getApiKeys({ apiKey: ' primary ', backupApiKey: ' backup ' }), [
        'primary',
        'backup'
    ]);
});

test('readErrorDetail reads JSON and plain text bodies once', async () => {
    assert.equal(
        await readErrorDetail(new Response(JSON.stringify({ error: { message: 'bad key' } }))),
        'bad key'
    );
    assert.equal(await readErrorDetail(new Response('plain failure')), 'plain failure');
});

test('postJsonWithRetry retries transient responses and preserves request options', async () => {
    const calls = [];
    const retryNotices = [];
    const fetchImpl = async (url, options) => {
        calls.push({ url, options });
        return calls.length === 1
            ? new Response('busy', { status: 503 })
            : new Response('{}', { status: 200 });
    };

    const response = await postJsonWithRetry(fetchImpl, createRequest(), {
        signal: new AbortController().signal,
        maxRetries: 1,
        maxRetryDelayMs: 0,
        onRetryNotice: (...args) => retryNotices.push(args)
    });

    assert.equal(response.status, 200);
    assert.equal(calls.length, 2);
    assert.equal(calls[0].url, 'https://example.com/chat');
    assert.equal(calls[0].options.method, 'POST');
    assert.equal(calls[0].options.body, JSON.stringify({ message: 'hello' }));
    assert.deepEqual(retryNotices, [[1, 1, 0]]);
});

test('postJsonWithRetry does not retry non-transient HTTP errors', async () => {
    let callCount = 0;
    const fetchImpl = async () => {
        callCount += 1;
        return new Response('invalid request', { status: 400 });
    };

    await assert.rejects(
        postJsonWithRetry(fetchImpl, createRequest(), {
            signal: new AbortController().signal,
            maxRetries: 3,
            maxRetryDelayMs: 0
        }),
        (error) => error.status === 400 && error.message.includes('invalid request')
    );
    assert.equal(callCount, 1);
});

test('readSseJsonEvents handles CRLF, chunk boundaries, and a final event without delimiter', async () => {
    const encoder = new TextEncoder();
    const body = new ReadableStream({
        start(controller) {
            controller.enqueue(encoder.encode('data: {"index":1}\r\n\r'));
            controller.enqueue(encoder.encode('\ndata: {"index":2}'));
            controller.close();
        }
    });

    const events = await collect(readSseJsonEvents(
        new Response(body),
        new AbortController().signal
    ));
    assert.deepEqual(events, [{ index: 1 }, { index: 2 }]);
});

test('readSseJsonEvents stops at DONE and rejects malformed JSON', async () => {
    const encoder = new TextEncoder();
    const doneBody = new ReadableStream({
        start(controller) {
            controller.enqueue(encoder.encode(
                'data: {"index":1}\n\ndata: [DONE]\n\ndata: {"index":2}\n\n'
            ));
            controller.close();
        }
    });
    assert.deepEqual(
        await collect(readSseJsonEvents(new Response(doneBody), new AbortController().signal)),
        [{ index: 1 }]
    );

    const malformedBody = new ReadableStream({
        start(controller) {
            controller.enqueue(encoder.encode('data: {bad json}\n\n'));
            controller.close();
        }
    });
    await assert.rejects(
        collect(readSseJsonEvents(new Response(malformedBody), new AbortController().signal)),
        SyntaxError
    );
});

test('readSseJsonEvents rejects an already aborted stream', async () => {
    const controller = new AbortController();
    controller.abort();

    await assert.rejects(
        collect(readSseJsonEvents(new Response('data: {}\n\n'), controller.signal)),
        (error) => error.name === 'AbortError'
    );
});
