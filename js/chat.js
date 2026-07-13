// Chat bootstrap: wires chat UI, state, providers, config, and event handlers.
import { $ } from './utils.js';
import { CHAT_LIMITS, CHAT_STORAGE_KEY } from './chat/constants.js';
import { createConfigManager } from './chat/app/config-manager.js';
import { createApiManager } from './chat/app/api-manager.js';
import { setupMarked, renderMarkdown } from './chat/ui/markdown.js';
import { createUiManager } from './chat/ui/ui-manager.js';
import { createConversationStore } from './chat/session/conversation-store.js';
import { createProviderRouter, createRegisteredProviderClients } from './chat/providers/provider-clients.js';

function requiredElement(selector) {
    const element = $(selector);
    if (!element) {
        throw new Error(`Missing required chat element: ${selector}`);
    }
    return element;
}

function getChatElements() {
    return {
        panel: requiredElement('#chat-panel'),
        toggleBtn: requiredElement('#chat-toggle'),
        closeBtn: requiredElement('#chat-close-btn'),
        clearBtn: requiredElement('#chat-clear-btn'),
        settingsBtn: requiredElement('#chat-settings-btn'),
        settingsDiv: requiredElement('#chat-settings'),
        settingsCloseBtn: requiredElement('#cfg-close-btn'),
        saveBtn: requiredElement('#cfg-save-btn'),
        messagesEl: requiredElement('#chat-messages'),
        chatInput: requiredElement('#chat-input'),
        attachBtn: requiredElement('#chat-attach-btn'),
        imageInput: requiredElement('#chat-image-input'),
        attachmentsEl: requiredElement('#chat-attachments'),
        sendBtn: requiredElement('#chat-send-btn'),
        stopBtn: requiredElement('#chat-stop-btn'),
        cfgProvider: requiredElement('#cfg-provider'),
        cfgUrl: requiredElement('#cfg-api-url'),
        cfgKey: requiredElement('#cfg-api-key'),
        cfgBackupKey: requiredElement('#cfg-api-key-backup'),
        cfgModel: requiredElement('#cfg-model'),
        cfgPrompt: requiredElement('#cfg-system-prompt'),
        cfgThinkingLevel: requiredElement('#cfg-thinking-level'),
        cfgThinkingLabel: requiredElement('#cfg-thinking-label'),
        cfgThinkingNote: requiredElement('#cfg-thinking-note'),
        cfgSearchEnabled: requiredElement('#cfg-search-enabled'),
        cfgSearchLabel: requiredElement('#cfg-search-label'),
        cfgSearchNote: requiredElement('#cfg-search-note'),
        cfgPrefixWithTime: requiredElement('#cfg-prefix-with-time'),
        cfgPrefixWithName: requiredElement('#cfg-prefix-with-name'),
        cfgUserName: requiredElement('#cfg-user-name')
    };
}

