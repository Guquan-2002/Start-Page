import { useEffect, useRef } from 'react';

import { Icon } from '../../shared/Icon.jsx';

const NOOP = () => {};
const FOCUSABLE_SELECTOR = [
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])'
].join(',');

export function ChatSettings({
    chatConfig,
    isOpen = false,
    onClose = NOOP,
    onSaved = NOOP
}) {
    const dialogRef = useRef(null);
    const providerSelectRef = useRef(null);

    useEffect(() => {
        if (!isOpen) {
            return undefined;
        }

        providerSelectRef.current?.focus();
        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                onClose();
                return;
            }

            if (event.key !== 'Tab') return;
            const focusable = Array.from(
                dialogRef.current?.querySelectorAll(FOCUSABLE_SELECTOR) || []
            );
            if (focusable.length === 0) return;

            const first = focusable[0];
            const last = focusable.at(-1);
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    if (!chatConfig) {
        throw new TypeError('ChatSettings requires the value returned by useChatConfig().');
    }

    const {
        config,
        activeProfile,
        providers,
        presentation,
        setProvider,
        updateProfile,
        updateCommon,
        saveConfig
    } = chatConfig;
    const reasoning = presentation.reasoning;
    const search = presentation.search;
    const placeholders = presentation.placeholders;

    const handleSave = () => {
        if (saveConfig()) {
            onSaved();
        }
        onClose();
    };

    return (
        <div
            id="chat-settings"
            ref={dialogRef}
            className={isOpen ? undefined : 'chat-settings-hidden'}
            role="dialog"
            aria-labelledby="chat-settings-title"
            aria-modal="true"
            aria-hidden={!isOpen}
            inert={!isOpen}
        >
            <div className="chat-settings-overlay">
                <div className="chat-settings-header">
                    <div className="chat-settings-title-group">
                        <span id="chat-settings-title" className="chat-settings-title">AI Settings</span>
                        <small className="chat-settings-subtitle">
                            Configure provider, API URL, key, model, prompt, and optional features.
                        </small>
                    </div>
                    <button
                        id="cfg-close-btn"
                        type="button"
                        title="Close settings"
                        aria-label="Close settings"
                        onClick={onClose}
                    >
                        <Icon name="close" />
                    </button>
                </div>

                <div className="chat-settings-content">
                    <label htmlFor="cfg-provider">
                        Provider
                        <select
                            id="cfg-provider"
                            ref={providerSelectRef}
                            value={config.provider}
                            onChange={(event) => setProvider(event.target.value)}
                        >
                            {providers.map((provider) => (
                                <option key={provider.id} value={provider.id}>
                                    {provider.settingsLabel}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label htmlFor="cfg-api-url">
                        API URL
                        <input
                            id="cfg-api-url"
                            type="text"
                            value={activeProfile.apiUrl}
                            placeholder={placeholders.apiUrl}
                            spellCheck={false}
                            onChange={(event) => updateProfile('apiUrl', event.target.value)}
                        />
                    </label>

                    <label htmlFor="cfg-api-key">
                        API Key
                        <input
                            id="cfg-api-key"
                            type="password"
                            value={activeProfile.apiKey}
                            placeholder={placeholders.apiKey}
                            spellCheck={false}
                            onChange={(event) => updateProfile('apiKey', event.target.value)}
                        />
                    </label>

                    <label htmlFor="cfg-model">
                        Model
                        <input
                            id="cfg-model"
                            type="text"
                            value={activeProfile.model}
                            placeholder={placeholders.model}
                            spellCheck={false}
                            onChange={(event) => updateProfile('model', event.target.value)}
                        />
                    </label>

                    <label htmlFor="cfg-system-prompt">
                        System Prompt
                        <textarea
                            id="cfg-system-prompt"
                            rows={3}
                            value={config.systemPrompt}
                            placeholder="You are a helpful assistant."
                            onChange={(event) => updateCommon('systemPrompt', event.target.value)}
                        />
                    </label>

                    <label htmlFor="cfg-thinking-level">
                        <span id="cfg-thinking-label">{reasoning.label}</span>
                        <select
                            id="cfg-thinking-level"
                            value={activeProfile.reasoning}
                            onChange={(event) => updateProfile('reasoning', event.target.value)}
                        >
                            <option value="">Auto</option>
                            {reasoning.options.map((value) => (
                                <option key={value} value={value}>{value}</option>
                            ))}
                        </select>
                        <small id="cfg-thinking-note" className="chat-settings-note">
                            {reasoning.note}
                        </small>
                    </label>

                    <div className="chat-settings-section">
                        <span id="cfg-search-label" className="chat-settings-section-title">
                            {search.label}
                        </span>
                        <label className="chat-settings-toggle" htmlFor="cfg-search-enabled">
                            <input
                                id="cfg-search-enabled"
                                type="checkbox"
                                checked={activeProfile.searchEnabled}
                                disabled={search.supported === false}
                                onChange={(event) => updateProfile('searchEnabled', event.target.checked)}
                            />
                            <span>Enable Web Search</span>
                        </label>
                        <small id="cfg-search-note" className="chat-settings-note">
                            {search.note}
                        </small>
                    </div>

                </div>

                <div className="chat-settings-footer">
                    <button id="cfg-save-btn" type="button" onClick={handleSave}>
                        Save Settings
                    </button>
                </div>
            </div>
        </div>
    );
}
