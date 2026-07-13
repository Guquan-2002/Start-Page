/**
 * 聊天模块常量定义
 *
 * 职责：
 * - 定义所有共享的常量（存储键、Provider ID、默认配置、运行时限制）
 * - 作为整个 chat 模块的基础层，被所有其他模块依赖
 *
 * 依赖：无
 * 被依赖：几乎所有 chat 模块
 */

// localStorage 存储键
export const CHAT_STORAGE_KEY = 'llm_chat_config';

// 流式响应标记符
export const ASSISTANT_SEGMENT_MARKER = '<|CHANGE_ROLE|>'; // 段落分隔标记
export const ASSISTANT_SENTENCE_MARKER = '<|END_SENTENCE|>'; // 句子结束标记

// 运行时限制配置
export const CHAT_LIMITS = Object.freeze({
    maxContextTokens: 200000,      // 最大上下文 Token 数
    maxContextMessages: 120,        // 最大上下文消息数
    maxRenderedMessages: 1000,      // 最大渲染消息数
    connectTimeoutMs: 30000,        // 连接超时时间（毫秒）
    maxRetries: 3,                  // 最大重试次数
    maxRetryDelayMs: 8000,          // 重试最大延迟时间（毫秒）
    tokenPerImage: 2000             // 每张图片的保守 Token 估算（实际约 85-1600，取偏大值保底）
});
