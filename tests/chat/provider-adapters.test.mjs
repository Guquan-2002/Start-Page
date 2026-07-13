import test from 'node:test';
import assert from 'node:assert/strict';

import { CHAT_PROVIDER_IDS } from '../../js/chat/providers/provider-registry.js';
import { buildAnthropicMessagesRequest } from '../../js/chat/providers/adapters/anthropic-messages.js';
import { buildArkResponsesRequest } from '../../js/chat/providers/adapters/ark-responses.js';
import { buildDeepSeekChatCompletionsRequest } from '../../js/chat/providers/adapters/deepseek-chat-completions.js';
import { buildGeminiGenerateContentRequest } from '../../js/chat/providers/adapters/gemini-generate-content.js';
import { buildOpenAiChatCompletionsRequest } from '../../js/chat/providers/adapters/openai-chat-completions.js';
import { buildOpenAiResponsesRequest } from '../../js/chat/providers/adapters/openai-responses.js';

const REQUEST_BUILDERS = {
    [CHAT_PROVIDER_IDS.anthropic]: buildAnthropicMessagesRequest,
    [CHAT_PROVIDER_IDS.arkResponses]: buildArkResponsesRequest,
    [CHAT_PROVIDER_IDS.deepseek]: buildDeepSeekChatCompletionsRequest,
    [CHAT_PROVIDER_IDS.gemini]: buildGeminiGenerateContentRequest,
    [CHAT_PROVIDER_IDS.openai]: buildOpenAiChatCompletionsRequest,
    [CHAT_PROVIDER_IDS.openaiResponses]: buildOpenAiResponsesRequest
};

function buildAdapterRequest({ providerId, ...options }) {
    return REQUEST_BUILDERS[providerId](options);
}

function createBaseConfig(overrides = {}) {
    return {
        provider: CHAT_PROVIDER_IDS.gemini,
        apiUrl: 'https://example.com/v1',
        model: 'model-test',
        thinkingBudget: null,
        thinkingLevel: null,
        thinkingEffort: null,
        searchEnabled: false,
        ...overrides
    };
}

test('OpenAI chat completions adapter builds a text and image request', () => {
    const request = buildAdapterRequest({
        providerId: CHAT_PROVIDER_IDS.openai,
        config: createBaseConfig({
            provider: CHAT_PROVIDER_IDS.openai,
            apiUrl: 'https://api.openai.com/v1',
            model: 'gpt-4o-mini',
            thinkingBudget: 'high',
            searchEnabled: true
        }),
        envelope: {
            systemInstruction: 'You are helpful.',
            messages: [{
                role: 'user',
                parts: [
                    { type: 'text', text: 'describe this image' },
                    {
                        type: 'image',
                        image: {
                            sourceType: 'url',
                            value: 'https://example.com/dog.png',
                            detail: 'low'
                        }
                    }
                ]
            }]
        },
        stream: false,
        apiKey: 'sk-test'
    });

    assert.equal(request.endpoint, 'https://api.openai.com/v1/chat/completions');
    assert.equal(request.headers.Authorization, 'Bearer sk-test');
    assert.equal(request.body.reasoning_effort, 'high');
    assert.deepEqual(request.body.web_search_options, {});
    assert.equal(request.body.messages[0].role, 'system');
    assert.deepEqual(request.body.messages[1].content, [
        { type: 'text', text: 'describe this image' },
        {
            type: 'image_url',
            image_url: {
                url: 'https://example.com/dog.png',
                detail: 'low'
            }
        }
    ]);
});

test('OpenAI responses adapter builds input_text and input_image parts', () => {
    const request = buildAdapterRequest({
        providerId: CHAT_PROVIDER_IDS.openaiResponses,
        config: createBaseConfig({
            provider: CHAT_PROVIDER_IDS.openaiResponses,
            apiUrl: 'https://api.openai.com/v1',
            model: 'gpt-4o-mini',
            searchEnabled: true
        }),
        envelope: {
            systemInstruction: 'System prompt',
            messages: [{
                role: 'user',
                parts: [
                    { type: 'text', text: 'read this file image' },
                    {
                        type: 'image',
                        image: {
                            sourceType: 'file_id',
                            value: 'file-abc'
                        }
                    }
                ]
            }]
        },
        stream: true,
        apiKey: 'sk-test'
    });

    assert.equal(request.endpoint, 'https://api.openai.com/v1/responses');
    assert.equal(request.body.stream, true);
    assert.equal(request.body.instructions, 'System prompt');
    assert.deepEqual(request.body.tools, [{ type: 'web_search' }]);
    assert.deepEqual(request.body.input[0], {
        type: 'message',
        role: 'user',
        content: [
            { type: 'input_text', text: 'read this file image' },
            { type: 'input_image', file_id: 'file-abc' }
        ]
    });
});

