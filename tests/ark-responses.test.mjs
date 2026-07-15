import assert from 'node:assert/strict';
import test from 'node:test';
import { createOpenAI } from '@ai-sdk/openai';
import { convertToModelMessages } from 'ai';

import {
    buildArkHistoryInput,
    buildArkRequestBody,
    createArkFetch,
    getArkMessageMetadata,
    normalizeArkBaseUrl,
    prepareArkConversation
} from '../src/server/ark-responses.js';

const config = {
    apiUrl: 'https://ark.cn-beijing.volces.com/api/v3',
    model: 'doubao-seed-2-0-pro-260215',
    reasoning: 'high',
    systemPrompt: 'Be helpful.'
};

const conversation = [
    {
        id: 'user-1',
        role: 'user',
        parts: [{ type: 'text', text: 'first' }]
    },
    {
        id: 'assistant-1',
        role: 'assistant',
        metadata: {
            ark: {
                responseId: 'resp_ark_1',
                model: config.model,
                apiUrl: config.apiUrl
            }
        },
        parts: [
            { type: 'reasoning', text: 'private reasoning' },
            { type: 'text', text: 'answer' }
        ]
    },
    {
        id: 'user-2',
        role: 'user',
        parts: [
            { type: 'text', text: 'second' },
            {
                type: 'file',
                mediaType: 'image/png',
                url: 'data:image/png;base64,AAAA'
            }
        ]
    }
];

test('normalizeArkBaseUrl accepts both the SDK base URL and curl endpoint', () => {
    assert.equal(
        normalizeArkBaseUrl('https://ark.cn-beijing.volces.com/api/v3'),
        'https://ark.cn-beijing.volces.com/api/v3'
    );
    assert.equal(
        normalizeArkBaseUrl('https://ark.cn-beijing.volces.com/api/v3/responses'),
        'https://ark.cn-beijing.volces.com/api/v3'
    );
});

test('buildArkHistoryInput maps full text and image history to Ark messages', () => {
    assert.deepEqual(buildArkHistoryInput(conversation), [
        {
            type: 'message',
            role: 'user',
            content: [{ type: 'input_text', text: 'first' }]
        },
        {
            type: 'message',
            role: 'assistant',
            content: [{ type: 'output_text', text: 'answer' }]
        },
        {
            type: 'message',
            role: 'user',
            content: [
                { type: 'input_text', text: 'second' },
                { type: 'input_image', image_url: 'data:image/png;base64,AAAA' }
            ]
        }
    ]);
});

test('prepareArkConversation continues from the latest compatible Ark response', () => {
    const prepared = prepareArkConversation(conversation, config);

    assert.equal(prepared.previousResponseId, 'resp_ark_1');
    assert.deepEqual(prepared.messages, [conversation[2]]);
    assert.equal(prepared.fallbackInput.length, 3);
});

test('prepareArkConversation replays history when response metadata is incompatible', () => {
    const prepared = prepareArkConversation(conversation, {
        ...config,
        model: 'another-model'
    });

    assert.equal(prepared.previousResponseId, undefined);
    assert.deepEqual(prepared.messages, conversation);
});

test('buildArkRequestBody uses Ark continuation, instructions, thinking and store fields', () => {
    const body = buildArkRequestBody({
        model: config.model,
        input: [{ role: 'user', content: [{ type: 'input_text', text: 'second' }] }],
        include: ['web_search_call.action.sources'],
        previous_response_id: 'resp_ark_1',
        stream: true
    }, {
        config,
        fallbackInput: buildArkHistoryInput(conversation)
    });

    assert.deepEqual(body, {
        model: config.model,
        stream: true,
        input: [{
            type: 'message',
            role: 'user',
            content: [{ type: 'input_text', text: 'second' }]
        }],
        store: true,
        previous_response_id: 'resp_ark_1',
        instructions: 'Be helpful.',
        thinking: { type: 'enabled' },
        reasoning: { effort: 'high' }
    });
});

