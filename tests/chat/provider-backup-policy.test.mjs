import test from 'node:test';
import assert from 'node:assert/strict';

import { createAnthropicProvider } from '../../js/chat/providers/vendors/anthropic-provider.js';
import { createArkProvider } from '../../js/chat/providers/vendors/ark-provider.js';
import { createGeminiProvider } from '../../js/chat/providers/vendors/gemini-provider.js';
import {
    createDeepSeekProvider,
    createOpenAiProvider,
    createOpenAiResponsesProvider
} from '../../js/chat/providers/vendors/openai-provider.js';

const envelope = {
    systemInstruction: 'System',
    messages: [{
        role: 'user',
        parts: [{ type: 'text', text: 'hello' }]
    }]
};

const cases = [
    {
        name: 'Gemini',
        createProvider: createGeminiProvider,
        config: {
            provider: 'gemini',
            apiUrl: 'https://example.com/v1beta',
            model: 'gemini-test',
            thinkingLevel: '',
            searchEnabled: false
        }
    },
    {
        name: 'OpenAI Chat Completions',
        createProvider: createOpenAiProvider,
        config: {
            provider: 'openai',
            apiUrl: 'https://example.com/v1',
            model: 'gpt-test',
            thinkingBudget: '',
            searchEnabled: false
        }
    },
    {
        name: 'OpenAI Responses',
        createProvider: createOpenAiResponsesProvider,
        config: {
            provider: 'openai_responses',
            apiUrl: 'https://example.com/v1',
            model: 'gpt-test',
            thinkingBudget: '',
            searchEnabled: false
        }
    },
    {
        name: 'DeepSeek',
        createProvider: createDeepSeekProvider,
        config: {
            provider: 'deepseek',
            apiUrl: 'https://example.com',
            model: 'deepseek-test',
            thinkingBudget: 'disabled',
            searchEnabled: false
        }
    },
    {
        name: 'Ark',
        createProvider: createArkProvider,
        config: {
            provider: 'ark_responses',
            apiUrl: 'https://example.com/responses',
            model: 'ark-test',
            thinkingBudget: 'none',
            searchEnabled: false
        }
    },
    {
        name: 'Anthropic',
        createProvider: createAnthropicProvider,
        config: {
            provider: 'anthropic',
            apiUrl: 'https://example.com/v1',
            model: 'claude-test',
            thinkingEffort: 'none',
            searchEnabled: false
        }
    }
];

for (const providerCase of cases) {
    test(`${providerCase.name} does not switch keys for HTTP 400`, async () => {
        let requestCount = 0;
        let fallbackNoticeCount = 0;
        const provider = providerCase.createProvider({
            fetchImpl: async () => {
                requestCount += 1;
                return new Response('invalid request', { status: 400 });
            },
            maxRetries: 0
        });

        await assert.rejects(provider.generate({
            config: {
                ...providerCase.config,
                apiKey: 'primary',
                backupApiKey: 'backup',
                systemPrompt: 'System',
            },
            localMessageEnvelope: envelope,
            signal: new AbortController().signal,
            onFallbackKey: () => {
                fallbackNoticeCount += 1;
            }
        }), (error) => error.status === 400);

        assert.equal(requestCount, 1);
        assert.equal(fallbackNoticeCount, 0);
    });

    test(`${providerCase.name} does not switch keys for malformed success JSON`, async () => {
        let requestCount = 0;
        const provider = providerCase.createProvider({
            fetchImpl: async () => {
                requestCount += 1;
                return new Response('{bad json', { status: 200 });
            },
            maxRetries: 0
        });

        await assert.rejects(provider.generate({
            config: {
                ...providerCase.config,
                apiKey: 'primary',
                backupApiKey: 'backup',
                systemPrompt: 'System',
            },
            localMessageEnvelope: envelope,
            signal: new AbortController().signal
        }), SyntaxError);

        assert.equal(requestCount, 1);
    });
}
