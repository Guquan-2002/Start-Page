/**
 * 内存对话存储
 *
 * 职责：
 * - 维护单条内存中的对话消息列表（无持久化、无多会话、无侧栏）
 * - 提供消息追加与按 turnId 回滚（用于重试）
 * - 管理流式响应的生命周期状态（isStreaming、abortController、abortReason）
 * - 暴露一个会话级 id（conversationId），在清空对话时更换，供生成流程检测
 *   “生成期间对话被清空”并提前退出
 *
 * 依赖：message-model.js（克隆消息、生成 id）
 * 被依赖：api-manager.js, chat.js
 */
import {
    cloneChatMessage,
    createEntityId
} from '../core/message-model.js';
import { asTrimmedString } from '../../shared/string-utils.js';

/**
 * 创建内存对话存储
 * @returns {Object} 对话存储实例
 */
export function createConversationStore() {
    const state = {
        conversationId: createEntityId('conv'),
        messages: [],
        isStreaming: false,
        abortController: null,
        abortReason: ''
    };

    /**
     * 获取当前对话 id
     *
     * 清空对话后会生成新的 id。生成流程在开始时捕获该 id，
     * 期间检测到变化即认为对话已被重置，提前终止本次生成。
     */
    function getConversationId() {
        return state.conversationId;
    }

    /**
     * 获取当前对话的消息列表（内存引用，调用方只读）
     */
    function getActiveMessages() {
        return state.messages;
    }

    /**
     * 追加消息到当前对话
     * @param {Array} messages - 要追加的消息数组
     */
    function appendMessages(messages) {
        if (!Array.isArray(messages) || messages.length === 0) {
            return;
        }

        for (const message of messages) {
            state.messages.push(cloneChatMessage(message));
        }
    }

    /**
     * 回滚到指定轮次
     *
     * 删除从指定 turnId 开始的所有消息，用于重试功能。
     *
     * @param {string} turnId - 轮次 ID
     * @returns {Object|null} 回滚结果，包含 retryContent
     */
    function rollbackToTurn(turnId) {
        const normalizedTurnId = asTrimmedString(turnId);
        if (!normalizedTurnId) {
            return null;
        }

        const startIndex = state.messages.findIndex((message) => (
            message.turnId === normalizedTurnId
        ));
        if (startIndex === -1) {
            return null;
        }

        const removedMessages = state.messages.splice(startIndex);

        // 查找被删除消息中的用户输入，用于重试
        const retrySource = removedMessages.find((message) => (
            message.role === 'user' && message?.meta?.isPrefixMessage !== true
        )) || removedMessages.find((message) => message.role === 'user');

        return {
            retryContent: retrySource?.content || ''
        };
    }

    /**
     * 清空当前对话，开始新对话
     *
     * 生成新的 conversationId 以便进行中的生成流程检测到对话重置。
     */
    function clearConversation() {
        state.conversationId = createEntityId('conv');
        state.messages = [];
    }

    /**
     * 检查是否正在流式响应
     */
    function isStreaming() {
        return state.isStreaming;
    }

    /**
     * 开始流式响应
     * @param {AbortController} abortController - 中止控制器
     */
    function startStreaming(abortController) {
        state.isStreaming = true;
        state.abortController = abortController;
        state.abortReason = '';
    }

    /**
     * 结束流式响应
     */
    function finishStreaming() {
        state.isStreaming = false;
        state.abortController = null;
        state.abortReason = '';
    }

    /**
     * 获取中止原因
     */
    function getAbortReason() {
        return state.abortReason;
    }

    /**
     * 请求中止流式响应
     * @param {string} reason - 中止原因（'user' 或 'connect_timeout'）
     * @returns {boolean} 是否成功请求中止
     */
    function requestAbort(reason = 'user') {
        if (!state.abortController) {
            return false;
        }

        state.abortReason = asTrimmedString(reason) || 'user';
        state.abortController.abort();
        return true;
    }

    return {
        getConversationId,
        getActiveMessages,
        appendMessages,
        rollbackToTurn,
        clearConversation,
        isStreaming,
        startStreaming,
        finishStreaming,
        getAbortReason,
        requestAbort
    };
}
