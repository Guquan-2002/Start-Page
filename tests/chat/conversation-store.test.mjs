import test from 'node:test';
import assert from 'node:assert/strict';

import { createConversationStore } from '../../js/chat/session/conversation-store.js';
import { createChatMessage } from '../../js/chat/core/message-model.js';

function appendTurn(store, turnId, userText, assistantText = '') {
    const messages = [createChatMessage({ role: 'user', content: userText, turnId })];

    if (assistantText) {
        messages.push(createChatMessage({ role: 'assistant', content: assistantText, turnId }));
    }

    store.appendMessages(messages);
}

test('conversation store starts empty with a stable conversation id', () => {
    const store = createConversationStore();

    assert.ok(typeof store.getConversationId() === 'string' && store.getConversationId().length > 0);
    assert.equal(store.getActiveMessages().length, 0);
});

test('appendMessages stores messages and getActiveMessages returns the live list', () => {
    const store = createConversationStore();

    appendTurn(store, 'turn1', 'u1', 'a1');
    appendTurn(store, 'turn2', 'u2', 'a2');

    assert.deepEqual(
        store.getActiveMessages().map((message) => message.content),
        ['u1', 'a1', 'u2', 'a2']
    );
});

test('appendMessages clones messages so external mutation is isolated', () => {
    const store = createConversationStore();
    const message = createChatMessage({ role: 'user', content: 'original', turnId: 't' });

    store.appendMessages([message]);
    message.content = 'mutated';

    assert.equal(store.getActiveMessages()[0].content, 'original');
});

test('rollbackToTurn removes target turn and all following messages', () => {
    const store = createConversationStore();

    appendTurn(store, 'turn1', 'u1', 'a1');
    appendTurn(store, 'turn2', 'u2', 'a2');
    appendTurn(store, 'turn3', 'u3', 'a3');

    const rollbackResult = store.rollbackToTurn('turn2');

    assert.ok(rollbackResult);
    assert.equal(rollbackResult.retryContent, 'u2');
    assert.deepEqual(
        store.getActiveMessages().map((message) => message.content),
        ['u1', 'a1']
    );
});

test('rollbackToTurn ignores unknown turn ids', () => {
    const store = createConversationStore();
    appendTurn(store, 'turn1', 'u1', 'a1');

    assert.equal(store.rollbackToTurn('nope'), null);
    assert.equal(store.getActiveMessages().length, 2);
});

test('clearConversation resets messages and issues a new conversation id', () => {
    const store = createConversationStore();
    const initialId = store.getConversationId();

    appendTurn(store, 'turn1', 'u1', 'a1');
    assert.equal(store.getActiveMessages().length, 2);

    store.clearConversation();

    assert.notEqual(store.getConversationId(), initialId);
    assert.equal(store.getActiveMessages().length, 0);
});

test('streaming state transitions remain valid for orchestration flow', () => {
    const store = createConversationStore();
    const controller = new AbortController();

    store.startStreaming(controller);

    assert.equal(store.isStreaming(), true);
    assert.equal(controller.signal.aborted, false);

    const aborted = store.requestAbort('user');
    assert.equal(aborted, true);
    assert.equal(controller.signal.aborted, true);
    assert.equal(store.getAbortReason(), 'user');

    store.finishStreaming();
    assert.equal(store.isStreaming(), false);
    assert.equal(store.requestAbort('user'), false);
});

test('requestAbort records timeout reason and aborts the active request directly', () => {
    const store = createConversationStore();
    const controller = new AbortController();

    store.startStreaming(controller);

    assert.equal(store.requestAbort('connect_timeout'), true);
    assert.equal(controller.signal.aborted, true);
    assert.equal(store.getAbortReason(), 'connect_timeout');
});

test('appendMessages ignores non-array or empty input', () => {
    const store = createConversationStore();

    store.appendMessages(null);
    store.appendMessages([]);
    assert.equal(store.getActiveMessages().length, 0);
});
