import { useCallback, useEffect, useRef, useState } from 'react';

import { Icon } from '../shared/Icon.jsx';
import { ChatComposer } from './components/ChatComposer.jsx';
import { MessageList } from './components/MessageList.jsx';
import { ChatSettings } from './config/ChatSettings.jsx';
import { useChatConfig } from './config/useChatConfig.js';
import { useChat } from './useChat.js';

const PANEL_MODE = Object.freeze({
    closed: 'closed',
    chat: 'chat',
    settings: 'settings'
});

export function ChatFeature() {
    const [mode, setMode] = useState(PANEL_MODE.closed);
    const toggleRef = useRef(null);
    const settingsButtonRef = useRef(null);
    const previousModeRef = useRef(mode);
    const chatConfig = useChatConfig();
    const isOpen = mode !== PANEL_MODE.closed;
    const settingsOpen = mode === PANEL_MODE.settings;
    const openSettings = useCallback(() => setMode(PANEL_MODE.settings), []);
    const closeSettings = useCallback(() => setMode(PANEL_MODE.chat), []);
    const chat = useChat({
        requestConfig: chatConfig.requestConfig,
        onRequireSettings: openSettings
    });

    useEffect(() => {
        if (!isOpen) return undefined;
        document.body.classList.add('chat-open');
        return () => document.body.classList.remove('chat-open');
    }, [isOpen]);

    useEffect(() => {
        const previousMode = previousModeRef.current;
        previousModeRef.current = mode;
        let target = null;

        if (mode === PANEL_MODE.closed && previousMode !== PANEL_MODE.closed) {
            target = toggleRef.current;
        } else if (mode === PANEL_MODE.chat) {
            target = previousMode === PANEL_MODE.settings
                ? settingsButtonRef.current
                : chat.inputRef.current;
        }

        if (!target) return undefined;
        const frameId = requestAnimationFrame(() => target.focus());
        return () => cancelAnimationFrame(frameId);
    }, [chat.inputRef, mode]);

    const openChat = useCallback(() => {
        setMode(PANEL_MODE.chat);
    }, []);

    const closeChat = useCallback(() => {
        setMode(PANEL_MODE.closed);
    }, []);

    const clearConversation = useCallback(() => {
        chat.clearConversation();
    }, [chat.clearConversation]);

    const sendMessage = useCallback(() => {
        return chat.sendMessage();
    }, [chat.sendMessage]);

    const stopGeneration = useCallback(() => {
        chat.stopGeneration();
    }, [chat.stopGeneration]);

    return (
        <>
            <button
                id="chat-toggle"
                ref={toggleRef}
                type="button"
                aria-label="Open chat"
                aria-controls="chat-panel"
                aria-expanded={isOpen}
                title="AI Chat"
                onClick={openChat}
            >
                <Icon name="comments" />
            </button>

            <div
                id="chat-panel"
                className={isOpen ? undefined : 'chat-hidden'}
                role="dialog"
                aria-label="AI Chat"
                aria-hidden={!isOpen}
            >
                <div id="chat-header" inert={settingsOpen}>
                    <div id="chat-title-group">
                        <span id="chat-title">AI Chat</span>
                    </div>
                    <div id="chat-header-actions">
                        <button
                            id="chat-settings-btn"
                            ref={settingsButtonRef}
                            type="button"
                            title="Settings"
                            aria-label="Settings"
                            aria-controls="chat-settings"
                            aria-expanded={settingsOpen}
                            onClick={() => (
                                settingsOpen ? closeSettings() : openSettings()
                            )}
                        >
                            <Icon name="settings" />
                        </button>
                        <button
                            id="chat-clear-btn"
                            type="button"
                            title="Start new chat"
                            aria-label="Start new chat"
                            disabled={chat.isStreaming}
                            onClick={clearConversation}
                        >
                            <Icon name="trash" />
                        </button>
                        <button
                            id="chat-close-btn"
                            type="button"
                            title="Close"
                            aria-label="Close chat"
                            onClick={closeChat}
                        >
                            <Icon name="close" />
                        </button>
                    </div>
                </div>

                <ChatSettings
                    chatConfig={chatConfig}
                    isOpen={settingsOpen}
                    onClose={closeSettings}
                    onSaved={undefined}
                />

                <MessageList
                    messages={chat.messages}
                    status={chat.status}
                    error={chat.error}
                    onRegenerate={chat.regenerateMessage}

                    inert={settingsOpen}
                />

                <ChatComposer
                    input={chat.input}
                    setInput={chat.setInput}
                    attachments={chat.attachments}
                    onAddFiles={chat.addFiles}
                    onRemoveAttachment={chat.removeAttachment}
                    onSend={sendMessage}
                    onStop={stopGeneration}
                    isStreaming={chat.isStreaming}
                    inputRef={chat.inputRef}
                    inert={settingsOpen}
                />
            </div>
        </>
    );
}
