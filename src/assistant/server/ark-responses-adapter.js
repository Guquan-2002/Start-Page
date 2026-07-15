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

export function prepareArkConversation(uiMessages, providerConfig) {
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
        && metadata.model === providerConfig.model
        && metadata.apiUrl === providerConfig.apiUrl
        && assistantIndex < uiMessages.length - 1
    );

    return {
        messages: canContinue ? uiMessages.slice(assistantIndex + 1) : uiMessages,
        previousResponseId: canContinue ? metadata.responseId : undefined,
        fallbackInput
    };
}

export function getArkMessageMetadata(part, providerConfig) {
    if (part?.type !== 'finish-step' || !part.response?.id) return undefined;

    return {
        ark: {
            responseId: part.response.id,
            model: providerConfig.model,
            apiUrl: providerConfig.apiUrl
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

export function buildArkRequestBody(rawRequestBody, { providerConfig, fallbackInput }) {
    const {
        include,
        input,
        instructions,
        previous_response_id: previousResponseId,
        reasoning,
        ...requestBody
    } = rawRequestBody;
    const useFullHistory = input.some((item) => item?.type === 'item_reference');

    requestBody.input = useFullHistory
        ? fallbackInput
        : normalizeArkInput(input, fallbackInput, Boolean(previousResponseId));
    requestBody.store = true;

    if (!useFullHistory && previousResponseId) {
        requestBody.previous_response_id = previousResponseId;
    }
    if (providerConfig.systemPrompt) {
        requestBody.instructions = providerConfig.systemPrompt;
    } else if (instructions) {
        requestBody.instructions = instructions;
    }

    if (providerConfig.reasoning) {
        requestBody.thinking = { type: 'enabled' };
        requestBody.reasoning = { effort: providerConfig.reasoning };
    }

    return requestBody;
}

export function createArkFetch({ providerConfig, fallbackInput, fetchImpl = globalThis.fetch }) {
    return (input, init) => {
        const rawRequestBody = JSON.parse(init.body);

        const requestBody = buildArkRequestBody(rawRequestBody, {
            providerConfig,
            fallbackInput
        });
        return fetchImpl(input, {
            ...init,
            body: JSON.stringify(requestBody)
        });
    };
}
