import { useLayoutEffect, useRef } from 'react';

import { Icon } from '../../shared/Icon.jsx';
import './ChatComposer.css';

export function ChatComposer({
    input,
    setInput,
    attachments,
    onAddFiles,
    onRemoveAttachment,
    onSend,
    onStop,
    isStreaming,
    inputRef
}) {
    const fileInputRef = useRef(null);

    useLayoutEffect(() => {
        const textarea = inputRef.current;
        textarea.style.height = 'auto';
        textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }, [input, inputRef]);

    const handleFileChange = (event) => {
        onAddFiles(Array.from(event.target.files));
        event.target.value = '';
    };

    const handlePaste = (event) => {
        const pastedImages = Array.from(event.clipboardData.items)
            .filter((item) => item.type.startsWith('image/'))
            .map((item) => item.getAsFile());

        if (pastedImages.length === 0) return;
        event.preventDefault();
        onAddFiles(pastedImages);
    };

    const handleKeyDown = (event) => {
        if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) {
            return;
        }
        event.preventDefault();
        onSend();
    };

    const attachmentTitle = attachments.length === 0
        ? '点击此处上传图片'
        : `已上传 ${attachments.length} 张图片`;

    return (
        <div id="chat-input-area">
            <input
                ref={fileInputRef}
                type="file"
                id="chat-image-input"
                accept="image/*"
                multiple
                hidden
                disabled={isStreaming}
                onChange={handleFileChange}
            />
            <button
                type="button"
                id="chat-attach-btn"
                className={attachments.length > 0 ? 'has-attachments' : undefined}
                title={attachmentTitle}
                aria-label={attachmentTitle}
                disabled={isStreaming}
                onClick={() => fileInputRef.current.click()}
            >
                <Icon name="image" />
            </button>
            <div id="chat-input-stack">
                <div id="chat-attachments">
                    {attachments.map((attachment, index) => {
                        const label = attachment.filename;
                        return (
                            <div
                                key={`${attachment.url.slice(0, 48)}-${label}-${index}`}
                                className="chat-attachment-chip"
                                title={attachment.filename}
                            >
                                <img src={attachment.url} alt={label} />
                                <button
                                    type="button"
                                    className="chat-attachment-remove"
                                    title="Remove image"
                                    aria-label={`Remove image ${index + 1}`}
                                    disabled={isStreaming}
                                    onClick={() => onRemoveAttachment(index)}
                                >
                                    ×
                                </button>
                            </div>
                        );
                    })}
                </div>
                <textarea
                    ref={inputRef}
                    id="chat-input"
                    placeholder="Type your message..."
                    rows={1}
                    value={input}
                    disabled={isStreaming}
                    onChange={(event) => setInput(event.target.value)}
                    onPaste={handlePaste}
                    onKeyDown={handleKeyDown}
                />
            </div>
            {isStreaming ? (
                <button
                    type="button"
                    id="chat-stop-btn"
                    title="Stop generation"
                    aria-label="Stop generation"
                    onClick={onStop}
                >
                    <Icon name="stop" />
                </button>
            ) : (
                <button
                    type="button"
                    id="chat-send-btn"
                    className={input.trim().length > 0 ? 'has-text' : undefined}
                    title="Send"
                    aria-label="Send"
                    onClick={onSend}
                >
                    <Icon name="send" />
                </button>
            )}
        </div>
    );
}
