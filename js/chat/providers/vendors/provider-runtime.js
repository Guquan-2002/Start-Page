/**
 * Provider 运行时共享助手
 *
 * 职责：
 * - prepareProviderRequest: 验证配置 + 构建请求信封（合并各 vendor 重复的调用对）
 * - generateStreamWithKeyFallback: 流式 key-loop + 错误处理 + 回退
 * - generateWithKeyFallback: 非流式 key-loop + 错误处理 + 回退
 *
 * 依赖：http.js（重试发送）、system-instruction.js（系统指令）、message-model.js（分段）
 * 被依赖：vendors/*-provider.js
 */
import { splitAssistantMessageByMarker } from '../../core/message-model.js';
import { getApiKeys, postJsonWithRetry, readSseJsonEvents } from '../http.js';
import { buildSystemInstruction } from '../system-instruction.js';
import { PROVIDER_EVENT_TYPES } from '../provider-events.js';

/**
 * 验证 provider 配置：确保 model 和至少一个 API key 存在。
 *
 * 集中化各 vendor 文件中重复的守卫，16 处 → 8 处调用。
 *
 * @param {Object} config - Provider 配置
 * @param {string} providerName - Provider 显示名称（用于错误消息）
 * @returns {Array<string>} apiKeys 数组
 */
function validateProviderConfig(config, providerName) {
    if (!config || !config.model) {
        throw new Error(`${providerName} model is required.`);
    }

    const apiKeys = getApiKeys(config);
    if (apiKeys.length === 0) {
        throw new Error('At least one API key is required.');
    }

    return apiKeys;
}

/**
 * 准备 provider 请求：验证配置 + 构建请求信封。
 *
 * 合并每个 vendor 中 always-together 的两个调用，
 * 将 8 处调用对缩减为 4 处。
 *
 * @param {Object} config - Provider 配置
 * @param {Object} localMessageEnvelope - 本地消息信封
 * @param {string} providerName - Provider 显示名称
 * @returns {{ apiKeys: Array<string>, envelope: Object }}
 */
export function prepareProviderRequest(config, localMessageEnvelope, providerName) {
    const apiKeys = validateProviderConfig(config, providerName);
    const enableMarkerSplit = resolveEnableMarkerSplit(config);
    const envelope = buildRequestEnvelope(config, localMessageEnvelope, enableMarkerSplit);
    return { apiKeys, envelope };
}

/** 触发备用 key 回退的 HTTP 状态码 */
const BACKUP_KEY_STATUS_CODES = new Set([401, 403, 429]);

/**
 * Resolve whether marker-based message splitting is enabled.
 *
 * @param {Object} config - Provider configuration
 * @returns {boolean}
 */
function resolveEnableMarkerSplit(config) {
    return config.enableMarkerSplit !== false;
}

/**
 * 构建请求信封：在本地消息信封上附加系统指令
 * @param {Object} config - Provider 配置
 * @param {Object} localMessageEnvelope - 本地消息信封
 * @param {boolean} enableMarkerSplit - 是否启用 marker 分割
 * @returns {Object} 带有 systemInstruction 的请求信封
 */
function buildRequestEnvelope(config, localMessageEnvelope, enableMarkerSplit) {
    return {
        ...localMessageEnvelope,
        systemInstruction: buildSystemInstruction(config, enableMarkerSplit)
    };
}

/**
 * 判断某次失败是否可以回退到备用 key
 *
 * 规则：
 * - AbortError 永不回退（由调用方显式抛出）
 * - 仅在第 0 个 key 失败、且存在备用 key、且流式场景未发出任何 delta 时回退
 * - 状态码命中 BACKUP_KEY_STATUS_CODES（401/403/429）
 *
 * @param {Error} error - 捕获到的错误
 * @param {number} keyIndex - 当前使用的 key 索引
 * @param {Array<string>} apiKeys - 全部 key 列表
 * @param {Object} [options]
 * @param {boolean} [options.emittedAnyDelta=false] - 流式场景是否已发出文本增量
 * @returns {boolean}
 */
function canFallbackToBackupKey(error, keyIndex, apiKeys, {
    emittedAnyDelta = false
} = {}) {
    if (error?.name === 'AbortError') {
        return false;
    }

    return keyIndex === 0
        && apiKeys.length > 1
        && !emittedAnyDelta
        && BACKUP_KEY_STATUS_CODES.has(error?.status);
}

