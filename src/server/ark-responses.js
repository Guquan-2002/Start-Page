export function normalizeArkBaseUrl(apiUrl) {
    return apiUrl.endsWith('/responses')
        ? apiUrl.slice(0, -'/responses'.length)
        : apiUrl;
}

function toArkContentPart(part, role) {
    if (part.type === 'text') {
        if (!part.text) return null;
        return {
            type: role === 'assistant' ? 'output_text' : 'input_text',
            text: part.text
        };
    }

    if (
        role === 'user'
        && part.type === 'file'
        && part.mediaType.startsWith('image/')
        && part.url
    ) {
        return {
            type: 'input_image',
            image_url: part.url
        };
    }

    return null;
}

export function buildArkHistoryInput(uiMessages) {
    return uiMessages.flatMap((message) => {
        if (message.role !== 'user' && message.role !== 'assistant') {
            return [];
        }

        const content = message.parts
            .map((part) => toArkContentPart(part, message.role))
            .filter(Boolean);

        return content.length > 0
            ? [{ type: 'message', role: message.role, content }]
            : [];
    });
}

function getArkMetadata(message) {
    return message?.metadata?.ark;
}

export function prepareArkConversation(uiMessages, config) {
    const fallbackInput = buildArkHistoryInput(uiMessages);
    let assistantIndex = -1;

    for (let index = uiMessages.length - 1; index >= 0; index -= 1) {
        if (uiMessages[index].role === 'assistant') {
            assistantIndex = index;
            break;
        }
    }

    const metadata = assistantIndex >= 0
        ? getArkMetadata(uiMessages[assistantIndex])
        : null;
    const canContinue = Boolean(
        metadata?.responseId
        && metadata.model === config.model
        && metadata.apiUrl === config.apiUrl
        && assistantIndex < uiMessages.length - 1
    );

    return {
        messages: canContinue ? uiMessages.slice(assistantIndex + 1) : uiMessages,
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
    const normalized = input.flatMap((item) => {
        if (item.role !== 'user' && item.role !== 'assistant') return [item];

        const { id, phase, ...message } = item;
        return [{ type: 'message', ...message }];
    });

    return normalized.length > 0 || hasPreviousResponseId
        ? normalized
        : fallbackInput;
}

export function buildArkRequestBody(rawBody, { config, fallbackInput }) {
    const {
        include,
        input,
        instructions,
        previous_response_id: previousResponseId,
        reasoning,
        ...body
    } = rawBody;
    const useFullHistory = input.some((item) => item?.type === 'item_reference');

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
        body.thinking = { type: 'enabled' };
        body.reasoning = { effort: config.reasoning };
    }

    return body;
}

export function createArkFetch({ config, fallbackInput, fetchImpl = globalThis.fetch }) {
    return (input, init) => {
        const rawBody = JSON.parse(init.body);

        const requestBody = buildArkRequestBody(rawBody, { config, fallbackInput });
        return fetchImpl(input, {
            ...init,
            body: JSON.stringify(requestBody)
        });
    };
}
