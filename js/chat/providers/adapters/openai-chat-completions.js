// OpenAI Chat Completions adapter: builds chat/completions payloads from local messages.
function asTrimmedString(value) {
    return typeof value === 'string' ? value.trim() : '';
}

function normalizeApiUrl(apiUrl) {
    const trimmed = asTrimmedString(apiUrl).replace(/\/+$/, '');
    return trimmed || null;
}

function buildEndpoint(baseUrl) {
    return baseUrl.endsWith('/chat/completions') ? baseUrl : `${baseUrl}/chat/completions`;
}

function ensureImageUrlValue(image) {
    if (!image || typeof image !== 'object') {
        throw new Error('OpenAI chat image part is invalid.');
    }

    if (image.sourceType === 'url' || image.sourceType === 'data_url') {
        return image.value;
    }

    if (image.sourceType === 'base64') {
        if (!image.mimeType) {
            throw new Error('OpenAI chat base64 image part requires mimeType.');
        }

        return `data:${image.mimeType};base64,${image.value}`;
    }

    throw new Error(`OpenAI chat does not support image sourceType "${image.sourceType}".`);
}

function toOpenAiContentPart(part) {
    if (part.type === 'text') {
        return {
            type: 'text',
            text: part.text
        };
    }

    if (part.type === 'image') {
        const imageUrl = {
            url: ensureImageUrlValue(part.image)
        };
        if (part.image.detail) {
            imageUrl.detail = part.image.detail;
        }

        return {
            type: 'image_url',
            image_url: imageUrl
        };
    }

    return null;
}

function toOpenAiMessageContent(parts) {
    const mappedParts = parts
        .map((part) => toOpenAiContentPart(part))
        .filter(Boolean);

    if (mappedParts.length === 0) {
        return '';
    }

    const hasImagePart = mappedParts.some((part) => part.type === 'image_url');
    if (!hasImagePart) {
        return mappedParts.map((part) => part.text).join('\n\n');
    }

    return mappedParts;
}

export function buildOpenAiChatCompletionsRequest({
    config,
    envelope,
    stream = false,
    apiKey
}) {
    const baseUrl = normalizeApiUrl(config?.apiUrl);
    if (!baseUrl) {
        throw new Error('OpenAI API URL is required.');
    }

    const endpoint = buildEndpoint(baseUrl);
    const messages = [];

    if (envelope.systemInstruction) {
        messages.push({
            role: 'system',
            content: envelope.systemInstruction
        });
    }

    envelope.messages.forEach((message) => {
        messages.push({
            role: message.role === 'assistant' ? 'assistant' : 'user',
            content: toOpenAiMessageContent(message.parts)
        });
    });

    const body = {
        model: config.model,
        messages,
        stream
    };

    if (typeof config?.thinkingBudget === 'string' && config.thinkingBudget) {
        body.reasoning_effort = config.thinkingBudget;
    }

    if (typeof config?.searchMode === 'string' && config.searchMode.startsWith('openai_web_search_')) {
        const contextSize = config.searchMode.replace('openai_web_search_', '');
        body.web_search_options = {
            search_context_size: contextSize
        };
    }

    return {
        endpoint,
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`
        },
        body
    };
}