/**
 * 运行流式 generateStream，自动处理备用 key 回退。
 *
 * 消除 4 个 vendor（anthropic/ark/gemini/openai）中 ~50 行重复的
 * key-loop + 错误处理 + 回退逻辑。
 *
 * @param {Object} options
 * @param {Array<string>} options.apiKeys - API key 列表
 * @param {Object} options.config - Provider 配置
 * @param {Object} options.envelope - 请求信封
 * @param {Function} options.buildRequest - (ctx) => request, ctx={config, envelope, stream:true, apiKey}
 * @param {Function} options.createPayloadProcessor - () => (payload) => Array<{type, text?}>
 *        每次 key 尝试调用一次，支持有状态 processor（如 Gemini assembledText）
 * @param {Function} options.fetchImpl - fetch 实现
 * @param {Object} [options.httpOptions] - { signal, maxRetries, maxRetryDelayMs, onRetryNotice }
 * @param {Function} [options.onFallbackKey] - 回退到备用 key 时的通知回调
 * @param {Function} [options.onInitialConnect] - () => Array<event>，连接建立后立即调用
 * @returns {AsyncGenerator<{type: string, text?: string}>}
 */
export async function* generateStreamWithKeyFallback({
    apiKeys,
    config,
    envelope,
    buildRequest,
    createPayloadProcessor,
    fetchImpl,
    httpOptions = {},
    onFallbackKey,
    onInitialConnect
}) {
    const { signal } = httpOptions;
    let emittedAnyDelta = false;

    for (let keyIndex = 0; keyIndex < apiKeys.length; keyIndex += 1) {
        const processPayload = createPayloadProcessor();

        try {
            const request = buildRequest({
                config,
                envelope,
                stream: true,
                apiKey: apiKeys[keyIndex]
            });
            const response = await postJsonWithRetry(fetchImpl, request, httpOptions);

            if (onInitialConnect) {
                const connectEvents = onInitialConnect();
                for (const event of connectEvents) {
                    yield event;
                }
            }

            for await (const payload of readSseJsonEvents(response, signal)) {
                const events = processPayload(payload);
                for (const event of events) {
                    if (event.type === PROVIDER_EVENT_TYPES.TEXT_DELTA) {
                        emittedAnyDelta = true;
                    }
                    yield event;
                }
            }
            return;
        } catch (error) {
            if (error?.name === 'AbortError') {
                throw error;
            }

            if (canFallbackToBackupKey(error, keyIndex, apiKeys, { emittedAnyDelta })) {
                onFallbackKey?.();
                continue;
            }

            throw error;
        }
    }
}

/**
 * 运行非流式 generate，自动处理备用 key 回退
 *
 * 遍历 apiKeys 逐个尝试：成功则解析响应文本并按 marker 分段返回；
 * 失败时按 canFallbackToBackupKey 决定是否回退到下一个 key。
 * 全部 key 都失败（理论上不会到达，因为非首 key 失败会直接抛出）时
 * 抛出 provider 特定的 failureMessage。
 *
 * @param {Object} options
 * @param {Array<string>} options.apiKeys - API key 列表
 * @param {Object} options.config - Provider 配置
 * @param {Object} options.envelope - 请求信封（已含 systemInstruction）
 * @param {Function} options.buildRequest - (ctx) => request，ctx={config, envelope, stream:false, apiKey}
 * @param {Function} options.parseResponseText - (responseData) => string
 * @param {Function} options.fetchImpl - fetch 实现
 * @param {Object} [options.httpOptions] - { signal, maxRetries, maxRetryDelayMs, onRetryNotice }
 * @param {Function} [options.onFallbackKey] - 回退到备用 key 时的通知回调
 * @param {string} options.failureMessage - 全部失败时的错误信息
 * @returns {Promise<{segments: Array<string>}>}
 */
export async function generateWithKeyFallback({
    apiKeys,
    config,
    envelope,
    buildRequest,
    parseResponseText,
    fetchImpl,
    httpOptions = {},
    onFallbackKey,
    failureMessage
}) {
    const enableMarkerSplit = resolveEnableMarkerSplit(config);

    for (let keyIndex = 0; keyIndex < apiKeys.length; keyIndex += 1) {
        try {
            const request = buildRequest({
                config,
                envelope,
                stream: false,
                apiKey: apiKeys[keyIndex]
            });
            const response = await postJsonWithRetry(fetchImpl, request, httpOptions);
            const responseData = await response.json();
            const assistantRawText = parseResponseText(responseData);

            return {
                segments: splitAssistantMessageByMarker(assistantRawText, {
                    enableMarkerSplit
                })
            };
        } catch (error) {
            if (error?.name === 'AbortError') {
                throw error;
            }

            if (canFallbackToBackupKey(error, keyIndex, apiKeys)) {
                onFallbackKey?.();
                continue;
            }

            throw error;
        }
    }

    throw new Error(failureMessage);
}
