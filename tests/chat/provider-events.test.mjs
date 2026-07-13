import test from 'node:test';
import assert from 'node:assert/strict';

import { PROVIDER_EVENT_TYPES, createPingEvent, createReasoningEvent, createTextDeltaEvent } from '../../js/chat/providers/provider-events.js';

test('PROVIDER_EVENT_TYPES are frozen and consistent', () => {
    assert.equal(PROVIDER_EVENT_TYPES.PING, 'ping');
    assert.equal(PROVIDER_EVENT_TYPES.REASONING, 'reasoning');
    assert.equal(PROVIDER_EVENT_TYPES.TEXT_DELTA, 'text-delta');
    assert.ok(Object.isFrozen(PROVIDER_EVENT_TYPES));
});

test('createPingEvent returns a ping event', () => {
    const event = createPingEvent();
    assert.deepEqual(event, { type: 'ping' });
});

test('createReasoningEvent returns a reasoning event', () => {
    const event = createReasoningEvent();
    assert.deepEqual(event, { type: 'reasoning' });
});

test('createTextDeltaEvent returns a text-delta event with text', () => {
    const event = createTextDeltaEvent('hello');
    assert.deepEqual(event, { type: 'text-delta', text: 'hello' });
});

test('createTextDeltaEvent handles empty string', () => {
    const event = createTextDeltaEvent('');
    assert.deepEqual(event, { type: 'text-delta', text: '' });
});
