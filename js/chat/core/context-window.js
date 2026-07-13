/**
 * 上下文窗口构建器
 *
 * 职责：
 * - 根据 Token 和消息数量限制裁剪对话历史
 * - 规范化历史消息为统一格式（支持文本和多模态消息）
 * - 构建适配不同 Provider 的上下文窗口
 * - 智能截断超长消息以适应 Token 预算
 *
 * 依赖：message-model.js, local-message.js
 * 被依赖：assistant-response
 */

// Context window builder: trims and normalizes history to fit model token/message budgets.
import { CJK_CHAR_REGEX } from '../../shared/string-utils.js';
import { estimateTokenCount, getContextMessageContent } from './message-model.js';
import { getLocalMessageText } from './local-message.js';

/**
 * 将内容截断到指定的 Token 预算
 * @param {string} content - 原始内容
 * @param {number} maxTokens - 最大 Token 数
 * @returns {string} 截断后的内容
 *
 * 算法：增量扫描，逐字符累计 CJK/non-CJK 计数，
 * 使用与 estimateTokenCount 相同的公式（含 Math.ceil）检查预算。
 * 相比二分查找（O(n log n)）更简单、更快（O(n)），
 * 且 token 估算本身已是近似值，二分查找的额外精度无实际收益。
 */
function truncateContentToTokenBudget(content, maxTokens) {
    if (!content || maxTokens <= 0) {
        return '';
    }

    const overheadTokens = 4;
    let cjkChars = 0;
    let nonCjkChars = 0;
    let splitIndex = 0;

    const cjkRegex = new RegExp(CJK_CHAR_REGEX.source, 'u');

    for (let i = 0; i < content.length; i++) {
        cjkRegex.test(content[i]) ? cjkChars++ : nonCjkChars++;

        const tokens = Math.ceil(cjkChars / 1.5 + nonCjkChars / 4) + overheadTokens;
        if (tokens > maxTokens) {
            break;
        }
        splitIndex = i + 1;
    }

    return content.slice(0, splitIndex).trim();
}

/**
 * 规范化对话历史为本地消息格式（支持多模态）
 * @param {Array} conversationHistory - 原始对话历史
 * @returns {Array} 规范化后的本地消息数组
 *
 * 处理逻辑：
 * - 优先使用消息中的多模态 parts
 */
function normalizeHistoryForLocalMessages(conversationHistory) {
    if (!Array.isArray(conversationHistory)) {
        throw new TypeError('Conversation history must be an array.');
    }

    return conversationHistory
        .map((message) => {
            const rawText = getContextMessageContent(message);
            const fallbackText = rawText.trim();

            const parts = Array.isArray(message?.meta?.parts) && message.meta.parts.length > 0
                ? message.meta.parts
                : [{ type: 'text', text: fallbackText }];

            return {
                role: message.role,
                parts
            };
        });
}

/**
 * 估算本地消息的 Token 数量
 * @param {Object} message - 本地消息对象
 * @param {number} tokenPerImage - 每张图片的保守 Token 估算值
 * @returns {number} 估算的 Token 数量（包含 4 个 Token 的消息开销）
 */
function estimateLocalMessageTokens(message, tokenPerImage) {
    const imageCount = message.parts.filter((part) => part.type === 'image').length;
    const imageCost = imageCount * tokenPerImage;
    const text = getLocalMessageText(message);
    return estimateTokenCount(text) + imageCost + 4;
}

/**
 * 将本地消息截断到指定的 Token 预算
 * @param {Object} message - 本地消息对象
 * @param {number} maxTokens - 最大 Token 数
 * @param {number} tokenPerImage - 每张图片的保守 Token 估算值
 * @returns {Object|null} 截断后的消息或 null
 *
 * 截断策略：
 * - 如果消息已在预算内，直接返回
 * - 保留所有图片部分（图片代表用户意图，不可丢弃）
 * - 截断文本部分以适应剩余预算（扣除实际图片 Token 后的空间）
 * - 如果图片就已超出预算，仍保留全部图片但不保留文本
 * - 如果截断后无内容，返回 null
 */