export function initChat() {
    const elements = getChatElements();
    const store = createConversationStore();
    const configManager = createConfigManager({
        cfgProvider: elements.cfgProvider,
        cfgUrl: elements.cfgUrl,
        cfgKey: elements.cfgKey,
        cfgBackupKey: elements.cfgBackupKey,
        cfgModel: elements.cfgModel,
        cfgPrompt: elements.cfgPrompt,
        cfgThinkingLevel: elements.cfgThinkingLevel,
        cfgThinkingLabel: elements.cfgThinkingLabel,
        cfgThinkingNote: elements.cfgThinkingNote,
        cfgSearchEnabled: elements.cfgSearchEnabled,
        cfgSearchLabel: elements.cfgSearchLabel,
        cfgSearchNote: elements.cfgSearchNote,
        cfgPrefixWithTime: elements.cfgPrefixWithTime,
        cfgPrefixWithName: elements.cfgPrefixWithName,
        cfgUserName: elements.cfgUserName
    }, CHAT_STORAGE_KEY);

    const renderActiveConversation = () => {
        ui.renderConversation(store.getActiveMessages());
    };
    const openSettings = () => {
        elements.settingsDiv.classList.remove('chat-settings-hidden');
        elements.cfgProvider.focus();
    };
    const closeSettings = () => {
        elements.settingsDiv.classList.add('chat-settings-hidden');
    };

    const ui = createUiManager({
        elements: {
            messagesEl: elements.messagesEl,
            chatInput: elements.chatInput,
            attachBtn: elements.attachBtn,
            sendBtn: elements.sendBtn,
            stopBtn: elements.stopBtn,
            sessionActionButtons: [elements.clearBtn]
        },
        renderMarkdown,
        maxRenderedMessages: CHAT_LIMITS.maxRenderedMessages,
        isRetryBlocked: () => store.isStreaming(),
        onRetryRequested: ({ turnId, content }) => {
            const rollbackResult = store.rollbackToTurn(turnId);
            if (!rollbackResult) {
                return;
            }

            renderActiveConversation();
            elements.chatInput.value = rollbackResult.retryContent || content;
            ui.resizeInput();
            elements.chatInput.focus();
        }
    });

    const provider = createProviderRouter(createRegisteredProviderClients({
        maxRetries: CHAT_LIMITS.maxRetries
    }));
    const apiManager = createApiManager({
        store,
        elements: {
            chatInput: elements.chatInput,
            attachBtn: elements.attachBtn,
            imageInput: elements.imageInput,
            attachmentsEl: elements.attachmentsEl
        },
        ui,
        configManager,
        provider,
        openSettings,
        constants: {
            connectTimeoutMs: CHAT_LIMITS.connectTimeoutMs,
            maxContextTokens: CHAT_LIMITS.maxContextTokens,
            maxContextMessages: CHAT_LIMITS.maxContextMessages,
            tokenPerImage: CHAT_LIMITS.tokenPerImage
        },
        onUserMessageAccepted: () => {
            elements.sendBtn.classList.remove('has-text');
        }
    });

    setupMarked();
    elements.chatInput.addEventListener('input', () => {
        ui.resizeInput();
        elements.sendBtn.classList.toggle('has-text', elements.chatInput.value.trim().length > 0);
    });

    elements.toggleBtn.addEventListener('click', () => {
        elements.panel.classList.remove('chat-hidden');
        requestAnimationFrame(() => {
            if (elements.settingsDiv.classList.contains('chat-settings-hidden')) {
                elements.chatInput.focus();
            } else {
                elements.cfgUrl.focus();
            }
        });
    });
    elements.closeBtn.addEventListener('click', () => {
        elements.panel.classList.add('chat-hidden');
        closeSettings();
    });
    elements.settingsBtn.addEventListener('click', () => {
        if (elements.settingsDiv.classList.contains('chat-settings-hidden')) {
            openSettings();
        } else {
            closeSettings();
        }
    });
    elements.saveBtn.addEventListener('click', () => {
        configManager.saveConfig();
        closeSettings();
    });
    elements.settingsCloseBtn.addEventListener('click', closeSettings);

    elements.clearBtn.addEventListener('click', () => {
        if (store.isStreaming()) {
            ui.addSystemNotice('Please stop generation before starting a new chat.', 3000);
            return;
        }
        store.clearConversation();
        renderActiveConversation();
        elements.chatInput.value = '';
        ui.resizeInput();
        closeSettings();
        elements.chatInput.focus();
    });
    elements.stopBtn.addEventListener('click', () => {
        apiManager.stopGeneration();
    });
    elements.sendBtn.addEventListener('click', apiManager.sendMessage);
    elements.chatInput.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' || event.shiftKey) {
            return;
        }
        event.preventDefault();
        apiManager.sendMessage();
    });
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && !elements.settingsDiv.classList.contains('chat-settings-hidden')) {
            closeSettings();
        }
    });

    configManager.loadConfig();
    renderActiveConversation();
}
