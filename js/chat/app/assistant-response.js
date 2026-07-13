import { buildContextEnvelope } from '../core/context-window.js';
import { createChatMessage } from '../core/message-model.js';
import { createMarkerStreamSplitter } from '../core/marker-stream-splitter.js';
import { ASSISTANT_SEGMENT_MARKER, ASSISTANT_SENTENCE_MARKER } from '../constants.js';
import { buildRequestDiagnosticDetail } from './request-diagnostics.js';
import { resolveProviderEndpoint } from '../providers/provider-registry.js';
import { PROVIDER_EVENT_TYPES } from '../providers/provider-events.js';

const STREAMING_PLACEHOLDER = '正在输入中……';

export function createAssistantResponseManager({
    store,
    ui,
    providerClient,
    constants,
    chatInput
}) {
    const {
        connectTimeoutMs,
        maxContextTokens,
        maxContextMessages,
        tokenPerImage
    } = constants;

    let contextTrimNoticeShown = false;

    function notifyContextTrim(isTrimmed) {
        if (!isTrimmed) {
            contextTrimNoticeShown = false;
            return;
        }

        if (!contextTrimNoticeShown) {
            ui.addSystemNotice('Older messages were excluded from model context due to token limits.', 3500);
            contextTrimNoticeShown = true;
        }
    }

    function refillFailedInput(text) {
        chatInput.value = text;
        ui.resizeInput();
        chatInput.focus();
    }

    function showFailureMessage(title, detail, failedInputText) {
        ui.addErrorMessage({
            title,
            detail,
            actionLabel: failedInputText ? 'Retry' : '',
            onAction: failedInputText ? () => refillFailedInput(failedInputText) : null
        });
    }

    async function generateAssistantResponse(config, turnId, failedInputText) {
        const requestConversationId = store.getConversationId();
        const contextEnvelope = buildContextEnvelope(
            store.getActiveMessages(),
            config,
            { maxContextTokens, maxContextMessages, tokenPerImage }
        );

        notifyContextTrim(contextEnvelope.isTrimmed);

        const abortController = new AbortController();
        store.startStreaming(abortController);
        ui.setStreamingUI(true);

        let timeoutId = setTimeout(() => {
            store.requestAbort('connect_timeout');
        }, connectTimeoutMs);
        const clearConnectionTimeout = () => {
            clearTimeout(timeoutId);
            timeoutId = null;
        };

        let splitter = null;
        let activeStreamingMessage = null;
        let activeEndpoint = '';

        const isConversationStale = () => store.getConversationId() !== requestConversationId;

        const dropStreamingPlaceholder = () => {
            activeStreamingMessage?.remove();
            activeStreamingMessage = null;
        };

        const providerParams = {
            config,
            localMessageEnvelope: contextEnvelope,
            signal: abortController.signal,
            onRetryNotice: (attempt, maxRetries, delayMs) => {
                ui.showRetryNotice(attempt, maxRetries, delayMs);
            },
            onFallbackKey: () => {
                ui.showBackupKeyNotice();
            }
        };

        try {
            activeEndpoint = resolveProviderEndpoint(config, true);
            splitter = createMarkerStreamSplitter({
                markers: [ASSISTANT_SEGMENT_MARKER, ASSISTANT_SENTENCE_MARKER]
            });

            const ensureStreamingPlaceholder = () => {
                if (!activeStreamingMessage) {
                    activeStreamingMessage = ui.createAssistantStreamingMessage({}, {
                        initialText: STREAMING_PLACEHOLDER,
                        placeholder: true
                    });
                }
                return activeStreamingMessage;
            };

            const finalizeStreamingSegment = (segment) => {
                const text = segment.trim();
                if (!text) return;

                const messageElement = ensureStreamingPlaceholder();
                ui.finalizeAssistantStreamingMessage(messageElement, text);
                activeStreamingMessage = null;
                store.appendMessages([createChatMessage({
                    role: 'assistant',
                    content: text,
                    turnId
                })]);
            };

            for await (const event of providerClient.generateStream(providerParams)) {
                if (isConversationStale()) {
                    dropStreamingPlaceholder();
                    return;
                }

                clearConnectionTimeout();

                if (event.type === PROVIDER_EVENT_TYPES.PING) {
                    continue;
                }
                if (event.type === PROVIDER_EVENT_TYPES.REASONING) {
                    ensureStreamingPlaceholder();
                    continue;
                }
                if (event.type !== PROVIDER_EVENT_TYPES.TEXT_DELTA) {
                    throw new Error(`Unsupported provider stream event: ${event.type}`);
                }

                ensureStreamingPlaceholder();
                const completedSegments = splitter.push(event.text);
                completedSegments.forEach(finalizeStreamingSegment);
                if (completedSegments.length > 0) {
                    ensureStreamingPlaceholder();
                }
            }

            clearConnectionTimeout();

            const finalSegment = splitter.flush();
            if (finalSegment) {
                finalizeStreamingSegment(finalSegment);
            } else {
                dropStreamingPlaceholder();
            }
        } catch (error) {
            if (isConversationStale()) {
                dropStreamingPlaceholder();
                return;
            }

            dropStreamingPlaceholder();

            if (error?.name === 'AbortError') {
                const abortReason = store.getAbortReason();
                if (abortReason === 'connect_timeout') {
                    showFailureMessage('Connection timeout', buildRequestDiagnosticDetail(config, {
                        endpoint: activeEndpoint,
                        useStreaming: true,
                        timeoutMs: connectTimeoutMs,
                        errorDetail: 'Connection timed out before the first response chunk.'
                    }), failedInputText);
                } else if (abortReason === 'user') {
                    splitter?.discardRemainder();
                    ui.addSystemNotice('Generation stopped. Unmarked partial content was discarded.', 3200);
                }
            } else {
                showFailureMessage('Request failed', buildRequestDiagnosticDetail(config, {
                    endpoint: activeEndpoint,
                    useStreaming: true,
                    timeoutMs: connectTimeoutMs,
                    errorDetail: error.message
                }), failedInputText);
            }
        } finally {
            clearConnectionTimeout();
            dropStreamingPlaceholder();
            store.finishStreaming();
            ui.setStreamingUI(false);
            chatInput.focus();
        }
    }

    return { generateAssistantResponse };
}
