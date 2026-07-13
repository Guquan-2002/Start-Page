/**
 * OpenAI Responses API 适配器
 *
 * 职责：
 * - 将标准化的本地消息格式转换为 OpenAI Responses API 的请求格式
 * - 处理图片的多种来源类型（url、data_url、base64、file_id）
 * - 支持 Reasoning Effort 功能
 * - 构建完整的 API 请求对象（endpoint、headers、body）
 *
 * 依赖：无
 * 被依赖：openai-provider.js
 */

import { normalizeApiUrl } from '../../../shared/string-utils.js';
import { toInputContentPart } from './responses-common.js';
import { resolveResponsesEndpoint } from '../endpoint-resolver.js';

/**
 * 构建 OpenAI Responses API 请求对象
 *
 * 算法：
 * 1. 验证并规范化 API URL
 * 2. 转换消息格式（将 parts 转换为 Responses API 的 input 格式）
 * 3. 添加系统指令（instructions 字段）
 * 4. 添加 Reasoning Effort 和 Web Search 等可选配置
 *
 * @param {Object} options - 构建选项
 * @param {Object} options.config - Provider 配置
 * @param {Object} options.envelope - 消息封装对象
 * @param {boolean} [options.stream=false] - 是否启用流式响应
 * @param {string} options.apiKey - API 密钥
 * @returns {Object} 请求对象 {endpoint, headers, body}
 * @throws {Error} 如果 API URL 缺失
 */
export function buildOpenAiResponsesRequest({
    config,
    envelope,
    stream = false,
    apiKey
}) {
    const baseUrl = normalizeApiUrl(config?.apiUrl);
    if (!baseUrl) {
        throw new Error('OpenAI API URL is required.');
    }

    const endpoint = resolveResponsesEndpoint(baseUrl);
    // 转换消息为 Responses API 的 input 格式
    const apiProviderName = 'OpenAI Responses';
    const input = envelope.messages.map((message, messageIndex) => {
        const role = message.role === 'assistant' ? 'assistant' : 'user';
        const content = message.parts
            .map((part) => toInputContentPart(part, role, apiProviderName))
            .filter(Boolean);

        if (content.length === 0) {
            throw new Error(`OpenAI Responses message at index ${messageIndex} has empty content.`);
        }

        const item = {
            type: 'message',
            role,
            content
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

    // 添加系统指令
    if (envelope.systemInstruction) {
        body.instructions = envelope.systemInstruction;
    }

    // 添加 Reasoning Effort 配置
    if (typeof config?.thinkingBudget === 'string' && config.thinkingBudget) {
        body.reasoning = {
            effort: config.thinkingBudget
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
