import { useCallback, useImperativeHandle, useLayoutEffect, useRef } from 'react';

import { Icon } from '../../shared/Icon.jsx';

function isImageAttachment(attachment) {
    return attachment.mediaType === 'image'
        || attachment.mediaType?.startsWith('image/');
}

export function ChatComposer({
    input = '',
    setInput,
    attachments = [],
    onAddFiles,
    onRemoveAttachment,
    onSend,
    onStop,
    isStreaming = false,
    inputRef,
    inert = false
}) {
    const localInputRef = useRef(null);
    const fileInputRef = useRef(null);
    useImperativeHandle(inputRef, () => localInputRef.current);

    useLayoutEffect(() => {
        const textarea = localInputRef.current;
        if (!textarea) {
            return;
        }

        textarea.style.height = 'auto';
        textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }, [input]);

    const handleFileChange = useCallback((event) => {
        onAddFiles?.(Array.from(event.target.files));
        event.target.value = '';
    }, [onAddFiles]);

    const handlePaste = useCallback((event) => {
        const clipboardItems = Array.from(event.clipboardData?.items || []);
        const pastedImages = clipboardItems
            .filter((item) => item.type?.startsWith('image/'))
            .map((item) => item.getAsFile())
            .filter(Boolean);
        const imageFiles = pastedImages.length > 0
            ? pastedImages
            : Array.from(event.clipboardData?.files || []);

        if (imageFiles.length === 0) {
            return;
        }

        event.preventDefault();
        onAddFiles?.(imageFiles);
    }, [onAddFiles]);

    const handleSend = useCallback(() => {
        if (!isStreaming && typeof onSend === 'function') {
            onSend();
        }
    }, [isStreaming, onSend]);

    const handleKeyDown = useCallback((event) => {
        if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent?.isComposing) {
            return;
        }

        event.preventDefault();
        handleSend();
    }, [handleSend]);

    const attachmentTitle = attachments.length === 0
        ? 'Attach images'
        : attachments.length === 1
            ? '已上传 1 张图片'
            : `已上传 ${attachments.length} 张图片`;

    return (
        <div id="chat-input-area" inert={inert}>
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
                onClick={() => fileInputRef.current?.click()}
            >
                <Icon name="image" />
            </button>
            <div id="chat-input-stack">
                <div id="chat-attachments">
                    {attachments.map((attachment, index) => {
                        const label = attachment.filename || `attachment-${index + 1}`;

                        return (
                            <div
                                key={`${attachment.url.slice(0, 48)}-${label}-${index}`}
                                className="chat-attachment-chip"
                                title={attachment.filename || attachment.mediaType}
                            >
                                {isImageAttachment(attachment) ? (
                                    <img src={attachment.url} alt={label} />
                                ) : (
                                    <span className="chat-attachment-filename">{label}</span>
                                )}
                                <button
                                    type="button"
                                    className="chat-attachment-remove"
                                    title="Remove image"
                                    aria-label={`Remove image ${index + 1}`}
                                    disabled={isStreaming}
                                    onClick={() => onRemoveAttachment?.(index, attachment)}
                                >
                                    ×
                                </button>
                            </div>
                        );
                    })}
                </div>
                <textarea
                    ref={localInputRef}
                    id="chat-input"
                    placeholder="Type your message..."
                    rows={1}
                    value={input}
                    disabled={isStreaming}
                    onChange={(event) => setInput?.(event.target.value)}
                    onPaste={handlePaste}
                    onKeyDown={handleKeyDown}
                />
            </div>
            <button
                type="button"
                id="chat-stop-btn"
                title="Stop generation"
                aria-label="Stop generation"
                style={{ display: isStreaming ? undefined : 'none' }}
                onClick={() => onStop?.()}
            >
                <Icon name="stop" />
            </button>
            <button
                type="button"
                id="chat-send-btn"
                className={input.trim().length > 0 ? 'has-text' : undefined}
                title="Send"
                aria-label="Send"
                disabled={isStreaming}
                style={{ display: isStreaming ? 'none' : undefined }}
                onClick={handleSend}
            >
                <Icon name="send" />
            </button>
        </div>
    );
}
