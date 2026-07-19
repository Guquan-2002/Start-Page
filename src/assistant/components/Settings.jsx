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
        values,
        activeProfile,
        providers,
        providerPresentation: { reasoning, search, placeholders },
        setProvider,
        updateProfile,
        setSystemPrompt
    } = settings;

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
                        <span id="assistant-settings-title" className="assistant-settings-title">AI 设置</span>
                        <small className="assistant-settings-subtitle">
                            配置服务商、API 地址、密钥、模型、提示词及其他选项。
                        </small>
                    </div>
                    <button
                        id="assistant-settings-close-button"
                        type="button"
                        title="关闭设置"
                        aria-label="关闭设置"
                        onClick={onClose}
                    >
                        <Icon name="close" />
                    </button>
                </div>

                <div className="assistant-settings-content">
                    <label>
                        服务商
                        <select
                            autoFocus
                            value={values.provider}
                            onChange={(event) => setProvider(event.target.value)}
                        >
                            {providers.map((provider) => (
                                <option key={provider.id} value={provider.id}>
                                    {provider.settingsLabel}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label>
                        API 地址
                        <input
                            type="text"
                            value={activeProfile.apiUrl}
                            placeholder={placeholders.apiUrl}
                            spellCheck={false}
                            onChange={(event) => updateProfile('apiUrl', event.target.value)}
                        />
                    </label>

                    <label>
                        API 密钥
                        <input
                            type="password"
                            value={activeProfile.apiKey}
                            placeholder={placeholders.apiKey}
                            spellCheck={false}
                            onChange={(event) => updateProfile('apiKey', event.target.value)}
                        />
                    </label>

                    <label>
                        模型
                        <input
                            type="text"
                            value={activeProfile.model}
                            placeholder={placeholders.model}
                            spellCheck={false}
                            onChange={(event) => updateProfile('model', event.target.value)}
                        />
                    </label>

                    <label>
                        系统提示词
                        <textarea
                            value={values.systemPrompt}
                            placeholder="你是一个有帮助的助手。"
                            onChange={(event) => setSystemPrompt(event.target.value)}
                        />
                    </label>

                    <div className="assistant-settings-field">
                        <label>
                            <span>{reasoning.label}</span>
                            <select
                                value={activeProfile.reasoning}
                                aria-describedby="assistant-settings-reasoning-note"
                                onChange={(event) => updateProfile('reasoning', event.target.value)}
                            >
                                <option value="">自动</option>
                                {reasoning.options.map((value) => (
                                    <option key={value} value={value}>{value}</option>
                                ))}
                            </select>
                        </label>
                        <small
                            id="assistant-settings-reasoning-note"
                            className="assistant-settings-note"
                        >
                            {reasoning.note}
                        </small>
                    </div>

                    <div className="assistant-settings-section">
                        <span className="assistant-settings-section-title">
                            {search.label}
                        </span>
                        <label className="assistant-settings-toggle">
                            <input
                                type="checkbox"
                                checked={activeProfile.searchEnabled}
                                disabled={search.supported === false}
                                aria-describedby="assistant-settings-search-note"
                                onChange={(event) => updateProfile('searchEnabled', event.target.checked)}
                            />
                            <span>启用网络搜索</span>
                        </label>
                        <small id="assistant-settings-search-note" className="assistant-settings-note">
                            {search.note}
                        </small>
                    </div>
                </div>
            </div>
        </dialog>
    );
}
