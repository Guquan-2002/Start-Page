import {
    ASSISTANT_SEGMENT_MARKER,
    ASSISTANT_SENTENCE_MARKER
} from '../constants.js';
import { normalizeLocalParts } from './local-message.js';
import { asTrimmedString, CJK_CHAR_REGEX } from '../../shared/string-utils.js';

const VALID_ROLES = new Set(['user', 'assistant']);
const VALID_DISPLAY_ROLES = new Set(['system', 'assistant', 'user', 'error']);
const MESSAGE_META_KEYS = new Set([
    'displayContent',
    'contextContent',
    'parts',
    'displayRole',
    'isPrefixMessage'
]);
const TEXT_PART_KEYS = new Set(['type', 'text']);
const IMAGE_PART_KEYS = new Set(['type', 'image']);
const IMAGE_KEYS = new Set(['sourceType', 'value', 'mimeType', 'detail']);

function hasOnlyKeys(value, allowedKeys) {
    return Object.keys(value).every((key) => allowedKeys.has(key));
}

function normalizeParts(parts) {
    if (!Array.isArray(parts)
        || parts.length === 0
        || parts.some((part) => {
            if (!part || typeof part !== 'object' || Array.isArray(part)) {
                return true;
            }
            if (part.type === 'text') {
                return !hasOnlyKeys(part, TEXT_PART_KEYS);
            }
            return part.type !== 'image'
                || !hasOnlyKeys(part, IMAGE_PART_KEYS)
                || !part.image
                || typeof part.image !== 'object'
                || Array.isArray(part.image)
                || !hasOnlyKeys(part.image, IMAGE_KEYS);
        })) {
        return null;
    }

    const normalized = normalizeLocalParts(parts);
    return normalized.length === parts.length ? normalized : null;
}

function buildMetaObject(source, content, onError) {
    if (!source || typeof source !== 'object' || Array.isArray(source) || !hasOnlyKeys(source, MESSAGE_META_KEYS)) {
        return onError('Chat message metaOptions contains unsupported fields.');
    }

    const meta = {};

    if (Object.hasOwn(source, 'displayContent')) {
        if (typeof source.displayContent !== 'string') {
            return onError('displayContent must be a string.');
        }
        if (source.displayContent && source.displayContent !== content) {
            meta.displayContent = source.displayContent;
        }
    }

    if (Object.hasOwn(source, 'contextContent')) {
        if (typeof source.contextContent !== 'string') {
            return onError('contextContent must be a string.');
        }
        const contextContent = source.contextContent.trim();
        if (contextContent && contextContent !== content) {
            meta.contextContent = contextContent;
        }
    }

    if (Object.hasOwn(source, 'parts')) {
        const parts = normalizeParts(source.parts);
        if (!parts) {
            return onError('Chat message parts are invalid.');
        }
        meta.parts = parts;
    }

    if (Object.hasOwn(source, 'displayRole')) {
        if (!VALID_DISPLAY_ROLES.has(source.displayRole)) {
            return onError('Chat message displayRole is invalid.');
        }
        meta.displayRole = source.displayRole;
    }

    if (source.isPrefixMessage === true) {
        meta.isPrefixMessage = true;
    }

    return meta;
}

function normalizeStoredMeta(rawMeta, content) {
    return buildMetaObject(rawMeta, content, () => null);
}

function createMessageMeta(content, options) {
    return buildMetaObject(options, content, (msg) => { throw new Error(msg); });
}

export function createEntityId(prefix) {
    if (globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function') {
        return `${prefix}_${globalThis.crypto.randomUUID()}`;
    }
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function createTurnId() {
    return createEntityId('turn');
}

export function estimateTokenCount(text) {
    const safeText = typeof text === 'string' ? text : '';
    const cjkChars = (safeText.match(new RegExp(CJK_CHAR_REGEX.source, 'g')) || []).length;
    return Math.ceil(cjkChars / 1.5 + (safeText.length - cjkChars) / 4);
}

export function splitAssistantMessageByMarker(text, {
    enableMarkerSplit = false
} = {}) {
    const rawText = typeof text === 'string' ? text : '';
    const fallback = rawText.trim() || '(No response text)';
    if (!enableMarkerSplit) {
        return [fallback];
    }

    const segments = rawText
        .split(ASSISTANT_SEGMENT_MARKER)
        .flatMap((segment) => segment.split(ASSISTANT_SENTENCE_MARKER))
        .map((segment) => segment.trim())
        .filter(Boolean);
    return segments.length > 0 ? segments : [fallback];
}

export function createChatMessage({
    role,
    content,
    turnId,
    id,
    metaOptions = {}
}) {
    if (!VALID_ROLES.has(role)) {
        throw new Error('Chat message role must be "user" or "assistant".');
    }

    const normalizedContent = asTrimmedString(content);
    if (!normalizedContent) {
        throw new Error('Chat message content cannot be empty.');
    }

    return {
        id: asTrimmedString(id) || createEntityId('msg'),
        turnId: asTrimmedString(turnId) || createTurnId(),
        role,
        content: normalizedContent,
        meta: createMessageMeta(normalizedContent, metaOptions)
    };
}

export function cloneChatMessage(message) {
    const meta = { ...message.meta };
    if (meta.parts) {
        meta.parts = meta.parts.map((part) => (
            part.type === 'image'
                ? { type: 'image', image: { ...part.image } }
                : { type: 'text', text: part.text }
        ));
    }

    return {
        id: message.id,
        turnId: message.turnId,
        role: message.role,
        content: message.content,
        meta
    };
}

export function getMessageDisplayContent(message) {
    return message.meta.displayContent || message.content;
}

export function getContextMessageContent(message) {
    return message.meta.contextContent || message.content;
}
