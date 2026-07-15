const ARK_CONTEXT_ERROR_PATTERNS = [
    /previous_response/i,
    /item_reference/i,
    /item with id/i,
    /parameter `input`.*<nil>/i
];
const ARK_DISABLED_REASONING_VALUES = new Set(['disabled', 'off', 'none']);

function isObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function asText(value) {
    return typeof value === 'string' ? value : '';
}

export function normalizeArkBaseUrl(apiUrl) {
    return apiUrl.endsWith('/responses')
        ? apiUrl.slice(0, -'/responses'.length)
        : apiUrl;
}

function toArkContentPart(part, role) {
    if (!isObject(part)) return null;

    if (part.type === 'text') {
        const text = asText(part.text);
        if (!text) return null;
        return {
            type: role === 'assistant' ? 'output_text' : 'input_text',
            text
        };
    }

    if (
        role === 'user'
        && part.type === 'file'
        && asText(part.mediaType).startsWith('image/')
        && asText(part.url)
    ) {
        return {
            type: 'input_image',
            image_url: part.url
        };
    }

    return null;
}

export function buildArkHistoryInput(uiMessages) {
    if (!Array.isArray(uiMessages)) return [];

    return uiMessages.flatMap((message) => {
        if (!isObject(message) || (message.role !== 'user' && message.role !== 'assistant')) {
            return [];
        }

        const content = Array.isArray(message.parts)
            ? message.parts
                .map((part) => toArkContentPart(part, message.role))
                .filter(Boolean)
            : [];

        return content.length > 0
            ? [{ type: 'message', role: message.role, content }]
            : [];
    });
}

function getArkMetadata(message) {
    return isObject(message?.metadata?.ark) ? message.metadata.ark : null;
}

export function prepareArkConversation(uiMessages, config) {
    const allMessages = Array.isArray(uiMessages) ? uiMessages : [];
    const fallbackInput = buildArkHistoryInput(allMessages);
    let assistantIndex = -1;

    for (let index = allMessages.length - 1; index >= 0; index -= 1) {
        if (allMessages[index]?.role === 'assistant') {
            assistantIndex = index;
            break;
        }
    }

    const metadata = assistantIndex >= 0
        ? getArkMetadata(allMessages[assistantIndex])
        : null;
    const canContinue = Boolean(
        metadata?.responseId
        && metadata.model === config.model
        && metadata.apiUrl === config.apiUrl
        && assistantIndex < allMessages.length - 1
    );

    return {
        messages: canContinue ? allMessages.slice(assistantIndex + 1) : allMessages,
        previousResponseId: canContinue ? metadata.responseId : undefined,
        fallbackInput
    };
}

export function getArkMessageMetadata(part, config) {
    if (part?.type !== 'finish-step' || !part.response?.id) return undefined;

    return {
        ark: {
            responseId: part.response.id,
            model: config.model,
            apiUrl: config.apiUrl
        }
    };
}

function normalizeArkInput(input, fallbackInput, hasPreviousResponseId) {
    if (!Array.isArray(input)) return fallbackInput;
    if (input.some((item) => item?.type === 'item_reference')) return fallbackInput;

    const normalized = input.flatMap((item) => {
        if (!isObject(item)) return [];
        if (item.role !== 'user' && item.role !== 'assistant') return [item];

        const { id, phase, ...message } = item;
        return [{ type: 'message', ...message }];
    });

    return normalized.length > 0 || hasPreviousResponseId
        ? normalized
        : fallbackInput;
}

export function buildArkRequestBody(rawBody, { config, fallbackInput, forceFullHistory = false }) {
    const source = isObject(rawBody) ? rawBody : {};
    const {
        include,
        input,
        instructions,
        previous_response_id: previousResponseId,
        reasoning,
        ...body
    } = source;
    const useFullHistory = forceFullHistory
        || (Array.isArray(input) && input.some((item) => item?.type === 'item_reference'));

    body.input = useFullHistory
        ? fallbackInput
        : normalizeArkInput(input, fallbackInput, Boolean(previousResponseId));
    body.store = true;

    if (!useFullHistory && previousResponseId) {
        body.previous_response_id = previousResponseId;
    }
    if (config.systemPrompt) {
        body.instructions = config.systemPrompt;
    } else if (instructions) {
        body.instructions = instructions;
    }

    if (config.reasoning) {
        if (ARK_DISABLED_REASONING_VALUES.has(config.reasoning)) {
            body.thinking = { type: 'disabled' };
        } else {
            body.thinking = { type: 'enabled' };
            body.reasoning = { effort: config.reasoning };
        }
    }

    return body;
}

async function getResponseText(response) {
    try {
        return await response.clone().text();
    } catch {
        return '';
    }
}

function shouldRetryWithoutContext(response, text) {
    return (response.status === 400 || response.status === 404)
        && ARK_CONTEXT_ERROR_PATTERNS.some((pattern) => pattern.test(text));
}

export function createArkFetch({ config, fallbackInput, fetchImpl = globalThis.fetch }) {
    return async (input, init = {}) => {
        if (typeof init.body !== 'string') return fetchImpl(input, init);

        let rawBody;
        try {
            rawBody = JSON.parse(init.body);
        } catch {
            return fetchImpl(input, init);
        }

        const requestBody = buildArkRequestBody(rawBody, { config, fallbackInput });
        const response = await fetchImpl(input, {
            ...init,
            body: JSON.stringify(requestBody)
        });

        if (!requestBody.previous_response_id) return response;

        const errorText = await getResponseText(response);
        if (!shouldRetryWithoutContext(response, errorText)) return response;

        const fallbackBody = buildArkRequestBody(rawBody, {
            config,
            fallbackInput,
            forceFullHistory: true
        });
        return fetchImpl(input, {
            ...init,
            body: JSON.stringify(fallbackBody)
        });
    };
}
