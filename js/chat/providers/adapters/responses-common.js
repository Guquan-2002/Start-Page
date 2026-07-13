/**
 * Shared Responses API conversion helpers + response parsing.
 *
 * Extracted from openai-responses.js, ark-responses.js, openai-provider.js,
 * and ark-provider.js to eliminate near-identical code.
 */

// ---- Response parsing (used by openai-provider, ark-provider) ----

export function parseResponsesText(responseData) {
    const outputItems = Array.isArray(responseData?.output) ? responseData.output : [];
    return outputItems
        .flatMap((item) => (Array.isArray(item?.content) ? item.content : []))
        .filter((part) => part?.type === 'output_text' && typeof part.text === 'string')
        .map((part) => part.text)
        .join('');
}

export function parseResponsesStreamDelta(responseData) {
    return responseData?.type === 'response.output_text.delta'
        && typeof responseData.delta === 'string'
        ? responseData.delta
        : '';
}

export function isResponsesReasoningEvent(responseData) {
    const eventType = responseData?.type;
    return typeof eventType === 'string' && (
        eventType.includes('reasoning')
        || (eventType === 'response.output_item.added' && responseData?.item?.type === 'reasoning')
    );
}

// ---- Image conversion (used by openai-responses, ark-responses) ----

/**
 * Convert an image object to a Responses API image URL.
 *
 * @param {Object} image - The image object ({ sourceType, value, mimeType, detail }).
 * @param {string} providerName - Provider name for error messages (e.g. "OpenAI Responses").
 * @returns {string} The image URL string.
 * @throws {Error} If the image format is unsupported or missing required fields.
 */
function toResponsesImageUrl(image, providerName) {
    if (!image || typeof image !== 'object') {
        throw new Error(`${providerName} image part is invalid.`);
    }

    if (image.sourceType === 'url' || image.sourceType === 'data_url') {
        return image.value;
    }

    if (image.sourceType === 'base64') {
        if (!image.mimeType) {
            throw new Error(`${providerName} base64 image part requires mimeType.`);
        }

        return `data:${image.mimeType};base64,${image.value}`;
    }

    return '';
}

/**
 * Convert a local message part to a Responses API input content part.
 *
 * @param {Object} part - The local message part ({ type, text, image, ... }).
 * @param {string} role - Message role ('user' | 'assistant').
 * @param {string} providerName - Provider name for error messages (e.g. "OpenAI Responses").
 * @returns {Object|null} Responses API content part, or null if unsupported.
 * @throws {Error} If assistant messages contain image parts.
 */
export function toInputContentPart(part, role, providerName) {
    const normalizedRole = role === 'assistant' ? 'assistant' : 'user';

    if (part.type === 'text') {
        return {
            type: normalizedRole === 'assistant' ? 'output_text' : 'input_text',
            text: part.text
        };
    }

    if (part.type === 'image') {
        if (normalizedRole === 'assistant') {
            throw new Error(`${providerName} assistant message does not support image parts.`);
        }

        const contentPart = {
            type: 'input_image'
        };

        if (part.image.sourceType === 'file_id') {
            contentPart.file_id = part.image.value;
        } else {
            const imageUrl = toResponsesImageUrl(part.image, providerName);
            if (!imageUrl) {
                throw new Error(`${providerName} does not support image sourceType "${part.image.sourceType}".`);
            }
            contentPart.image_url = imageUrl;
        }

        if (part.image.detail) {
            contentPart.detail = part.image.detail;
        }

        return contentPart;
    }

    return null;
}
