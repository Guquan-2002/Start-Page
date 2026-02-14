function asTrimmedString(value) {
    return typeof value === 'string' ? value.trim() : '';
}

function normalizeApiUrl(apiUrl) {
    const trimmed = asTrimmedString(apiUrl).replace(/\/+$/, '');
    return trimmed || null;
}

function buildEndpoint(baseUrl) {
    return baseUrl.endsWith('/responses') ? baseUrl : `${baseUrl}/responses`;
}

function toResponsesImageUrl(image) {
    if (!image || typeof image !== 'object') {
        throw new Error('OpenAI Responses image part is invalid.');
    }

    if (image.sourceType === 'url' || image.sourceType === 'data_url') {
        return image.value;
    }

    if (image.sourceType === 'base64') {
        if (!image.mimeType) {
            throw new Error('OpenAI Responses base64 image part requires mimeType.');
        }

        return `data:${image.mimeType};base64,${image.value}`;
    }

    return '';
}

function toInputContentPart(part) {
    if (part.type === 'text') {
        return {
            type: 'input_text',
            text: part.text
        };
    }

    if (part.type === 'image') {
        const contentPart = {
            type: 'input_image'
        };

        if (part.image.sourceType === 'file_id') {
            contentPart.file_id = part.image.value;
        } else {
            const imageUrl = toResponsesImageUrl(part.image);
            if (!imageUrl) {
                throw new Error(`OpenAI Responses does not support image sourceType "${part.image.sourceType}".`);
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

export function buildOpenAiResponsesRequest({
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
    const input = envelope.messages.map((message) => ({
        type: 'message',
        role: message.role === 'assistant' ? 'assistant' : 'user',
        content: message.parts
            .map((part) => toInputContentPart(part))
            .filter(Boolean)
    }));

    const body = {
        model: config.model,
        input,
        stream
    };

    if (envelope.systemInstruction) {
        body.instructions = envelope.systemInstruction;
    }

    if (typeof config?.thinkingBudget === 'string' && config.thinkingBudget) {
        body.reasoning = {
            effort: config.thinkingBudget
        };
    }

    if (typeof config?.searchMode === 'string' && config.searchMode.startsWith('openai_web_search_')) {
        const contextSize = config.searchMode.replace('openai_web_search_', '');
        body.tools = [{
            type: 'web_search_preview',
            search_context_size: contextSize
        }];
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