test('buildArkRequestBody leaves automatic thinking unset and maps explicit none', () => {
    const fallbackInput = buildArkHistoryInput(conversation);
    const autoBody = buildArkRequestBody({ input: [] }, {
        config: { ...config, reasoning: '', systemPrompt: '' },
        fallbackInput
    });
    const disabledBody = buildArkRequestBody({ input: [] }, {
        config: { ...config, reasoning: 'none' },
        fallbackInput
    });

    assert.equal(autoBody.thinking, undefined);
    assert.equal(autoBody.reasoning, undefined);
    assert.deepEqual(disabledBody.thinking, { type: 'disabled' });
    assert.equal(disabledBody.reasoning, undefined);
});

test('buildArkRequestBody accepts legacy disabled reasoning aliases', () => {
    const body = buildArkRequestBody({ input: [] }, {
        config: { ...config, reasoning: 'disabled' },
        fallbackInput: buildArkHistoryInput(conversation)
    });

    assert.deepEqual(body.thinking, { type: 'disabled' });
    assert.equal(body.reasoning, undefined);
});

test('createArkFetch retries invalid continuation with full history', async () => {
    const requests = [];
    const fetchImpl = async (_input, init) => {
        requests.push(JSON.parse(init.body));
        if (requests.length === 1) {
            return new Response(JSON.stringify({
                error: {
                    message: 'The parameter `input` specified in the request are not valid: `<nil>`.'
                }
            }), { status: 400 });
        }
        return new Response('{}', { status: 200 });
    };
    const fallbackInput = buildArkHistoryInput(conversation);
    const arkFetch = createArkFetch({ config, fallbackInput, fetchImpl });

    const response = await arkFetch('https://ark.example/responses', {
        body: JSON.stringify({
            model: config.model,
            input: [{ role: 'user', content: 'second' }],
            previous_response_id: 'resp_ark_1'
        })
    });

    assert.equal(response.status, 200);
    assert.equal(requests.length, 2);
    assert.equal(requests[0].previous_response_id, 'resp_ark_1');
    assert.equal(requests[1].previous_response_id, undefined);
    assert.deepEqual(requests[1].input, fallbackInput);
});

test('getArkMessageMetadata stores the response id needed by the next turn', () => {
    assert.deepEqual(getArkMessageMetadata({
        type: 'finish-step',
        response: { id: 'resp_ark_2' }
    }, config), {
        ark: {
            responseId: 'resp_ark_2',
            model: config.model,
            apiUrl: config.apiUrl
        }
    });
});

test('AI SDK emits Ark-native continuation instead of item_reference', async () => {
    const prepared = prepareArkConversation(conversation, config);
    const requests = [];
    const fetchImpl = async (_input, init) => {
        requests.push(JSON.parse(init.body));
        return new Response(JSON.stringify({
            error: { message: 'request captured' }
        }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    };
    const provider = createOpenAI({
        apiKey: 'test-key',
        baseURL: config.apiUrl,
        name: 'ark',
        fetch: createArkFetch({
            config,
            fallbackInput: prepared.fallbackInput,
            fetchImpl
        })
    });
    const messages = await convertToModelMessages(prepared.messages);

    await assert.rejects(provider.responses(config.model).doGenerate({
        prompt: messages,
        providerOptions: {
            openai: {
                store: true,
                previousResponseId: prepared.previousResponseId
            }
        }
    }));

    assert.equal(requests.length, 1);
    assert.equal(requests[0].previous_response_id, 'resp_ark_1');
    assert.equal(requests[0].store, true);
    assert.equal(requests[0].instructions, 'Be helpful.');
    assert.equal(requests[0].input.some((item) => item.type === 'item_reference'), false);
    assert.deepEqual(requests[0].input, [{
        type: 'message',
        role: 'user',
        content: [
            { type: 'input_text', text: 'second' },
            { type: 'input_image', image_url: 'data:image/png;base64,AAAA' }
        ]
    }]);
});
