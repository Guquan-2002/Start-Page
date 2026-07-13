import { lazy, Suspense, useLayoutEffect, useMemo, useRef } from 'react';

import { Icon } from '../../shared/Icon.jsx';
import { MAX_RENDERED_MESSAGES } from '../constants.js';

const MarkdownMessage = lazy(() => import('./MarkdownMessage.jsx').then((module) => ({
    default: module.MarkdownMessage
})));

function isImagePart(part) {
    return part.mediaType === 'image' || part.mediaType?.startsWith('image/');
}

function FilePart({ part, index }) {
    if (!part.url) return null;

    const label = part.filename || `attachment-${index + 1}`;

    return (
        <div className="chat-user-images">
            {isImagePart(part) ? (
                <img
                    className="chat-user-image"
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
            <Suspense fallback={<div>{part.text}</div>}>
                <MarkdownMessage text={part.text} isStreaming={isStreaming} />
            </Suspense>
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

function renderPart(part, index, { role, isStreaming }) {
    switch (part.type) {
        case 'text':
            if (!part.text) return null;
            return role === 'assistant' ? (
                <Suspense key={`text-${index}`} fallback={<div>{part.text}</div>}>
                    <MarkdownMessage
                        text={part.text}
                        isStreaming={isStreaming && part.state !== 'done'}
                    />
                </Suspense>
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
    return (message.parts || []).some((part) => {
        if (part.type === 'file') return Boolean(part.url);
        if (part.type === 'source-url' || part.type === 'source-document') return true;
        if (part.type === 'text' || part.type === 'reasoning') return Boolean(part.text);
        return false;
    });
}

function Message({ message, isStreaming, isPending, onRegenerate }) {
    const role = message.role === 'assistant' || message.role === 'system'
        ? message.role
        : 'user';
    const parts = message.parts || [];

    if (!hasRenderablePart(message)) return null;

    return (
        <div className={`chat-msg ${role}${isStreaming ? ' is-streaming' : ''}`}>
            {parts.map((part, index) => renderPart(part, index, { role, isStreaming }))}
            {role === 'assistant' && onRegenerate ? (
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

function ErrorMessage({ error }) {
    const detail = error instanceof Error ? error.message : String(error);

    return (
        <div className="chat-msg error" role="alert">
            <div className="chat-error-title">Unable to complete the request</div>
            {detail ? <div className="chat-error-detail">{detail}</div> : null}
        </div>
    );
}

export function MessageList({
    messages = [],
    status = 'ready',
    error,
    onRegenerate,
    inert = false
}) {
    const localRef = useRef(null);
    const visibleMessages = useMemo(
        () => messages.slice(-MAX_RENDERED_MESSAGES),
        [messages]
    );
    const isPending = status === 'submitted' || status === 'streaming';
    const lastMessage = visibleMessages.at(-1);
    const showPlaceholder = status === 'submitted'
        || (status === 'streaming' && (
            !lastMessage
            || lastMessage.role !== 'assistant'
            || !hasRenderablePart(lastMessage)
        ));

    useLayoutEffect(() => {
        const element = localRef.current;
        if (!element) return;

        if (typeof element.scrollTo === 'function') {
            element.scrollTo({ top: element.scrollHeight, behavior: 'auto' });
        } else {
            element.scrollTop = element.scrollHeight;
        }
    }, [visibleMessages, status, error]);

    return (
        <div
            id="chat-messages"
            ref={localRef}
            role="log"
            aria-live="polite"
            aria-relevant="additions text"
            aria-busy={isPending}
            inert={inert}
        >
            {visibleMessages.length === 0 && !isPending && !error ? (
                <div id="chat-empty-state">
                    <Icon name="comments" />
                    <span>Start a conversation</span>
                </div>
            ) : visibleMessages.map((message, index) => (
                <Message
                    key={message.id || `message-${index}`}
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
            {error ? <ErrorMessage error={error} /> : null}
        </div>
    );
}
