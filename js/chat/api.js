import { buildContextPreview, buildContextWindow, normalizeMaxContextMessages } from './core/context-window.js';
import { createChatMessage, createTurnId, getMessageDisplayContent } from './core/message-model.js';
import { createMarkerStreamSplitter } from './core/marker-stream-splitter.js';
import { applyMessagePrefix, buildMessagePrefix, buildTimestampPrefix } from './core/prefix.js';
import { ASSISTANT_SEGMENT_MARKER, ASSISTANT_SENTENCE_MARKER } from './constants.js';
import { runPseudoStream } from './core/pseudo-stream.js';
import { assertProvider } from './providers/provider-interface.js';

const CONTEXT_DEBUG_STORAGE_KEY = 'llm_chat_context_debug';
const CONTEXT_MAX_MESSAGES_STORAGE_KEY = 'llm_chat_context_max_messages';
const CONTEXT_DEBUG_PREVIEW_CHARS = 80;

function isContextDebugEnabled() {
    if (globalThis.__CHAT_CONTEXT_DEBUG__ === true) {
        return true;
    }

    if (typeof localStorage === 'undefined') {
        return false;
    }

    try {
        return localStorage.getItem(CONTEXT_DEBUG_STORAGE_KEY) === '1';
    } catch {
        return false;
    }
}

function resolveContextMaxMessages(defaultValue) {
    const globalOverride = normalizeMaxContextMessages(globalThis.__CHAT_CONTEXT_MAX_MESSAGES__);
    if (globalOverride) {
        return globalOverride;
    }

    if (typeof localStorage !== 'undefined') {
        try {
            const localOverride = normalizeMaxContextMessages(localStorage.getItem(CONTEXT_MAX_MESSAGES_STORAGE_KEY));
            if (localOverride) {
                return localOverride;
            }
        } catch {
            // Ignore localStorage read failures.
        }
    }

    return normalizeMaxContextMessages(defaultValue);
}

function logContextWindowDebug(contextWindow, config) {
    if (!isContextDebugEnabled()) {
        return;
    }

    const userMessageCount = contextWindow.messages.filter((message) => message.role === 'user').length;
    const assistantMessageCount = contextWindow.messages.length - userMessageCount;

    console.info('[ChatContext]', {
        provider: config.provider,
        model: config.model,
        totalMessages: contextWindow.messages.length,
        userMessages: userMessageCount,
        assistantMessages: assistantMessageCount,
        tokenCount: contextWindow.tokenCount,
        inputBudgetTokens: contextWindow.inputBudgetTokens,
        maxContextMessages: contextWindow.maxContextMessages,
        trimmed: contextWindow.isTrimmed,
        preview: buildContextPreview(contextWindow.messages, CONTEXT_DEBUG_PREVIEW_CHARS)
    });
}

function resizeInputToContent(chatInput) {
    chatInput.style.height = 'auto';
    chatInput.style.height = `${Math.min(chatInput.scrollHeight, 120)}px`;
}

