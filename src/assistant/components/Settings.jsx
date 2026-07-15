import { useEffect, useRef } from 'react';

import { Icon } from '../../shared/Icon.jsx';
import './Settings.css';

export function Settings({
    settings,
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
        values: settingsValues,
        activeProfile,
        providers,
        providerPresentation,
        setProvider,
        updateProfile,
        setSystemPrompt
    } = settings;
    const reasoningOptions = providerPresentation.reasoning;
    const searchOptions = providerPresentation.search;
    const placeholders = providerPresentation.placeholders;

    const handleCancel = (event) => {
        event.preventDefault();
        onClose();
    };

    return (
        <dialog
            id="assistant-settings"
            ref={dialogRef}
            aria-labelledby="assistant-settings-title"
            onCancel={handleCancel}
        >
            <div className="assistant-settings-layout">
                <div className="assistant-settings-header">
                    <div className="assistant-settings-title-group">
                        <span id="assistant-settings-title" className="assistant-settings-title">AI Settings</span>
                        <small className="assistant-settings-subtitle">
                            Configure provider, API URL, key, model, prompt, and optional features.
                        </small>
                    </div>
                    <button
                        id="assistant-settings-close-button"
                        type="button"
                        title="Close settings"
                        aria-label="Close settings"
                        onClick={onClose}
                    >
                        <Icon name="close" />
                    </button>
                </div>

                <div className="assistant-settings-content">
                    <label htmlFor="assistant-settings-provider">
                        Provider
                        <select
                            id="assistant-settings-provider"
                            autoFocus
                            value={settingsValues.provider}
                            onChange={(event) => setProvider(event.target.value)}
                        >
                            {providers.map((provider) => (
                                <option key={provider.id} value={provider.id}>
                                    {provider.settingsLabel}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label htmlFor="assistant-settings-api-url">
                        API URL
                        <input
                            id="assistant-settings-api-url"
                            type="text"
                            value={activeProfile.apiUrl}
                            placeholder={placeholders.apiUrl}
                            spellCheck={false}
                            onChange={(event) => updateProfile('apiUrl', event.target.value)}
                        />
                    </label>

                    <label htmlFor="assistant-settings-api-key">
                        API Key
                        <input
                            id="assistant-settings-api-key"
                            type="password"
                            value={activeProfile.apiKey}
                            placeholder={placeholders.apiKey}
                            spellCheck={false}
                            onChange={(event) => updateProfile('apiKey', event.target.value)}
                        />
                    </label>

                    <label htmlFor="assistant-settings-model">
                        Model
                        <input
                            id="assistant-settings-model"
                            type="text"
                            value={activeProfile.model}
                            placeholder={placeholders.model}
                            spellCheck={false}
                            onChange={(event) => updateProfile('model', event.target.value)}
                        />
                    </label>

                    <label htmlFor="assistant-settings-system-prompt">
                        System Prompt
                        <textarea
                            id="assistant-settings-system-prompt"
                            rows={3}
                            value={settingsValues.systemPrompt}
                            placeholder="You are a helpful assistant."
                            onChange={(event) => setSystemPrompt(event.target.value)}
                        />
                    </label>

                    <label htmlFor="assistant-settings-thinking-level">
                        <span id="assistant-settings-thinking-label">{reasoningOptions.label}</span>
                        <select
                            id="assistant-settings-thinking-level"
                            value={activeProfile.reasoning}
                            onChange={(event) => updateProfile('reasoning', event.target.value)}
                        >
                            <option value="">Auto</option>
                            {reasoningOptions.options.map((value) => (
                                <option key={value} value={value}>{value}</option>
                            ))}
                        </select>
                        <small id="assistant-settings-thinking-note" className="assistant-settings-note">
                            {reasoningOptions.note}
                        </small>
                    </label>

                    <div className="assistant-settings-section">
                        <span id="assistant-settings-search-label" className="assistant-settings-section-title">
                            {searchOptions.label}
                        </span>
                        <label className="assistant-settings-toggle" htmlFor="assistant-settings-search-enabled">
                            <input
                                id="assistant-settings-search-enabled"
                                type="checkbox"
                                checked={activeProfile.searchEnabled}
                                disabled={searchOptions.supported === false}
                                onChange={(event) => updateProfile('searchEnabled', event.target.checked)}
                            />
                            <span>Enable Web Search</span>
                        </label>
                        <small id="assistant-settings-search-note" className="assistant-settings-note">
                            {searchOptions.note}
                        </small>
                    </div>

                </div>
            </div>
        </dialog>
    );
}