test('OpenAI responses adapter maps assistant history text to output_text', () => {
    const request = buildAdapterRequest({
        providerId: CHAT_PROVIDER_IDS.openaiResponses,
        config: createBaseConfig({
            provider: CHAT_PROVIDER_IDS.openaiResponses,
            apiUrl: 'https://api.openai.com/v1',
            model: 'gpt-4o-mini'
        }),
        envelope: {
            messages: [
                {
                    role: 'user',
                    parts: [{ type: 'text', text: 'u1' }]
                },
                {
                    role: 'assistant',
                    parts: [{ type: 'text', text: 'a1' }]
                },
                {
                    role: 'user',
                    parts: [{ type: 'text', text: 'u2' }]
                }
            ]
        },
        stream: false,
        apiKey: 'sk-test'
    });

    assert.deepEqual(request.body.input, [
        {
            type: 'message',
            role: 'user',
            content: [{ type: 'input_text', text: 'u1' }]
        },
        {
            type: 'message',
            role: 'assistant',
            status: 'completed',
            content: [{ type: 'output_text', text: 'a1' }]
        },
        {
            type: 'message',
            role: 'user',
            content: [{ type: 'input_text', text: 'u2' }]
        }
    ]);
});

test('OpenAI responses adapter rejects assistant image history', () => {
    assert.throws(() => buildAdapterRequest({
        providerId: CHAT_PROVIDER_IDS.openaiResponses,
        config: createBaseConfig({
            provider: CHAT_PROVIDER_IDS.openaiResponses,
            apiUrl: 'https://api.openai.com/v1',
            model: 'gpt-4o-mini'
        }),
        envelope: {
            messages: [{
                role: 'assistant',
                parts: [{
                    type: 'image',
                    image: {
                        sourceType: 'url',
                        value: 'https://example.com/a.png'
                    }
                }]
            }]
        },
        stream: false,
        apiKey: 'sk-test'
    }), /assistant message does not support image parts/);
});

test('Ark responses adapter builds thinking and web search fields', () => {
    const request = buildAdapterRequest({
        providerId: CHAT_PROVIDER_IDS.arkResponses,
        config: createBaseConfig({
            provider: CHAT_PROVIDER_IDS.arkResponses,
            apiUrl: 'https://ark.cn-beijing.volces.com/api/v3/responses',
            model: 'doubao-seed-2-0-pro-260215',
            thinkingBudget: 'medium',
            searchEnabled: true
        }),
        envelope: {
            systemInstruction: 'Ark system',
            messages: [{
                role: 'user',
                parts: [
                    { type: 'text', text: 'summarize this image' },
                    {
                        type: 'image',
                        image: {
                            sourceType: 'file_id',
                            value: 'file-ark-1'
                        }
                    }
                ]
            }]
        },
        stream: false,
        apiKey: 'ark-key'
    });

    assert.equal(request.endpoint, 'https://ark.cn-beijing.volces.com/api/v3/responses');
    assert.equal(request.headers.Authorization, 'Bearer ark-key');
    assert.deepEqual(request.body.thinking, {
        type: 'enabled'
    });
    assert.deepEqual(request.body.reasoning, {
        effort: 'medium'
    });
    assert.deepEqual(request.body.tools, [{
        type: 'web_search'
    }]);
    assert.deepEqual(request.body.input[0], {
        type: 'message',
        role: 'user',
        content: [
            { type: 'input_text', text: 'summarize this image' },
            { type: 'input_image', file_id: 'file-ark-1' }
        ]
    });
});

