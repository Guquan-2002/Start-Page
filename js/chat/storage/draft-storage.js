// Handles per-session draft persistence with schema checks and cleanup helpers.
import { CHAT_DRAFTS_KEY } from '../constants.js';
import { safeGetJson, safeSetJson } from '../../shared/safe-storage.js';

const DRAFT_SCHEMA_VERSION = 1;

function createEmptyDrafts() {
    return {
        version: DRAFT_SCHEMA_VERSION,
        drafts: {}
    };
}

function asTrimmedString(value) {
    return typeof value === 'string' ? value.trim() : '';
}

function normalizeDraftEntry(rawEntry) {
    if (!rawEntry || typeof rawEntry !== 'object') {
        return null;
    }

    const text = typeof rawEntry.text === 'string' ? rawEntry.text : '';
    if (!text.trim()) {
        return null;
    }

    const updatedAt = Number.isFinite(rawEntry.updatedAt) && rawEntry.updatedAt > 0
        ? rawEntry.updatedAt
        : Date.now();

    return {
        text,
        updatedAt
    };
}

function normalizeDraftPayload(rawPayload) {
    if (!rawPayload || typeof rawPayload !== 'object') {
        return createEmptyDrafts();
    }

    if (rawPayload.version !== DRAFT_SCHEMA_VERSION) {
        return createEmptyDrafts();
    }

    if (!rawPayload.drafts || typeof rawPayload.drafts !== 'object') {
        return createEmptyDrafts();
    }

    const drafts = Object.fromEntries(
        Object.entries(rawPayload.drafts)
            .map(([sessionId, entry]) => {
                const normalizedSessionId = asTrimmedString(sessionId);
                if (!normalizedSessionId) {
                    return null;
                }

                const normalizedEntry = normalizeDraftEntry(entry);
                if (!normalizedEntry) {
                    return null;
                }

                return [normalizedSessionId, normalizedEntry];
            })
            .filter(Boolean)
    );

    return {
        version: DRAFT_SCHEMA_VERSION,
        drafts
    };
}

export function loadDrafts(storage, storageKey = CHAT_DRAFTS_KEY) {
    const rawPayload = safeGetJson(storageKey, createEmptyDrafts(), storage);
    return normalizeDraftPayload(rawPayload);
}

export function saveDrafts(storage, storageKey = CHAT_DRAFTS_KEY, payload = createEmptyDrafts()) {
    return safeSetJson(storageKey, normalizeDraftPayload(payload), storage);
}

export function getDraft(payload, sessionId) {
    const normalizedPayload = normalizeDraftPayload(payload);
    const normalizedSessionId = asTrimmedString(sessionId);
    if (!normalizedSessionId) {
        return '';
    }

    return normalizedPayload.drafts[normalizedSessionId]?.text || '';
}

export function setDraft(payload, sessionId, text, updatedAt = Date.now()) {
    const normalizedPayload = normalizeDraftPayload(payload);
    const normalizedSessionId = asTrimmedString(sessionId);
    if (!normalizedSessionId) {
        return normalizedPayload;
    }

    const nextPayload = {
        ...normalizedPayload,
        drafts: { ...normalizedPayload.drafts }
    };

    if (typeof text !== 'string' || !text.trim()) {
        delete nextPayload.drafts[normalizedSessionId];
        return nextPayload;
    }

    nextPayload.drafts[normalizedSessionId] = {
        text,
        updatedAt: Number.isFinite(updatedAt) && updatedAt > 0 ? updatedAt : Date.now()
    };

    return nextPayload;
}

export function removeDraft(payload, sessionId) {
    return setDraft(payload, sessionId, '');
}

export function clearAllDrafts() {
    return createEmptyDrafts();
}

export function createDraftManager({
    storage = null,
    storageKey = CHAT_DRAFTS_KEY,
    now = () => Date.now()
} = {}) {
    let payload = loadDrafts(storage, storageKey);

    function persist() {
        saveDrafts(storage, storageKey, payload);
    }

    function getDraftBySession(sessionId) {
        return getDraft(payload, sessionId);
    }

    function setDraftBySession(sessionId, text) {
        payload = setDraft(payload, sessionId, text, now());
        persist();
    }

    function removeDraftBySession(sessionId) {
        payload = removeDraft(payload, sessionId);
        persist();
    }

    function clearAll() {
        payload = clearAllDrafts();
        persist();
    }

    function removeMany(sessionIds) {
        if (!Array.isArray(sessionIds) || sessionIds.length === 0) {
            return;
        }

        let nextPayload = payload;
        sessionIds.forEach((sessionId) => {
            nextPayload = removeDraft(nextPayload, sessionId);
        });
        payload = nextPayload;
        persist();
    }

    function getSnapshot() {
        return payload;
    }

    return {
        getDraft: getDraftBySession,
        setDraft: setDraftBySession,
        removeDraft: removeDraftBySession,
        removeMany,
        clearAllDrafts: clearAll,
        getSnapshot
    };
}

