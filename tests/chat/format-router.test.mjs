import test from 'node:test';
import assert from 'node:assert/strict';

import { CHAT_PROVIDER_IDS } from '../../js/chat/constants.js';
import { buildProviderRequest } from '../../js/chat/providers/format-router.js';

function createBaseConfig(overrides = {}) {
    return {
        provider: CHAT_PROVIDER_IDS.gemini,
        apiUrl: 'https://example.com/v1',
        model: 'model-test',
        thinkingBudget: null,
        searchMode: '',
        ...overrides
    };
}

test('format router builds OpenAI chat completions request for text+image message', () => {
    const request = buildProviderRequest({
        providerId: CHAT_PROVIDER_IDS.openai,
        config: createBaseConfig({
            provider: CHAT_PROVIDER_IDS.openai,
            apiUrl: 'https://api.openai.com/v1',
            model: 'gpt-4o-mini',
            thinkingBudget: 'high',
            searchMode: 'openai_web_search_medium'
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
    assert.deepEqual(request.body.web_search_options, { search_context_size: 'medium' });
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

test('format router builds OpenAI responses request with input_text + input_image(file_id)', () => {
    const request = buildProviderRequest({
        providerId: CHAT_PROVIDER_IDS.openaiResponses,
        config: createBaseConfig({
            provider: CHAT_PROVIDER_IDS.openaiResponses,
            apiUrl: 'https://api.openai.com/v1',
            model: 'gpt-4o-mini'
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
    assert.deepEqual(request.body.input[0], {
        type: 'message',
        role: 'user',
        content: [
            { type: 'input_text', text: 'read this file image' },
            { type: 'input_image', file_id: 'file-abc' }
        ]
    });
});

test('format router builds Anthropic request with top-level system and base64 image source', () => {
    const request = buildProviderRequest({
        providerId: CHAT_PROVIDER_IDS.anthropic,
        config: createBaseConfig({
            provider: CHAT_PROVIDER_IDS.anthropic,
            apiUrl: 'https://api.anthropic.com/v1',
            model: 'claude-sonnet-4-5-20250929',
            thinkingBudget: 2048,
            searchMode: 'anthropic_web_search'
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
        type: 'enabled',
        budget_tokens: 2048
    });
    assert.deepEqual(request.body.tools, [{
        type: 'web_search_20250305',
        name: 'web_search'
    }]);
    assert.deepEqual(request.body.messages[0].content[0], {
        type: 'image',
        source: {
            type: 'base64',
            media_type: 'image/png',
            data: 'aGVsbG8='
        }
    });
});

test('format router builds Gemini request with inline_data and file_data parts', () => {
    const request = buildProviderRequest({
        providerId: CHAT_PROVIDER_IDS.gemini,
        config: createBaseConfig({
            provider: CHAT_PROVIDER_IDS.gemini,
            apiUrl: 'https://generativelanguage.googleapis.com/v1beta',
            model: 'gemini-2.5-pro',
            searchMode: 'gemini_google_search',
            thinkingBudget: 4096
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
            thinkingBudget: 4096
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
