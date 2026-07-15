import { useCallback, useEffect, useRef, useState } from 'react';

import { Icon } from '../shared/Icon.jsx';
import { Composer } from './components/Composer.jsx';
import { MessageList } from './components/MessageList.jsx';
import { Settings } from './components/Settings.jsx';
import { useConversation } from './hooks/useConversation.js';
import { useSettings } from './hooks/useSettings.js';
import './Assistant.css';

const PANEL_MODE = {
    closed: 'closed',
    conversation: 'conversation',
    settings: 'settings'
};

export function Assistant() {
    const [panelMode, setPanelMode] = useState(PANEL_MODE.closed);
    const toggleRef = useRef(null);
    const settingsButtonRef = useRef(null);
    const previousPanelModeRef = useRef(panelMode);
    const settings = useSettings();
    const isPanelOpen = panelMode !== PANEL_MODE.closed;
    const isSettingsOpen = panelMode === PANEL_MODE.settings;
    const openSettings = useCallback(() => setPanelMode(PANEL_MODE.settings), []);
    const closeSettings = useCallback(() => setPanelMode(PANEL_MODE.conversation), []);
    const conversation = useConversation({
        providerConfig: settings.providerConfig,
        onRequireSettings: openSettings
    });

    useEffect(() => {
        if (!isPanelOpen) return;
        document.body.classList.add('assistant-open');
        return () => document.body.classList.remove('assistant-open');
    }, [isPanelOpen]);

    useEffect(() => {
        const previousPanelMode = previousPanelModeRef.current;
        previousPanelModeRef.current = panelMode;
        let target = null;

        if (panelMode === PANEL_MODE.closed && previousPanelMode !== PANEL_MODE.closed) {
            target = toggleRef.current;
        } else if (panelMode === PANEL_MODE.conversation) {
            target = previousPanelMode === PANEL_MODE.settings
                ? settingsButtonRef.current
                : conversation.inputRef.current;
        }

        if (!target) return;
        const frameId = requestAnimationFrame(() => target.focus());
        return () => cancelAnimationFrame(frameId);
    }, [panelMode]);

    return (
        <>
            <button
                id="assistant-toggle"
                ref={toggleRef}
                type="button"
                aria-label="Open assistant"
                aria-controls="assistant-panel"
                aria-expanded={isPanelOpen}
                title="AI Assistant"
                onClick={() => setPanelMode(PANEL_MODE.conversation)}
            >
                <Icon name="comments" />
            </button>

            <div
                id="assistant-panel"
                className={isPanelOpen ? undefined : 'assistant-hidden'}
                role="dialog"
                aria-label="AI Assistant"
                aria-hidden={!isPanelOpen}
            >
                <div id="assistant-header">
                    <span id="assistant-title">AI Assistant</span>
                    <div id="assistant-header-actions">
                        <button
                            id="assistant-settings-button"
                            ref={settingsButtonRef}
                            type="button"
                            title="Settings"
                            aria-label="Settings"
                            aria-controls="assistant-settings"
                            aria-expanded={isSettingsOpen}
                            onClick={isSettingsOpen ? closeSettings : openSettings}
                        >
                            <Icon name="settings" />
                        </button>
                        <button
                            id="assistant-clear-button"
                            type="button"
                            title="Start new conversation"
                            aria-label="Start new conversation"
                            disabled={conversation.isStreaming}
                            onClick={conversation.clearConversation}
                        >
                            <Icon name="trash" />
                        </button>
                        <button
                            id="assistant-close-button"
                            type="button"
                            title="Close"
                            aria-label="Close assistant"
                            onClick={() => setPanelMode(PANEL_MODE.closed)}
                        >
                            <Icon name="close" />
                        </button>
                    </div>
                </div>

                <Settings
                    settings={settings}
                    isOpen={isSettingsOpen}
                    onClose={closeSettings}
                />

                <MessageList
                    messages={conversation.messages}
                    status={conversation.status}
                    error={conversation.error}
                    onRegenerate={conversation.regenerateResponse}
                />

                <Composer
                    input={conversation.input}
                    setInput={conversation.setInput}
                    attachments={conversation.attachments}
                    onAddAttachments={conversation.addAttachments}
                    onRemoveAttachment={conversation.removeAttachment}
                    onSend={conversation.sendMessage}
                    onStop={conversation.stopGeneration}
                    isStreaming={conversation.isStreaming}
                    inputRef={conversation.inputRef}
                />
            </div>
        </>
    );
}
