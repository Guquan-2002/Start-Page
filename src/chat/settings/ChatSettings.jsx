import { useEffect, useRef } from 'react';

import { Icon } from '../../shared/Icon.jsx';
import './ChatSettings.css';

export function ChatSettings({
    chatConfig,
    isOpen,
    onClose
}) {
    const dialogRef = useRef(null);

    useEffect(() => {
        const dialog = dialogRef.current;

        if (isOpen && !dialog.open) {
            dialog.showModal();
        } else if (!isOpen && dialog.open) {
            dialog.close();
        }
    }, [isOpen]);

    const {
        config,
        activeProfile,
        providers,
        presentation,
        setProvider,
        updateProfile,
        setSystemPrompt
    } = chatConfig;
    const reasoning = presentation.reasoning;
    const search = presentation.search;
    const placeholders = presentation.placeholders;

    const handleCancel = (event) => {
        event.preventDefault();
        onClose();
    };

    return (
        <dialog
            id="chat-settings"
            ref={dialogRef}
            aria-labelledby="chat-settings-title"
            onCancel={handleCancel}
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
                            autoFocus
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
                            onChange={(event) => setSystemPrompt(event.target.value)}
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
            </div>
        </dialog>
    );
}
