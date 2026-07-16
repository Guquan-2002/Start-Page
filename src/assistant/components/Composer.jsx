import { useLayoutEffect, useRef } from 'react';

import { Icon } from '../../shared/Icon.jsx';
import './Composer.css';

export function Composer({
    input,
    setInput,
    attachments,
    onAddAttachments,
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

    const handleAttachmentChange = (event) => {
        onAddAttachments(Array.from(event.target.files));
        event.target.value = '';
    };

    const handleAttachmentPaste = (event) => {
        const pastedImages = Array.from(event.clipboardData.items)
            .filter((item) => item.type.startsWith('image/'))
            .map((item) => item.getAsFile());

        if (pastedImages.length === 0) return;
        event.preventDefault();
        onAddAttachments(pastedImages);
    };

    const handleSubmitKeyDown = (event) => {
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
        <div id="assistant-composer">
            <input
                ref={fileInputRef}
                type="file"
                id="assistant-attachment-input"
                accept="image/*"
                multiple
                hidden
                disabled={isStreaming}
                onChange={handleAttachmentChange}
            />
            <button
                type="button"
                id="assistant-attachment-button"
                className={attachments.length > 0 ? 'has-attachments' : undefined}
                title={attachmentTitle}
                aria-label={attachmentTitle}
                disabled={isStreaming}
                onClick={() => fileInputRef.current.click()}
            >
                <Icon name="image" />
            </button>
            <div id="assistant-composer-content">
                <div id="assistant-attachments">
                    {attachments.map((attachment, index) => {
                        const label = attachment.filename;
                        return (
                            <div
                                key={`${attachment.url.slice(0, 48)}-${label}-${index}`}
                                className="assistant-attachment"
                                title={attachment.filename}
                            >
                                <img src={attachment.url} alt={label} />
                                <button
                                    type="button"
                                    className="assistant-attachment-remove-button"
                                    title="移除图片"
                                    aria-label={`移除第 ${index + 1} 张图片`}
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
                    id="assistant-input"
                    placeholder="输入消息..."
                    rows={1}
                    value={input}
                    disabled={isStreaming}
                    onChange={(event) => setInput(event.target.value)}
                    onPaste={handleAttachmentPaste}
                    onKeyDown={handleSubmitKeyDown}
                />
            </div>
            {isStreaming ? (
                <button
                    type="button"
                    id="assistant-stop-button"
                    title="停止生成"
                    aria-label="停止生成"
                    onClick={onStop}
                >
                    <Icon name="stop" />
                </button>
            ) : (
                <button
                    type="button"
                    id="assistant-send-button"
                    className={input.trim().length > 0 ? 'has-text' : undefined}
                    title="发送"
                    aria-label="发送"
                    onClick={onSend}
                >
                    <Icon name="send" />
                </button>
            )}
        </div>
    );
}
