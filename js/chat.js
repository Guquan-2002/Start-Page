import { $ } from './utils.js';
import { CHAT_DRAFTS_KEY, CHAT_HISTORY_KEY, CHAT_LIMITS, CHAT_STORAGE_KEY } from './chat/constants.js';
import { createConfigManager } from './chat/config.js';
import { setupMarked, renderMarkdown } from './chat/markdown.js';
import { createUiManager } from './chat/ui.js';
import { createHistoryManager } from './chat/history.js';
import { createApiManager } from './chat/api.js';
import { initCustomSelect } from './chat/custom-select.js';
import { createSessionStore } from './chat/state/session-store.js';
import { getMessageDisplayContent } from './chat/core/message-model.js';
import { createGeminiProvider } from './chat/providers/gemini-provider.js';
import { createDraftManager } from './chat/storage/draft-storage.js';

function getChatElements() {
    return {
        panel: $('#chat-panel'),
        toggleBtn: $('#chat-toggle'),
        closeBtn: $('#chat-close-btn'),
        clearBtn: $('#chat-clear-btn'),
        settingsBtn: $('#chat-settings-btn'),
        settingsDiv: $('#chat-settings'),
        settingsCloseBtn: $('#cfg-close-btn'),
        saveBtn: $('#cfg-save-btn'),
        historyBtn: $('#chat-history-btn'),
        historyDiv: $('#chat-history'),
        historyList: $('#chat-history-list'),
        newSessionBtn: $('#chat-new-session-btn'),
        clearAllBtn: $('#chat-clear-all-btn'),
        messagesEl: $('#chat-messages'),
        chatInput: $('#chat-input'),
        sendBtn: $('#chat-send-btn'),
        stopBtn: $('#chat-stop-btn'),
        cfgUrl: $('#cfg-api-url'),
        cfgKey: $('#cfg-api-key'),
        cfgBackupKey: $('#cfg-api-key-backup'),
        cfgModel: $('#cfg-model'),
        cfgPrompt: $('#cfg-system-prompt'),
        cfgThinkingBudget: $('#cfg-thinking-budget'),
        cfgSearchMode: $('#cfg-search-mode'),
        cfgEnablePseudoStream: $('#cfg-enable-pseudo-stream'),
        cfgEnableDraftAutosave: $('#cfg-enable-draft-autosave'),
        cfgPrefixWithTime: $('#cfg-prefix-with-time'),
        cfgPrefixWithName: $('#cfg-prefix-with-name'),
        cfgUserName: $('#cfg-user-name')
    };
}

function resizeChatInput(chatInput) {
    chatInput.style.height = 'auto';
    chatInput.style.height = `${Math.min(chatInput.scrollHeight, 120)}px`;
}

function setupInputAutosize(chatInput) {
    chatInput.addEventListener('input', () => {
        resizeChatInput(chatInput);
    });
}

