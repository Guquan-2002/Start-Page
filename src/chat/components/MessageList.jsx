import { useLayoutEffect, useRef } from 'react';

import { Icon } from '../../shared/Icon.jsx';
import { MarkdownMessage } from './MarkdownMessage.jsx';
import './MessageList.css';

function FilePart({ part, index }) {
    if (!part.url) return null;

    const label = part.filename || `attachment-${index + 1}`;

    return (
        <div className="chat-message-attachments">
            {part.mediaType.startsWith('image/') ? (
                <img
                    className="chat-message-attachment-img"
                    src={part.url}
                    alt={label}
                    loading="lazy"
                />
            ) : (
                <a
                    className="chat-file-link"
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
        <details className="chat-reasoning" open={isStreaming || undefined}>
            <summary>Reasoning</summary>
            <MarkdownMessage text={part.text} isStreaming={isStreaming} />
        </details>
    );
}

function SourcePart({ part }) {
    const label = part.title || part.filename || part.url || 'Source';

    return part.type === 'source-url' ? (
        <a
            className="chat-source-link"
            href={part.url}
            target="_blank"
            rel="noopener noreferrer"
        >
            {label}
        </a>
    ) : <span className="chat-source-link">{label}</span>;
}

function renderPart(part, index, role, isStreaming) {
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

function hasRenderablePart(message) {
    return message.parts.some((part) => {
        if (part.type === 'file') return Boolean(part.url);
        if (part.type === 'source-url' || part.type === 'source-document') return true;
        if (part.type === 'text' || part.type === 'reasoning') return Boolean(part.text);
        return false;
    });
}

function Message({ message, isStreaming, isPending, onRegenerate }) {
    const { role, parts } = message;

    if (!hasRenderablePart(message)) return null;

    return (
        <div className={`chat-msg ${role}${isStreaming ? ' is-streaming' : ''}`}>
            {parts.map((part, index) => renderPart(part, index, role, isStreaming))}
            {role === 'assistant' ? (
                <button
                    type="button"
                    className="msg-regenerate-btn"
                    title="Regenerate response"
                    aria-label="Regenerate response"
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
    const localRef = useRef(null);
    const isPending = status === 'submitted' || status === 'streaming';
    const lastMessage = messages.at(-1);
    const showPlaceholder = status === 'submitted'
        || (status === 'streaming' && (
            !lastMessage
            || lastMessage.role !== 'assistant'
            || !hasRenderablePart(lastMessage)
        ));

    useLayoutEffect(() => {
        const element = localRef.current;
        element.scrollTo({ top: element.scrollHeight, behavior: 'auto' });
    }, [messages, status, error]);

    return (
        <div
            id="chat-messages"
            ref={localRef}
            role="log"
            aria-live="polite"
            aria-relevant="additions text"
            aria-busy={isPending}
        >
            {messages.length === 0 && !isPending && !error ? (
                <div id="chat-empty-state">
                    <Icon name="comments" />
                    <span>Start a conversation</span>
                </div>
            ) : messages.map((message) => (
                <Message
                    key={message.id}
                    message={message}
                    isPending={isPending}
                    onRegenerate={onRegenerate}
                    isStreaming={status === 'streaming'
                        && message.role === 'assistant'
                        && message === lastMessage}
                />
            ))}
            {showPlaceholder ? (
                <div className="chat-msg assistant is-streaming is-streaming-placeholder">
                    Thinking...
                </div>
            ) : null}
            {error ? (
                <div className="chat-msg error" role="alert">
                    <div className="chat-error-title">Unable to complete the request</div>
                    <div className="chat-error-detail">{error}</div>
                </div>
            ) : null}
        </div>
    );
}
