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
export const CHAT_HISTORY_KEY = 'llm_chat_history_v2';
export const CHAT_DRAFTS_KEY = 'llm_chat_drafts_v1';

// 历史记录 schema 版本号
export const CHAT_SCHEMA_VERSION = 3;

// Markdown 和流式响应标记符
export const SOURCES_MARKDOWN_MARKER = '\n\n---\n**Sources**\n'; // 来源部分标记
export const ASSISTANT_SEGMENT_MARKER = '<|CHANGE_ROLE|>'; // 段落分隔标记
export const ASSISTANT_SENTENCE_MARKER = '<|END_SENTENCE|>'; // 句子结束标记

export {
    CHAT_PROVIDER_IDS,
    CHAT_DEFAULTS,
    GEMINI_DEFAULTS,
    OPENAI_DEFAULTS,
    OPENAI_RESPONSES_DEFAULTS,
    DEEPSEEK_DEFAULTS,
    ARK_RESPONSES_DEFAULTS,
    ANTHROPIC_DEFAULTS,
    getProviderDefaults
} from './providers/provider-registry.js';

// 运行时限制配置
export const CHAT_LIMITS = Object.freeze({
    maxContextTokens: 200000,      // 最大上下文 Token 数
    maxContextMessages: 120,        // 最大上下文消息数
    maxRenderedMessages: 1000,      // 最大渲染消息数
    connectTimeoutMs: 30000,        // 连接超时时间（毫秒）
    maxRetries: 3                   // 最大重试次数
});