export function createApiManager({
    store,
    elements,
    ui,
    configManager,
    provider,
    constants,
    onConversationUpdated = null,
    onUserMessageAccepted = null
}) {
    const providerClient = assertProvider(provider);

    const { chatInput, settingsDiv } = elements;
    const {
        connectTimeoutMs,
        maxContextTokens = 200000,
        maxContextMessages = 120
    } = constants;

    let contextTrimNoticeShown = false;

    function notifyConversationUpdated() {
        if (typeof onConversationUpdated === 'function') {
            onConversationUpdated();
        }
    }

    function notifyContextTrim(isTrimmed) {
        if (!isTrimmed) {
            contextTrimNoticeShown = false;
            return;
        }

        if (contextTrimNoticeShown) {
            return;
        }

        ui.addSystemNotice('Older messages were excluded from model context due to token limits.', 3500);
        contextTrimNoticeShown = true;
    }

    function appendMessagesToUi(messages) {
        messages.forEach((message) => {
            ui.addMessage(message.role, getMessageDisplayContent(message), message.meta, {
                messageId: message.id,
                turnId: message.turnId
            });
        });
    }

    function appendAssistantSegmentImmediate(segment, turnId, createdAt) {
        const trimmedSegment = typeof segment === 'string' ? segment.trim() : '';
        if (!trimmedSegment) {
            return null;
        }

        const message = createChatMessage({
            role: 'assistant',
            content: trimmedSegment,
            turnId,
            metaOptions: {
                createdAt
            }
        });

        store.appendMessages([message]);
        appendMessagesToUi([message]);
        notifyConversationUpdated();
        return message;
    }

    function refillFailedInput(text) {
        chatInput.value = typeof text === 'string' ? text : '';
        resizeInputToContent(chatInput);
        chatInput.focus();
    }

    function showFailureMessage(title, detail, failedInputText) {
        ui.addErrorMessage({
            title,
            detail,
            actionLabel: failedInputText ? '回填输入框' : '',
            onAction: failedInputText
                ? () => refillFailedInput(failedInputText)
                : null
        });
    }

    async function renderAssistantSegments(segments, turnId, config, signal) {
        const createdAt = Date.now();
        const assistantMessages = [];
        let interrupted = false;

        for (let index = 0; index < segments.length; index += 1) {
            const segment = segments[index];
            const segmentCreatedAt = createdAt + index;

            if (!config.enablePseudoStream) {
                const message = createChatMessage({
                    role: 'assistant',
                    content: segment,
                    turnId,
                    metaOptions: {
                        createdAt: segmentCreatedAt
                    }
                });
                assistantMessages.push(message);
                continue;
            }

            const streamMessageEl = ui.createAssistantStreamingMessage();
            const streamResult = await runPseudoStream({
                text: segment,
                signal,
                baseDelayMs: 20,
                onProgress: (nextText) => {
                    ui.updateAssistantStreamingMessage(streamMessageEl, nextText);
                }
            });

            ui.finalizeAssistantStreamingMessage(streamMessageEl, streamResult.renderedText, {
                interrupted: streamResult.interrupted
            });

            if (streamResult.renderedText) {
                assistantMessages.push(createChatMessage({
                    role: 'assistant',
                    content: streamResult.renderedText,
                    turnId,
                    metaOptions: {
                        createdAt: segmentCreatedAt,
                        interrupted: streamResult.interrupted
                    }
                }));
            }

            if (streamResult.interrupted) {
                interrupted = true;
                break;
            }
        }

        if (!config.enablePseudoStream && assistantMessages.length > 0) {
            appendMessagesToUi(assistantMessages);
        }

        return {
            assistantMessages,
            interrupted
        };
    }

    async function generateAssistantResponse(config, turnId, failedInputText) {
        const requestSessionId = store.getActiveSessionId();
        const effectiveMaxContextMessages = resolveContextMaxMessages(maxContextMessages);
        const contextWindow = buildContextWindow(
            store.getActiveMessages(),
            maxContextTokens,
            effectiveMaxContextMessages
        );

        notifyContextTrim(contextWindow.isTrimmed);
        logContextWindowDebug(contextWindow, config);

        const loadingMessage = ui.addLoadingMessage();

        const abortController = new AbortController();
        store.startStreaming(abortController);
        ui.setStreamingUI(true);

        const timeoutId = setTimeout(() => {
            if (!store.isStreaming()) {
                return;
            }

            store.setAbortReason('connect_timeout');
            abortController.abort();
        }, connectTimeoutMs);

        let timeoutCleared = false;
        const clearConnectionTimeout = () => {
            if (timeoutCleared) {
                return;
            }

            clearTimeout(timeoutId);
            timeoutCleared = true;
        };

        const streamState = {
            splitter: null,
            persistedSegmentCount: 0
        };

        const consumeNonStreamingResponse = async () => {
            const response = await providerClient.generate({
                config,
                contextMessages: contextWindow.messages,
                signal: abortController.signal,
                onRetryNotice: (attempt, maxRetries, delayMs) => {
                    ui.showRetryNotice(attempt, maxRetries, delayMs);
                },
                onFallbackKey: () => {
                    ui.showBackupKeyNotice();
                }
            });

            if (store.getActiveSessionId() !== requestSessionId) {
                loadingMessage.remove();
                return;
            }

            clearConnectionTimeout();
            loadingMessage.remove();

            const renderResult = await renderAssistantSegments(
                response.segments,
                turnId,
                config,
                abortController.signal
            );

            if (renderResult.assistantMessages.length > 0) {
                store.appendMessages(renderResult.assistantMessages);
                notifyConversationUpdated();
            }

            if (renderResult.interrupted) {
                ui.addSystemNotice('Generation stopped by user. Partial response kept.', 3200);
            }
        };

        const consumeStreamingResponse = async () => {
            streamState.splitter = createMarkerStreamSplitter({
                markers: [ASSISTANT_SEGMENT_MARKER, ASSISTANT_SENTENCE_MARKER]
            });

            let segmentIndex = 0;
            const stream = providerClient.generateStream({
                config,
                contextMessages: contextWindow.messages,
                signal: abortController.signal,
                onRetryNotice: (attempt, maxRetries, delayMs) => {
                    ui.showRetryNotice(attempt, maxRetries, delayMs);
                },
                onFallbackKey: () => {
                    ui.showBackupKeyNotice();
                }
            });

            for await (const event of stream) {
                if (store.getActiveSessionId() !== requestSessionId) {
                    loadingMessage.remove();
                    return;
                }

                if (event?.type !== 'text-delta' || typeof event?.text !== 'string' || !event.text) {
                    continue;
                }

                clearConnectionTimeout();
                loadingMessage.remove();

                const completedSegments = streamState.splitter.push(event.text);
                for (const segment of completedSegments) {
                    const appended = appendAssistantSegmentImmediate(segment, turnId, Date.now() + segmentIndex);
                    if (appended) {
                        segmentIndex += 1;
                        streamState.persistedSegmentCount += 1;
                    }
                }
            }

            loadingMessage.remove();
            clearConnectionTimeout();

            const lastSegment = streamState.splitter.flush();
            if (lastSegment) {
                const appended = appendAssistantSegmentImmediate(lastSegment, turnId, Date.now() + segmentIndex);
                if (appended) {
                    streamState.persistedSegmentCount += 1;
                }
            }
        };

        const shouldUseStreaming = config.enablePseudoStream
            && typeof providerClient.generateStream === 'function';

        try {
            if (shouldUseStreaming) {
                await consumeStreamingResponse();
            } else {
                await consumeNonStreamingResponse();
            }
        } catch (rawError) {
            let error = rawError;

            if (store.getActiveSessionId() !== requestSessionId) {
                loadingMessage.remove();
                return;
            }

            const shouldFallbackToNonStreaming = shouldUseStreaming
                && streamState.persistedSegmentCount === 0
                && error?.name !== 'AbortError';

            if (shouldFallbackToNonStreaming) {
                streamState.splitter?.discardRemainder();
                try {
                    await consumeNonStreamingResponse();
                    return;
                } catch (fallbackError) {
                    error = fallbackError;
                }
            }

            if (error?.name === 'AbortError') {
                const abortReason = store.getAbortReason();
                loadingMessage.remove();

                if (abortReason === 'connect_timeout') {
                    showFailureMessage('Connection timeout', 'Check network status and API URL.', failedInputText);
                } else if (abortReason === 'user') {
                    if (shouldUseStreaming) {
                        streamState.splitter?.discardRemainder();
                        ui.addSystemNotice('Generation stopped. Unmarked partial content was discarded.', 3200);
                    } else {
                        ui.addSystemNotice('Generation stopped by user.');
                    }
                }
            } else {
                loadingMessage.remove();
                showFailureMessage('Request failed', error?.message || 'Unknown error', failedInputText);
            }
        } finally {
            if (!timeoutCleared) {
                clearTimeout(timeoutId);
            }

            loadingMessage.classList.remove('typing');
            store.finishStreaming();
            ui.setStreamingUI(false);
            chatInput.focus();
        }
    }

    async function sendMessage() {
        const text = chatInput.value.trim();
        if (!text || store.isStreaming()) {
            return;
        }

        const config = configManager.getConfig();
        const providerLabelMap = {
            gemini: 'Gemini',
            openai: 'OpenAI',
            anthropic: 'Anthropic'
        };
        const providerLabel = providerLabelMap[config.provider] || 'provider';

        if (!config.apiKey && !config.backupApiKey) {
            ui.addMessage('error', `Please set at least one ${providerLabel} API key in settings.`);
            settingsDiv.classList.remove('chat-settings-hidden');
            return;
        }

        if (!config.model) {
            ui.addMessage('error', `Please set a ${providerLabel} model name in settings.`);
            settingsDiv.classList.remove('chat-settings-hidden');
            return;
        }

        const activeSessionId = store.getActiveSessionId();
        if (typeof onUserMessageAccepted === 'function') {
            onUserMessageAccepted({
                sessionId: activeSessionId,
                text
            });
        }

        const userCreatedAt = Date.now();
        const turnId = createTurnId();

        const timestampPrefix = buildTimestampPrefix(config, userCreatedAt);
        const userNamePrefix = buildMessagePrefix(config);
        const userContextText = applyMessagePrefix(text, userNamePrefix);

        const messagesToAppend = [];

        if (timestampPrefix) {
            messagesToAppend.push(createChatMessage({
                role: 'user',
                content: timestampPrefix,
                turnId,
                metaOptions: {
                    displayContent: timestampPrefix,
                    contextContent: timestampPrefix,
                    createdAt: userCreatedAt,
                    displayRole: 'system',
                    isPrefixMessage: true,
                    prefixType: 'timestamp'
                }
            }));
        }

        messagesToAppend.push(createChatMessage({
            role: 'user',
            content: text,
            turnId,
            metaOptions: {
                displayContent: userContextText,
                contextContent: userContextText,
                createdAt: userCreatedAt
            }
        }));

        store.appendMessages(messagesToAppend);
        appendMessagesToUi(messagesToAppend);
        notifyConversationUpdated();

        chatInput.value = '';
        resizeInputToContent(chatInput);

        await generateAssistantResponse(config, turnId, text);
    }

    function stopGeneration() {
        store.requestAbort('user');
    }

    return {
        sendMessage,
        stopGeneration
    };
}
