import test from 'node:test';
import assert from 'node:assert/strict';

import {
    clearAllDrafts,
    createDraftManager,
    getDraft,
    loadDrafts,
    removeDraft,
    saveDrafts,
    setDraft
} from '../../js/chat/storage/draft-storage.js';

function createMemoryStorage() {
    const map = new Map();

    return {
        getItem(key) {
            return map.has(key) ? map.get(key) : null;
        },
        setItem(key, value) {
            map.set(key, String(value));
        },
        removeItem(key) {
            map.delete(key);
        }
    };
}

test('loadDrafts normalizes invalid payload', () => {
    const storage = createMemoryStorage();
    storage.setItem('llm_chat_drafts_v1', '{"version":999,"drafts":"bad"}');

    const drafts = loadDrafts(storage, 'llm_chat_drafts_v1');
    assert.equal(drafts.version, 1);
    assert.deepEqual(drafts.drafts, {});
});

test('set/get/remove draft works per session', () => {
    let payload = clearAllDrafts();

    payload = setDraft(payload, 'session_a', 'hello', 1700000000000);
    payload = setDraft(payload, 'session_b', 'world', 1700000001000);

    assert.equal(getDraft(payload, 'session_a'), 'hello');
    assert.equal(getDraft(payload, 'session_b'), 'world');

    payload = removeDraft(payload, 'session_a');
    assert.equal(getDraft(payload, 'session_a'), '');
    assert.equal(getDraft(payload, 'session_b'), 'world');

    payload = setDraft(payload, 'session_b', '   ', 1700000002000);
    assert.equal(getDraft(payload, 'session_b'), '');
});

test('createDraftManager persists updates and clear-all', () => {
    const storage = createMemoryStorage();
    const manager = createDraftManager({
        storage,
        storageKey: 'llm_chat_drafts_v1',
        now: () => 1700000003000
    });

    manager.setDraft('session_a', 'draft A');
    manager.setDraft('session_b', 'draft B');
    assert.equal(manager.getDraft('session_a'), 'draft A');

    manager.removeMany(['session_a']);
    assert.equal(manager.getDraft('session_a'), '');
    assert.equal(manager.getDraft('session_b'), 'draft B');

    manager.clearAllDrafts();
    assert.equal(manager.getDraft('session_b'), '');

    const persisted = loadDrafts(storage, 'llm_chat_drafts_v1');
    assert.deepEqual(persisted.drafts, {});

    saveDrafts(storage, 'llm_chat_drafts_v1', setDraft(clearAllDrafts(), 'session_x', 'x', 1));
    assert.equal(loadDrafts(storage, 'llm_chat_drafts_v1').drafts.session_x.text, 'x');
});
