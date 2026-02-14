import { parseImageDataUrl } from '../../core/local-message.js';

function asTrimmedString(value) {
    return typeof value === 'string' ? value.trim() : '';
}

function normalizeApiUrl(apiUrl) {
    const trimmed = asTrimmedString(apiUrl).replace(/\/+$/, '');
    return trimmed || null;
}

function buildEndpoint(baseUrl, model, stream) {
    const encodedModel = encodeURIComponent(model);
    if (stream) {
        return `${baseUrl}/models/${encodedModel}:streamGenerateContent?alt=sse`;
    }

    return `${baseUrl}/models/${encodedModel}:generateContent`;
}

function toGeminiPart(part) {
    if (part.type === 'text') {
        return {
            text: part.text
        };
    }

    if (part.type === 'image') {
        if (part.image.sourceType === 'data_url') {
            const parsedDataUrl = parseImageDataUrl(part.image.value);
            if (!parsedDataUrl) {
                throw new Error('Gemini image data_url must be a valid base64 data URL.');
            }

            return {
                inline_data: {
                    mime_type: parsedDataUrl.mimeType,
                    data: parsedDataUrl.data
                }
            };
        }

        if (part.image.sourceType === 'base64') {
            if (!part.image.mimeType) {
                throw new Error('Gemini base64 image part requires mimeType.');
            }

            return {
                inline_data: {
                    mime_type: part.image.mimeType,
                    data: part.image.value
                }
            };
        }

        if (part.image.sourceType === 'file_uri') {
            const fileData = {
                file_uri: part.image.value
            };

            if (part.image.mimeType) {
                fileData.mime_type = part.image.mimeType;
            }

            return {
                file_data: fileData
            };
        }

        throw new Error(`Gemini does not support image sourceType "${part.image.sourceType}".`);
    }

    return null;
}

export function buildGeminiGenerateContentRequest({
    config,
    envelope,
    stream = false,
    apiKey
}) {
    const baseUrl = normalizeApiUrl(config?.apiUrl);
    if (!baseUrl) {
        throw new Error('Gemini API URL is required.');
    }

    const body = {
        contents: envelope.messages.map((message) => ({
            role: message.role === 'assistant' ? 'model' : 'user',
            parts: message.parts
                .map((part) => toGeminiPart(part))
                .filter(Boolean)
        }))
    };

    if (envelope.systemInstruction) {
        body.systemInstruction = {
            parts: [{ text: envelope.systemInstruction }]
        };
    }

    if (config.searchMode === 'gemini_google_search') {
        body.tools = [{ google_search: {} }];
    }

    if (Number.isFinite(config.thinkingBudget) && config.thinkingBudget > 0) {
        body.generationConfig = {
            thinkingConfig: {
                thinkingBudget: config.thinkingBudget
            }
        };
    }

    return {
        endpoint: buildEndpoint(baseUrl, config.model, stream),
        headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey
        },
        body
    };
}
