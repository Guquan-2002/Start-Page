import { useLayoutEffect, useRef } from 'react';

import { Icon } from '../../shared/Icon.jsx';
import { MarkdownMessage } from './MarkdownMessage.jsx';
import './MessageList.css';

function FilePart({ part, index }) {
    if (!part.url) return null;

    const label = part.filename || `attachment-${index + 1}`;

    return (
        <div className="assistant-message-attachments">
            {part.mediaType.startsWith('image/') ? (
                <img
                    className="assistant-message-attachment-image"
                    src={part.url}
                    alt={label}
                    loading="lazy"
                />
            ) : (
                <a
                    className="assistant-file-link"
                    href={part.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    download={part.filename || undefined}
                >
                    {label}
                </a>
            )}
        </div>
    );
}

function ReasoningPart({ part, isStreaming }) {
    if (!part.text) return null;

    return (
        <details className="assistant-reasoning" open={isStreaming || undefined}>
            <summary>推理过程</summary>
            <MarkdownMessage text={part.text} isStreaming={isStreaming} />
        </details>
    );
}

function SourcePart({ part }) {
    const label = part.title || part.filename || part.url || '来源';

    return part.type === 'source-url' ? (
        <a
            className="assistant-source-link"
            href={part.url}
            target="_blank"
            rel="noopener noreferrer"
        >
            {label}
        </a>
    ) : <span className="assistant-source-link">{label}</span>;
}

function renderMessagePart(part, index, role, isStreaming) {
    switch (part.type) {
        case 'text':
            if (!part.text) return null;
            return role === 'assistant' ? (
                <MarkdownMessage
                    key={`text-${index}`}
                    text={part.text}
                    isStreaming={isStreaming && part.state !== 'done'}
                />
            ) : (
                <span key={`text-${index}`}>{part.text}</span>
            );
        case 'reasoning':
            return (
                <ReasoningPart
                    key={`reasoning-${index}`}
                    part={part}
                    isStreaming={isStreaming && part.state !== 'done'}
                />
            );
        case 'file':
            return (
                <FilePart
                    key={`file-${index}-${(part.url || '').slice(0, 48)}`}
                    part={part}
                    index={index}
                />
            );
        case 'source-url':
        case 'source-document':
            return <SourcePart key={`source-${part.sourceId || index}`} part={part} />;
        default:
            return null;
    }
}

function hasRenderableContent(message) {
    return message.parts.some((part) => {
        if (part.type === 'file') return Boolean(part.url);
        if (part.type === 'source-url' || part.type === 'source-document') return true;
        if (part.type === 'text' || part.type === 'reasoning') return Boolean(part.text);
        return false;
    });
}

function MessageItem({ message, isStreaming, isPending, onRegenerate }) {
    const { role, parts } = message;

    if (!hasRenderableContent(message)) return null;

    return (
        <div className={`assistant-message ${role}${isStreaming ? ' is-streaming' : ''}`}>
            {parts.map((part, index) => renderMessagePart(part, index, role, isStreaming))}
            {role === 'assistant' ? (
                <button
                    type="button"
                    className="assistant-regenerate-button"
                    title="重新生成回复"
                    aria-label="重新生成回复"
                    disabled={isPending}
                    onClick={() => onRegenerate(message.id)}
                >
                    <Icon name="retry" />
                </button>
            ) : null}
        </div>
    );
}

export function MessageList({
    messages,
    status,
    error,
    onRegenerate
}) {
    const listRef = useRef(null);
    const isPending = status === 'submitted' || status === 'streaming';
    const lastMessage = messages.at(-1);
    const showStreamingPlaceholder = status === 'submitted'
        || (status === 'streaming' && (
            !lastMessage
            || lastMessage.role !== 'assistant'
            || !hasRenderableContent(lastMessage)
        ));

    useLayoutEffect(() => {
        const list = listRef.current;
        list.scrollTo({ top: list.scrollHeight, behavior: 'auto' });
    }, [messages, status, error]);

    return (
        <div
            id="assistant-messages"
            ref={listRef}
            role="log"
            aria-live="polite"
            aria-relevant="additions text"
            aria-busy={isPending}
        >
            {messages.length === 0 && !isPending && !error ? (
                <div id="assistant-empty-state">
                    <Icon name="comments" />
                    <span>开始对话</span>
                </div>
            ) : messages.map((message) => (
                <MessageItem
                    key={message.id}
                    message={message}
                    isPending={isPending}
                    onRegenerate={onRegenerate}
                    isStreaming={status === 'streaming'
                        && message.role === 'assistant'
                        && message === lastMessage}
                />
            ))}
            {showStreamingPlaceholder ? (
                <div className="assistant-message assistant is-streaming is-streaming-placeholder">
                    思考中...
                </div>
            ) : null}
            {error ? (
                <div className="assistant-message error" role="alert">
                    <div className="assistant-error-title">请求无法完成</div>
                    <div className="assistant-error-detail">{error}</div>
                </div>
            ) : null}
        </div>
    );
}
