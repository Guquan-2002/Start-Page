// Local message normalization: converts mixed text/image payloads into a consistent shape.
const LOCAL_MESSAGE_ROLES = new Set(['user', 'assistant']);
const LOCAL_PART_TYPES = new Set(['text', 'image']);
const IMAGE_SOURCE_TYPES = new Set(['url', 'data_url', 'base64', 'file_uri', 'file_id']);
const IMAGE_DETAIL_LEVELS = new Set(['low', 'high', 'auto']);

function asTrimmedString(value) {
    return typeof value === 'string' ? value.trim() : '';
}

function normalizeImageDetail(value) {
    const normalized = asTrimmedString(value).toLowerCase();
    return IMAGE_DETAIL_LEVELS.has(normalized) ? normalized : '';
}

function parseDataUrl(value) {
    const raw = asTrimmedString(value);
    const match = /^data:([^;,]+);base64,(.+)$/i.exec(raw);
    if (!match) {
        return null;
    }

    return {
        mimeType: match[1].trim().toLowerCase(),
        data: match[2].trim()
    };
}

function normalizeTextPart(part) {
    const text = typeof part?.text === 'string'
        ? part.text
        : typeof part?.content === 'string'
            ? part.content
            : '';
    if (!text.trim()) {
        return null;
    }

    return {
        type: 'text',
        text
    };
}

function normalizeImagePart(part) {
    const rawImage = part?.image && typeof part.image === 'object' ? part.image : part;
    const sourceType = asTrimmedString(rawImage?.sourceType).toLowerCase();
    if (!IMAGE_SOURCE_TYPES.has(sourceType)) {
        return null;
    }

    const value = asTrimmedString(rawImage?.value);
    if (!value) {
        return null;
    }

    const detail = normalizeImageDetail(rawImage?.detail);
    const normalized = {
        type: 'image',
        image: {
            sourceType,
            value
        }
    };

    if (sourceType === 'data_url') {
        const parsedDataUrl = parseDataUrl(value);
        if (!parsedDataUrl) {
            return null;
        }

        normalized.image.mimeType = parsedDataUrl.mimeType;
    } else if (sourceType === 'base64') {
        const mimeType = asTrimmedString(rawImage?.mimeType).toLowerCase();
        if (!mimeType) {
            return null;
        }

        normalized.image.mimeType = mimeType;
    } else {
        const mimeType = asTrimmedString(rawImage?.mimeType).toLowerCase();
        if (mimeType) {
            normalized.image.mimeType = mimeType;
        }
    }

    if (detail) {
        normalized.image.detail = detail;
    }

    return normalized;
}

export function normalizeLocalPart(part) {
    if (!part || typeof part !== 'object') {
        return null;
    }

    const partType = asTrimmedString(part.type).toLowerCase();
    if (!LOCAL_PART_TYPES.has(partType)) {
        return null;
    }

    if (partType === 'text') {
        return normalizeTextPart(part);
    }

    return normalizeImagePart(part);
}

export function normalizeLocalParts(parts) {
    if (!Array.isArray(parts)) {
        return [];
    }

    return parts
        .map((part) => normalizeLocalPart(part))
        .filter(Boolean);
}

function normalizeRole(role) {
    const normalized = asTrimmedString(role).toLowerCase();
    return LOCAL_MESSAGE_ROLES.has(normalized) ? normalized : '';
}

function extractLegacyText(rawMessage) {
    if (typeof rawMessage?.content === 'string' && rawMessage.content.trim()) {
        return rawMessage.content;
    }

    if (typeof rawMessage?.text === 'string' && rawMessage.text.trim()) {
        return rawMessage.text;
    }

    return '';
}

export function normalizeLocalMessage(rawMessage) {
    if (!rawMessage || typeof rawMessage !== 'object') {
        return null;
    }

    const role = normalizeRole(rawMessage.role);
    if (!role) {
        return null;
    }

    let parts = normalizeLocalParts(rawMessage.parts);
    if (parts.length === 0) {
        const legacyText = extractLegacyText(rawMessage);
        if (legacyText) {
            parts = [{
                type: 'text',
                text: legacyText
            }];
        }
    }

    if (parts.length === 0) {
        return null;
    }

    const normalized = {
        role,
        parts
    };

    const turnId = asTrimmedString(rawMessage.turnId);
    if (turnId) {
        normalized.turnId = turnId;
    }

    if (rawMessage.meta && typeof rawMessage.meta === 'object') {
        normalized.meta = { ...rawMessage.meta };
    }

    return normalized;
}

export function normalizeLocalMessages(messages) {
    if (!Array.isArray(messages)) {
        return [];
    }

    return messages
        .map((message) => normalizeLocalMessage(message))
        .filter(Boolean);
}

export function buildLocalMessageEnvelope(rawEnvelope, {
    fallbackSystemInstruction = ''
} = {}) {
    const envelopeCandidate = rawEnvelope && typeof rawEnvelope === 'object' && !Array.isArray(rawEnvelope)
        ? rawEnvelope
        : { messages: rawEnvelope };
    const rawMessages = Array.isArray(envelopeCandidate.messages)
        ? envelopeCandidate.messages
        : Array.isArray(envelopeCandidate.contextMessages)
            ? envelopeCandidate.contextMessages
            : [];

    const normalizedSystemInstruction = typeof envelopeCandidate.systemInstruction === 'string'
        ? envelopeCandidate.systemInstruction.trim()
        : asTrimmedString(fallbackSystemInstruction);

    return {
        systemInstruction: normalizedSystemInstruction,
        messages: normalizeLocalMessages(rawMessages)
    };
}

export function getLocalMessageText(message, {
    imagePlaceholder = ''
} = {}) {
    const normalizedMessage = normalizeLocalMessage(message);
    if (!normalizedMessage) {
        return '';
    }

    const text = normalizedMessage.parts
        .map((part) => (part.type === 'text' ? part.text : ''))
        .filter((partText) => partText.trim())
        .join('\n\n');

    if (text) {
        return text;
    }

    if (!imagePlaceholder) {
        return '';
    }

    const hasImage = normalizedMessage.parts.some((part) => part.type === 'image');
    return hasImage ? imagePlaceholder : '';
}

export function hasImageParts(message) {
    const normalizedMessage = normalizeLocalMessage(message);
    if (!normalizedMessage) {
        return false;
    }

    return normalizedMessage.parts.some((part) => part.type === 'image');
}

export function parseImageDataUrl(value) {
    return parseDataUrl(value);
}