test('Ark responses adapter maps assistant history text to output_text', () => {
    const request = buildAdapterRequest({
        providerId: CHAT_PROVIDER_IDS.arkResponses,
        config: createBaseConfig({
            provider: CHAT_PROVIDER_IDS.arkResponses,
            apiUrl: 'https://ark.cn-beijing.volces.com/api/v3/responses',
            model: 'doubao-seed-2-0-pro-260215'
        }),
        envelope: {
            messages: [
                { role: 'user', parts: [{ type: 'text', text: 'u1' }] },
                { role: 'assistant', parts: [{ type: 'text', text: 'a1' }] },
                { role: 'user', parts: [{ type: 'text', text: 'u2' }] }
            ]
        },
        stream: false,
        apiKey: 'ark-key'
    });

    assert.deepEqual(request.body.input, [
        { type: 'message', role: 'user', content: [{ type: 'input_text', text: 'u1' }] },
        { type: 'message', role: 'assistant', status: 'completed', content: [{ type: 'output_text', text: 'a1' }] },
        { type: 'message', role: 'user', content: [{ type: 'input_text', text: 'u2' }] }
    ]);
});

test('Ark responses adapter rejects assistant image history', () => {
    assert.throws(() => buildAdapterRequest({
        providerId: CHAT_PROVIDER_IDS.arkResponses,
        config: createBaseConfig({
            provider: CHAT_PROVIDER_IDS.arkResponses,
            apiUrl: 'https://ark.cn-beijing.volces.com/api/v3/responses',
            model: 'doubao-seed-2-0-pro-260215'
        }),
        envelope: {
            messages: [{
                role: 'assistant',
                parts: [{
                    type: 'image',
                    image: { sourceType: 'url', value: 'https://example.com/a.png' }
                }]
            }]
        },
        stream: false,
        apiKey: 'ark-key'
    }), /assistant message does not support image parts/);
});

test('DeepSeek adapter enables thinking without native search payload', () => {
    const request = buildAdapterRequest({
        providerId: CHAT_PROVIDER_IDS.deepseek,
        config: createBaseConfig({
            provider: CHAT_PROVIDER_IDS.deepseek,
            apiUrl: 'https://api.deepseek.com',
            model: 'deepseek-v4-flash',
            thinkingBudget: 'max',
            searchEnabled: true
        }),
        envelope: {
            systemInstruction: 'DeepSeek system',
            messages: [{
                role: 'user',
                parts: [{ type: 'text', text: 'hello' }]
            }]
        },
        stream: true,
        apiKey: 'sk-deepseek'
    });

    assert.equal(request.endpoint, 'https://api.deepseek.com/chat/completions');
    assert.equal(request.headers.Authorization, 'Bearer sk-deepseek');
    assert.equal(request.body.stream, true);
    assert.deepEqual(request.body.thinking, {
        type: 'enabled'
    });
    assert.equal(request.body.reasoning_effort, 'max');
    assert.deepEqual(request.body.web_search_options, {});
    assert.equal(request.body.tools, undefined);
    assert.deepEqual(request.body.messages, [
        { role: 'system', content: 'DeepSeek system' },
        { role: 'user', content: 'hello' }
    ]);
});

test('DeepSeek adapter disables thinking', () => {
    const request = buildAdapterRequest({
        providerId: CHAT_PROVIDER_IDS.deepseek,
        config: createBaseConfig({
            provider: CHAT_PROVIDER_IDS.deepseek,
            apiUrl: 'https://api.deepseek.com',
            model: 'deepseek-v4-pro',
            thinkingBudget: 'disabled'
        }),
        envelope: {
            messages: [{
                role: 'user',
                parts: [{ type: 'text', text: 'hello' }]
            }]
        },
        stream: false,
        apiKey: 'sk-deepseek'
    });

    assert.deepEqual(request.body.thinking, {
        type: 'disabled'
    });
    assert.equal(request.body.reasoning_effort, undefined);
});

