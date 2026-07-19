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
    const panelRef = useRef(null);
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

    const handlePanelKeyDown = (event) => {
        if (event.key === 'Escape') {
            // 设置弹窗是原生 dialog，Esc 由其 onCancel 处理
            if (!isSettingsOpen) setPanelMode(PANEL_MODE.closed);
            return;
        }

        if (event.key !== 'Tab' || isSettingsOpen) return;

        const focusableElements = Array.from(panelRef.current.querySelectorAll(
            'button:not(:disabled), input:not(:disabled), select:not(:disabled), '
            + 'textarea:not(:disabled), a[href], [tabindex]:not([tabindex="-1"])'
        )).filter((element) => element.offsetParent !== null);

        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (event.shiftKey && document.activeElement === firstElement) {
            event.preventDefault();
            lastElement.focus();
        } else if (!event.shiftKey && document.activeElement === lastElement) {
            event.preventDefault();
            firstElement.focus();
        }
    };

    return (
        <>
            <button
                id="assistant-toggle"
                ref={toggleRef}
                type="button"
                aria-label="打开助手"
                aria-controls="assistant-panel"
                aria-expanded={isPanelOpen}
                title="AI 助手"
                onClick={() => setPanelMode(PANEL_MODE.conversation)}
            >
                <Icon name="comments" />
            </button>

            <div
                id="assistant-panel"
                ref={panelRef}
                className={isPanelOpen ? undefined : 'assistant-hidden'}
                role="dialog"
                aria-label="AI 助手"
                aria-hidden={!isPanelOpen}
                onKeyDown={handlePanelKeyDown}
            >
                <div id="assistant-header">
                    <span id="assistant-title">AI 助手</span>
                    <div id="assistant-header-actions">
                        <button
                            id="assistant-settings-button"
                            ref={settingsButtonRef}
                            type="button"
                            title="设置"
                            aria-label="设置"
                            aria-controls="assistant-settings"
                            aria-expanded={isSettingsOpen}
                            onClick={isSettingsOpen ? closeSettings : openSettings}
                        >
                            <Icon name="settings" />
                        </button>
                        <button
                            id="assistant-clear-button"
                            type="button"
                            title="新建对话"
                            aria-label="新建对话"
                            disabled={conversation.isStreaming}
                            onClick={conversation.clearConversation}
                        >
                            <Icon name="trash" />
                        </button>
                        <button
                            id="assistant-close-button"
                            type="button"
                            title="关闭"
                            aria-label="关闭助手"
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
