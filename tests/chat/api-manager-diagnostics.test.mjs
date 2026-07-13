import test from 'node:test';
import assert from 'node:assert/strict';

import {
    buildRequestDiagnosticDetail
} from '../../js/chat/app/request-diagnostics.js';

test('buildRequestDiagnosticDetail includes endpoint/streaming/timeout/error', () => {
    const detail = buildRequestDiagnosticDetail(
        {
            provider: 'openai_responses',
            apiUrl: 'https://api.openai.com/v1',
            searchEnabled: true
        },
        {
            useStreaming: true,
            timeoutMs: 500,
            errorDetail: 'HTTP 400'
        }
    );

    assert.equal(detail.includes('Provider=openai_responses'), true);
    assert.equal(detail.includes('Endpoint=https://api.openai.com/v1/responses'), true);
    assert.equal(detail.includes('Search=enabled'), true);
    assert.equal(detail.includes('Streaming=true'), true);
    assert.equal(detail.includes('TimeoutMs=500'), true);
    assert.equal(detail.includes('Error=HTTP 400'), true);
});
