/**
 * DeepSeek Chat Completions API adapter.
 *
 * DeepSeek is OpenAI-compatible for message shape and endpoint routing, but
 * its reasoning controls use a `thinking` object plus high/max effort values.
 */
import { buildOpenAiChatCompletionsRequest } from './openai-chat-completions.js';

const DEEPSEEK_REASONING_EFFORTS = new Set(['high', 'max']);

function normalizeThinkingBudget(value) {
    return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

export function buildDeepSeekChatCompletionsRequest(options) {
    const request = buildOpenAiChatCompletionsRequest(options);
    const thinkingBudget = normalizeThinkingBudget(options?.config?.thinkingBudget);

    delete request.body.reasoning_effort;

    if (thinkingBudget === 'disabled') {
        request.body.thinking = { type: 'disabled' };
        return request;
    }

    if (DEEPSEEK_REASONING_EFFORTS.has(thinkingBudget)) {
        request.body.thinking = { type: 'enabled' };
        request.body.reasoning_effort = thinkingBudget;
    }

    return request;
}
