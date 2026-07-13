/**
 * Gemini GenerateContent API 适配器
 *
 * 职责：
 * - 将标准化的本地消息格式转换为 Gemini GenerateContent API 的请求格式
 * - 处理图片的多种来源类型（data_url、base64、file_uri）
 * - 支持 Thinking Level 功能
 * - 构建完整的 API 请求对象（endpoint、headers、body）
 *
 * 依赖：local-message.js（图片数据解析）
 * 被依赖：gemini-provider.js
 */
import { parseImageDataUrl } from '../../core/local-message.js';
import { normalizeApiUrl } from '../../../shared/string-utils.js';
import { resolveGeminiEndpoint } from '../endpoint-resolver.js';

/**
 * 将本地消息 part 转换为 Gemini 格式
 *
 * 支持的类型：
 * - text: 文本内容
 * - image: 图片（支持 data_url、base64、file_uri 三种来源）
 *
 * @param {Object} part - 本地消息 part
 * @returns {Object|null} Gemini 格式的 part 对象
 * @throws {Error} 如果图片格式不支持
 */
function toGeminiPart(part) {
    if (part.type === 'text') {
        return {
            text: part.text
        };
    }

    if (part.type === 'image') {
        if (part.image.sourceType === 'data_url') {
            const parsedDataUrl = parseImageDataUrl(part.image.value);
            if (!parsedDataUrl) {
                throw new Error('Gemini image data_url must be a valid base64 data URL.');
            }

            return {
                inline_data: {
                    mime_type: parsedDataUrl.mimeType,
                    data: parsedDataUrl.data
                }
            };
        }

        if (part.image.sourceType === 'base64') {
            if (!part.image.mimeType) {
                throw new Error('Gemini base64 image part requires mimeType.');
            }

            return {
                inline_data: {
                    mime_type: part.image.mimeType,
                    data: part.image.value
                }
            };
        }

        if (part.image.sourceType === 'file_uri') {
            const fileData = {
                file_uri: part.image.value
            };

            if (part.image.mimeType) {
                fileData.mime_type = part.image.mimeType;
            }

            return {
                file_data: fileData
            };
        }

        throw new Error(`Gemini does not support image sourceType "${part.image.sourceType}".`);
    }

    return null;
}

/**
 * 构建 Gemini GenerateContent API 请求对象
 *
 * 算法：
 * 1. 验证并规范化 API URL
 * 2. 转换消息格式（将 parts 转换为 Gemini 格式，role 映射为 user/model）
 * 3. 添加系统指令、Thinking Budget 等可选配置
 * 4. 构建完整的端点 URL（包含模型名称和流式参数）
 *
 * @param {Object} options - 构建选项
 * @param {Object} options.config - Provider 配置
 * @param {Object} options.envelope - 消息封装对象
 * @param {boolean} [options.stream=false] - 是否启用流式响应
 * @param {string} options.apiKey - API 密钥
 * @returns {Object} 请求对象 {endpoint, headers, body}
 * @throws {Error} 如果 API URL 缺失
 */
export function buildGeminiGenerateContentRequest({
    config,
    envelope,
    stream = false,
    apiKey
}) {
    const baseUrl = normalizeApiUrl(config?.apiUrl);
    if (!baseUrl) {
        throw new Error('Gemini API URL is required.');
    }

    const body = {
        contents: envelope.messages.map((message) => ({
            role: message.role === 'assistant' ? 'model' : 'user',
            parts: message.parts
                .map((part) => toGeminiPart(part))
                .filter(Boolean)
        }))
    };

    // 添加系统指令
    if (envelope.systemInstruction) {
        body.systemInstruction = {
            parts: [{ text: envelope.systemInstruction }]
        };
    }


    // 添加 Thinking Level 配置
    const thinkingLevel = typeof config?.thinkingLevel === 'string'
        ? config.thinkingLevel.trim()
        : '';
    if (thinkingLevel) {
        body.generationConfig = {
            thinkingConfig: {
                thinkingLevel
            }
        };
    }

    if (config.searchEnabled === true) {
        body.tools = [{ google_search: {} }];
    }

    return {
        endpoint: resolveGeminiEndpoint(baseUrl, config.model, stream),
        headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey
        },
        body
    };
}