function truncateLocalMessageToTokenBudget(message, maxTokens, tokenPerImage) {
    if (maxTokens <= 0) {
        return null;
    }

    const messageTokenCount = estimateLocalMessageTokens(message, tokenPerImage);
    if (messageTokenCount <= maxTokens) {
        return message;
    }

    const imageCount = message.parts.filter((part) => part.type === 'image').length;
    const imageCost = imageCount * tokenPerImage;
    const plainText = getLocalMessageText(message);
    const textBudget = Math.max(0, maxTokens - imageCost);
    const truncatedText = textBudget > 0
        ? truncateContentToTokenBudget(plainText, textBudget)
        : '';

    const truncatedParts = message.parts.filter((part) => part.type === 'image');
    if (truncatedText) {
        truncatedParts.push({
            type: 'text',
            text: truncatedText
        });
    }

    if (truncatedParts.length === 0) {
        return null;
    }

    return {
        ...message,
        parts: truncatedParts
    };
}

/**
 * Build normalized local-message envelope from conversation history.
 *
 * System instruction is NOT included here — it is owned by the provider
 * runtime (providers/system-instruction.js) which may enrich it with
 * marker-protocol instructions.
 *
 * @param {Array} conversationHistory - Conversation history
 * @param {Object} config - Configuration object (systemPrompt used for logging only)
 * @param {Object} options
 * @param {number} options.maxContextTokens - Max context tokens (default 200000)
 * @param {number} options.maxContextMessages - Max context messages (default 120)
 * @returns {{ messages: Array, isTrimmed: boolean, tokenCount: number, inputBudgetTokens: number, maxContextMessages: number }}
 */
export function buildContextEnvelope(conversationHistory, config = {}, {
    maxContextTokens = 200000,
    maxContextMessages = 120,
    tokenPerImage = 2000
} = {}) {
    const normalizedHistory = normalizeHistoryForLocalMessages(conversationHistory);
    if (!Number.isInteger(maxContextMessages) || maxContextMessages <= 0) {
        throw new RangeError('maxContextMessages must be a positive integer.');
    }
    if (!Number.isFinite(maxContextTokens) || maxContextTokens <= 0) {
        throw new RangeError('maxContextTokens must be a positive number.');
    }

    let candidateHistory = normalizedHistory;
    let isTrimmed = false;

    if (normalizedHistory.length > maxContextMessages) {
        candidateHistory = normalizedHistory.slice(-maxContextMessages);
        isTrimmed = true;
    }

    const safeMaxTokens = maxContextTokens;

    if (!candidateHistory.length) {
        return {
            messages: [],
            isTrimmed,
            tokenCount: 0,
            inputBudgetTokens: safeMaxTokens,
            maxContextMessages
        };
    }

    const reserveOutputTokens = Math.max(1024, Math.floor(safeMaxTokens * 0.2));
    const inputBudgetTokens = Math.max(1024, safeMaxTokens - reserveOutputTokens);

    const selected = [];
    let usedTokens = 0;

    for (let index = candidateHistory.length - 1; index >= 0; index -= 1) {
        const message = candidateHistory[index];
        const messageTokens = estimateLocalMessageTokens(message, tokenPerImage);
        const exceedsBudget = usedTokens + messageTokens > inputBudgetTokens;

        if (exceedsBudget) {
            isTrimmed = true;

            // Keep a truncated version of the newest message so the latest intent survives.
            if (selected.length === 0) {
                const truncatedMessage = truncateLocalMessageToTokenBudget(message, inputBudgetTokens, tokenPerImage);
                if (truncatedMessage) {
                    selected.push(truncatedMessage);
                    usedTokens = estimateLocalMessageTokens(truncatedMessage, tokenPerImage);
                }
            }

            break;
        }

        selected.push(message);
        usedTokens += messageTokens;
    }

    return {
        messages: selected.reverse(),
        isTrimmed,
        tokenCount: usedTokens,
        inputBudgetTokens,
        maxContextMessages
    };
}
