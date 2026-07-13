/**
 * Volcengine Ark Responses API adapter.
 * Converts normalized local messages into Ark Responses request payload.
 */

import { normalizeApiUrl } from '../../../shared/string-utils.js';
import { toInputContentPart } from './responses-common.js';
import { resolveResponsesEndpoint } from '../endpoint-resolver.js';

const ARK_THINKING_LEVELS = new Set(['minimal', 'low', 'medium', 'high']);

export function buildArkResponsesRequest({
    config,
    envelope,
    stream = false,
    apiKey
}) {
    const baseUrl = normalizeApiUrl(config?.apiUrl);
    if (!baseUrl) {
        throw new Error('Ark API URL is required.');
    }

    const endpoint = resolveResponsesEndpoint(baseUrl);
    const input = envelope.messages.map((message) => {
        const role = message.role === 'assistant' ? 'assistant' : 'user';
        const item = {
            type: 'message',
            role,
            content: message.parts
                .map((part) => toInputContentPart(part, role, 'Ark'))
                .filter(Boolean)
        };
        if (role === 'assistant') {
            item.status = 'completed';
        }
        return item;
    });

    const body = {
        model: config.model,
        input,
        stream
    };

    if (envelope.systemInstruction) {
        body.instructions = envelope.systemInstruction;
    }

    const thinkingBudget = typeof config?.thinkingBudget === 'string'
        ? config.thinkingBudget.trim().toLowerCase()
        : '';
    if (ARK_THINKING_LEVELS.has(thinkingBudget)) {
        body.thinking = {
            type: 'enabled'
        };
        body.reasoning = {
            effort: thinkingBudget
        };
    }

    if (config.searchEnabled === true) {
        body.tools = [{ type: 'web_search' }];
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