test('Anthropic adapter builds system, image, thinking, and search fields', () => {
    const request = buildAdapterRequest({
        providerId: CHAT_PROVIDER_IDS.anthropic,
        config: createBaseConfig({
            provider: CHAT_PROVIDER_IDS.anthropic,
            apiUrl: 'https://api.anthropic.com/v1',
            model: 'claude-sonnet-4-5-20250929',
            thinkingEffort: 'medium',
            searchEnabled: true
        }),
        envelope: {
            systemInstruction: 'Anthropic system',
            messages: [{
                role: 'user',
                parts: [{
                    type: 'image',
                    image: {
                        sourceType: 'data_url',
                        value: 'data:image/png;base64,aGVsbG8='
                    }
                }]
            }]
        },
        stream: false,
        apiKey: 'sk-ant-test'
    });

    assert.equal(request.endpoint, 'https://api.anthropic.com/v1/messages');
    assert.equal(request.headers['x-api-key'], 'sk-ant-test');
    assert.equal(request.body.system, 'Anthropic system');
    assert.deepEqual(request.body.thinking, {
        type: 'adaptive'
    });
    assert.deepEqual(request.body.output_config, {
        effort: 'medium'
    });
    assert.deepEqual(request.body.tools, [{
        type: 'web_search_20250305',
        name: 'web_search'
    }]);
    assert.deepEqual(Object.keys(request.body.tools[0]).sort(), ['name', 'type']);
    assert.deepEqual(request.body.messages[0].content[0], {
        type: 'image',
        source: {
            type: 'base64',
            media_type: 'image/png',
            data: 'aGVsbG8='
        }
    });
});

test('Anthropic adapter omits thinking when effort is none', () => {
    const request = buildAdapterRequest({
        providerId: CHAT_PROVIDER_IDS.anthropic,
        config: createBaseConfig({
            provider: CHAT_PROVIDER_IDS.anthropic,
            apiUrl: 'https://api.anthropic.com/v1',
            model: 'claude-sonnet-4-5-20250929',
            thinkingEffort: 'none'
        }),
        envelope: {
            messages: [{
                role: 'user',
                parts: [{ type: 'text', text: 'hello' }]
            }]
        },
        stream: false,
        apiKey: 'sk-ant-test'
    });

    assert.equal(request.body.thinking, undefined);
    assert.equal(request.body.output_config, undefined);
    assert.equal(request.body.tools, undefined);
});

test('Gemini adapter builds inline_data and file_data parts', () => {
    const request = buildAdapterRequest({
        providerId: CHAT_PROVIDER_IDS.gemini,
        config: createBaseConfig({
            provider: CHAT_PROVIDER_IDS.gemini,
            apiUrl: 'https://generativelanguage.googleapis.com/v1beta',
            model: 'gemini-2.5-pro',
            searchEnabled: true,
            thinkingLevel: 'high'
        }),
        envelope: {
            systemInstruction: 'Gemini system',
            messages: [{
                role: 'user',
                parts: [
                    { type: 'text', text: 'first image from base64' },
                    {
                        type: 'image',
                        image: {
                            sourceType: 'base64',
                            mimeType: 'image/jpeg',
                            value: 'YmFzZTY0'
                        }
                    },
                    {
                        type: 'image',
                        image: {
                            sourceType: 'file_uri',
                            value: 'gs://bucket/image.png',
                            mimeType: 'image/png'
                        }
                    }
                ]
            }]
        },
        stream: true,
        apiKey: 'AIza-test'
    });

    assert.equal(
        request.endpoint,
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:streamGenerateContent?alt=sse'
    );
    assert.equal(request.headers['x-goog-api-key'], 'AIza-test');
    assert.equal(request.body.systemInstruction.parts[0].text, 'Gemini system');
    assert.deepEqual(request.body.tools, [{ google_search: {} }]);
    assert.deepEqual(request.body.generationConfig, {
        thinkingConfig: {
            thinkingLevel: 'high'
        }
    });
    assert.deepEqual(request.body.contents[0].parts[1], {
        inline_data: {
            mime_type: 'image/jpeg',
            data: 'YmFzZTY0'
        }
    });
    assert.deepEqual(request.body.contents[0].parts[2], {
        file_data: {
            file_uri: 'gs://bucket/image.png',
            mime_type: 'image/png'
        }
    });
});

test('Gemini adapter omits thinkingConfig when thinkingLevel is empty', () => {
    const request = buildAdapterRequest({
        providerId: CHAT_PROVIDER_IDS.gemini,
        config: createBaseConfig({
            provider: CHAT_PROVIDER_IDS.gemini,
            apiUrl: 'https://generativelanguage.googleapis.com/v1beta',
            model: 'gemini-2.5-pro',
            thinkingLevel: ''
        }),
        envelope: {
            messages: [{
                role: 'user',
                parts: [{ type: 'text', text: 'hello' }]
            }]
        },
        stream: false,
        apiKey: 'AIza-test'
    });

    assert.equal(request.body.generationConfig, undefined);
});
