/**
 * Provider 格式路由器
 *
 * 职责：
 * - 根据 Provider ID 选择对应的请求构建适配器
 * - 将标准化的本地消息格式转换为各 Provider 的 API 请求格式
 * - 统一处理系统指令的回退逻辑
 *
 * 依赖：
 * - local-message.js（消息封装构建）
 * - provider-registry.js（Provider ID 和搜索工具规则）
 * - adapters/*（各 Provider 的请求构建器）
 *
 * 被依赖：anthropic-provider, gemini-provider, openai-provider
 */
import { buildLocalMessageEnvelope } from '../core/local-message.js';
import { buildOpenAiChatCompletionsRequest } from './adapters/openai-chat-completions.js';
import { buildOpenAiResponsesRequest } from './adapters/openai-responses.js';
import { buildDeepSeekChatCompletionsRequest } from './adapters/deepseek-chat-completions.js';
import { buildArkResponsesRequest } from './adapters/ark-responses.js';
import { buildAnthropicMessagesRequest } from './adapters/anthropic-messages.js';
import { buildGeminiGenerateContentRequest } from './adapters/gemini-generate-content.js';
import {
    CHAT_PROVIDER_IDS,
    applyProviderSearchConfig,
    getProviderDefinition,
    normalizeProviderId
} from './provider-registry.js';

// Provider ID 到请求构建器的映射表
const REQUEST_BUILDERS = new Map([
    [CHAT_PROVIDER_IDS.openai, buildOpenAiChatCompletionsRequest],
    [CHAT_PROVIDER_IDS.openaiResponses, buildOpenAiResponsesRequest],
    [CHAT_PROVIDER_IDS.deepseek, buildDeepSeekChatCompletionsRequest],
    [CHAT_PROVIDER_IDS.arkResponses, buildArkResponsesRequest],
    [CHAT_PROVIDER_IDS.anthropic, buildAnthropicMessagesRequest],
    [CHAT_PROVIDER_IDS.gemini, buildGeminiGenerateContentRequest]
]);

/**
 * 构建 Provider 请求对象
 *
 * 算法：
 * 1. 根据 providerId 查找对应的请求构建器
 * 2. 规范化消息封装（处理系统指令回退）
 * 3. 调用对应的构建器生成请求对象
 *
 * @param {Object} options - 构建选项
 * @param {string} options.providerId - Provider ID
 * @param {Object} options.config - Provider 配置
 * @param {Object} options.envelope - 消息封装对象
 * @param {boolean} [options.stream=false] - 是否启用流式响应
 * @param {string} options.apiKey - API 密钥
 * @returns {Object} 请求对象，包含 endpoint、headers、body
 * @throws {Error} 如果 Provider 不支持
 */
export function buildProviderRequest({
    providerId,
    config,
    envelope,
    stream = false,
    apiKey
}) {
    const normalizedProviderId = normalizeProviderId(providerId || config?.provider);
    const providerDefinition = getProviderDefinition(normalizedProviderId);
    if (!providerDefinition) {
        throw new Error(`Unsupported provider "${providerId}".`);
    }

    const requestBuilder = REQUEST_BUILDERS.get(providerDefinition.id);
    if (!requestBuilder) {
        throw new Error(`Provider "${providerDefinition.id}" does not have a request builder.`);
    }

    const normalizedEnvelope = buildLocalMessageEnvelope(envelope, {
        fallbackSystemInstruction: typeof config?.systemPrompt === 'string' ? config.systemPrompt : ''
    });

    const request = requestBuilder({
        config,
        envelope: normalizedEnvelope,
        stream: stream === true,
        apiKey
    });

    applyProviderSearchConfig(providerDefinition.id, request.body, config);

    return request;
}