export function initChat() {
    const elements = getChatElements();
    const store = createSessionStore({
        storage: globalThis.localStorage,
        historyKey: CHAT_HISTORY_KEY
    });
    const draftManager = createDraftManager({
        storage: globalThis.localStorage,
        storageKey: CHAT_DRAFTS_KEY
    });

    const configManager = createConfigManager({
        cfgUrl: elements.cfgUrl,
        cfgKey: elements.cfgKey,
        cfgBackupKey: elements.cfgBackupKey,
        cfgModel: elements.cfgModel,
        cfgPrompt: elements.cfgPrompt,
        cfgThinkingBudget: elements.cfgThinkingBudget,
        cfgSearchMode: elements.cfgSearchMode,
        cfgEnablePseudoStream: elements.cfgEnablePseudoStream,
        cfgEnableDraftAutosave: elements.cfgEnableDraftAutosave,
        cfgPrefixWithTime: elements.cfgPrefixWithTime,
        cfgPrefixWithName: elements.cfgPrefixWithName,
        cfgUserName: elements.cfgUserName
    }, CHAT_STORAGE_KEY);

    let historyManager = null;
    let draftSaveTimerId = null;

    const getRuntimeConfig = () => configManager.getConfig();

    const renderActiveConversation = () => {
        ui.renderConversation(store.getActiveMessages(), getMessageDisplayContent);
    };

    const restoreDraftForActiveSession = () => {
        const config = getRuntimeConfig();
        if (!config.enableDraftAutosave) {
            elements.chatInput.value = '';
            resizeChatInput(elements.chatInput);
            return;
        }

        const activeSessionId = store.getActiveSessionId();
        const draftText = draftManager.getDraft(activeSessionId);
        elements.chatInput.value = draftText;
        resizeChatInput(elements.chatInput);
    };

    const scheduleDraftSave = () => {
        clearTimeout(draftSaveTimerId);

        const config = getRuntimeConfig();
        if (!config.enableDraftAutosave) {
            return;
        }

        const sessionId = store.getActiveSessionId();
        const draftText = elements.chatInput.value;

        draftSaveTimerId = setTimeout(() => {
            draftManager.setDraft(sessionId, draftText);
        }, 250);
    };

    const saveDraftImmediately = () => {
        clearTimeout(draftSaveTimerId);

        const config = getRuntimeConfig();
        if (!config.enableDraftAutosave) {
            return;
        }

        draftManager.setDraft(store.getActiveSessionId(), elements.chatInput.value);
    };

    const ui = createUiManager({
        elements: {
            messagesEl: elements.messagesEl,
            chatInput: elements.chatInput,
            sendBtn: elements.sendBtn,
            stopBtn: elements.stopBtn,
            sessionActionButtons: [
                elements.historyBtn,
                elements.clearBtn,
                elements.newSessionBtn,
                elements.clearAllBtn
            ]
        },
        renderMarkdown,
        maxRenderedMessages: CHAT_LIMITS.maxRenderedMessages,
        isRetryBlocked: () => store.isStreaming(),
        onRetryRequested: ({ turnId, content }) => {
            if (store.isStreaming()) {
                return;
            }

            const rollbackResult = store.rollbackToTurn(turnId);
            if (!rollbackResult) {
                return;
            }

            renderActiveConversation();
            elements.chatInput.value = rollbackResult.retryContent || content;
            resizeChatInput(elements.chatInput);
            elements.chatInput.focus();
            saveDraftImmediately();

            historyManager?.renderHistoryList();
        }
    });

    const notifySessionBusy = () => {
        ui.addSystemNotice('Please stop generation before switching or editing chat sessions.', 3000);
    };

    historyManager = createHistoryManager({
        store,
        elements: {
            historyDiv: elements.historyDiv,
            historyList: elements.historyList
        },
        onSessionActivated: () => {
            renderActiveConversation();
            restoreDraftForActiveSession();
            historyManager.renderHistoryList();
        },
        onSessionDeleted: (sessionId) => {
            draftManager.removeDraft(sessionId);
        },
        onSessionsCleared: () => {
            draftManager.clearAllDrafts();
        },
        isSessionOperationBlocked: () => store.isStreaming(),
        onBlockedSessionOperation: notifySessionBusy
    });

    const provider = createGeminiProvider({
        maxRetries: CHAT_LIMITS.maxRetries
    });

    const apiManager = createApiManager({
        store,
        elements: {
            chatInput: elements.chatInput,
            settingsDiv: elements.settingsDiv
        },
        ui,
        configManager,
        provider,
        constants: {
            connectTimeoutMs: CHAT_LIMITS.connectTimeoutMs,
            maxContextTokens: CHAT_LIMITS.maxContextTokens,
            maxContextMessages: CHAT_LIMITS.maxContextMessages
        },
        onConversationUpdated: () => {
            historyManager.renderHistoryList();
        },
        onUserMessageAccepted: ({ sessionId }) => {
            clearTimeout(draftSaveTimerId);
            draftManager.removeDraft(sessionId);
        }
    });

    const openSettings = () => {
        elements.settingsDiv.classList.remove('chat-settings-hidden');
        elements.historyDiv.classList.add('chat-history-hidden');
        elements.cfgUrl.focus();
    };

    const closeSettings = () => {
        elements.settingsDiv.classList.add('chat-settings-hidden');
    };

    setupMarked();
    setupInputAutosize(elements.chatInput);

    elements.chatInput.addEventListener('input', scheduleDraftSave);
    elements.chatInput.addEventListener('blur', saveDraftImmediately);
    globalThis.addEventListener('beforeunload', saveDraftImmediately);

    elements.toggleBtn.addEventListener('click', () => {
        elements.panel.classList.remove('chat-hidden');
        if (elements.settingsDiv.classList.contains('chat-settings-hidden')) {
            elements.chatInput.focus();
        } else {
            elements.cfgUrl.focus();
        }
    });

    elements.closeBtn.addEventListener('click', () => {
        elements.panel.classList.add('chat-hidden');
        closeSettings();
    });

    elements.settingsBtn.addEventListener('click', () => {
        if (elements.settingsDiv.classList.contains('chat-settings-hidden')) {
            openSettings();
            return;
        }

        closeSettings();
    });

    elements.saveBtn.addEventListener('click', () => {
        configManager.saveConfig();

        const latestConfig = getRuntimeConfig();
        if (!latestConfig.enableDraftAutosave) {
            clearTimeout(draftSaveTimerId);
        }

        if (latestConfig.enableDraftAutosave && !elements.chatInput.value.trim()) {
            restoreDraftForActiveSession();
        }

        closeSettings();
    });

    elements.settingsCloseBtn.addEventListener('click', closeSettings);

    elements.historyBtn.addEventListener('click', () => {
        if (store.isStreaming()) {
            notifySessionBusy();
            return;
        }

        elements.historyDiv.classList.toggle('chat-history-hidden');
        closeSettings();

        if (!elements.historyDiv.classList.contains('chat-history-hidden')) {
            historyManager.renderHistoryList();
        }
    });

    elements.newSessionBtn.addEventListener('click', () => {
        if (store.isStreaming()) {
            notifySessionBusy();
            return;
        }

        historyManager.createNewSession();
        elements.historyDiv.classList.add('chat-history-hidden');
        historyManager.renderHistoryList();
    });

    elements.clearAllBtn.addEventListener('click', () => {
        if (store.isStreaming()) {
            notifySessionBusy();
            return;
        }

        historyManager.clearAllSessions();
    });

    elements.clearBtn.addEventListener('click', () => {
        if (store.isStreaming()) {
            notifySessionBusy();
            return;
        }

        historyManager.createNewSession();
        ui.setStreamingUI(false);
        closeSettings();
    });

    elements.stopBtn.addEventListener('click', () => {
        apiManager.stopGeneration();
    });

    elements.sendBtn.addEventListener('click', apiManager.sendMessage);

    elements.chatInput.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' || event.shiftKey) return;
        event.preventDefault();
        apiManager.sendMessage();
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && !elements.settingsDiv.classList.contains('chat-settings-hidden')) {
            closeSettings();
        }
    });

    configManager.loadConfig();
    initCustomSelect(elements.cfgSearchMode);

    store.initialize();
    renderActiveConversation();
    restoreDraftForActiveSession();
    historyManager.renderHistoryList();
}
